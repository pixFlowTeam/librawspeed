#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cmath>
#include <string>
#include <vector>
#include <algorithm>
#include <iostream>

#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cmath>
#include <string>
#include <vector>
#include <algorithm>
#include <iostream>

// =============================================
// 该工具的整体流程（中文说明）：
// 1) 使用 LibRaw 读取并解码 RAW：
//    - 开启相机预设白平衡（AsShot），关闭自动白平衡
//    - 强制线性输出（gamma=1），关闭自动提亮，输出 16bit
//    - 通过 dcraw_make_mem_image 获得 3 通道 RGB 图
// 2) 转为 OpenCV Mat，并转换到线性浮点（0..1，保持线性域）
// 3) 用灰世界算法估计白平衡增益（在掩膜下剔除过曝/过暗像素）：
//    - 以 G 为基准，计算 R、B 相对增益
// 4) 可选：应用上述增益验证均值是否趋于中性
// 5) 统计平衡前后的线性 RGB 均值
// 6) 由“平衡前”的线性 RGB 均值近似推断色温(CCT)与色调(tint/duv)：
//    - 线性 sRGB → XYZ → xy，使用 McCamy 公式估 CCT
//    - 用 Daylight 近似得到同 CCT 的参考 xy，转 u'v'，计算与参考的距离作为 duv
// 7) 输出：相机 AsShot 增益、灰世界增益、均值、估算的 CCT 与 duv
// =============================================

#include <libraw/libraw.h>

#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/xphoto.hpp>

namespace
{

    // 白平衡增益结构：以 G 为 1.0，给出 R、B 的相对增益
    struct WhiteBalanceGains
    {
        double redGain;
        double greenGain;
        double blueGain;
    };

    // CCT 与 Tint(duv) 的结果
    struct CctTint
    {
        double cctKelvin; // 相关色温（开尔文）
        double duv;       // 在 u'v' 空间相对黑体/日光轨迹的距离（+偏绿 / -偏洋红）
    };

    template <typename T>
    static inline T clampValue(T v, T lo, T hi)
    {
        return std::max(lo, std::min(v, hi));
    }

    // 线性 sRGB 转 XYZ（D65）
    static inline void linearSrgbToXyz(double r, double g, double b, double &X, double &Y, double &Z)
    {
        // sRGB D65 矩阵（IEC 61966-2-1:1999）
        X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
        Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
        Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
    }

    // XYZ 转 CIE u'v'（用于 tint 距离计算）
    static inline void xyzToUvPrime(double X, double Y, double Z, double &uPrime, double &vPrime)
    {
        double denom = (X + 15.0 * Y + 3.0 * Z);
        if (denom <= 1e-12)
        {
            uPrime = 0.0;
            vPrime = 0.0;
            return;
        }
        uPrime = (4.0 * X) / denom;
        vPrime = (9.0 * Y) / denom;
    }

    // 将 u'v'（设定 Y=1）近似反推 XYZ
    static inline void uvPrimeToXyz(double uPrime, double vPrime, double &X, double &Y, double &Z)
    {
        if (vPrime <= 1e-12)
        {
            X = Y = Z = 0.0;
            return;
        }
        double denom = (6.0 * uPrime - 16.0 * vPrime + 12.0);
        if (std::fabs(denom) <= 1e-12)
        {
            X = Y = Z = 0.0;
            return;
        }
        Y = 1.0;
        X = (9.0 * uPrime) / (4.0 * vPrime) * Y;
        Z = (12.0 - 3.0 * uPrime - 20.0 * vPrime) / (4.0 * vPrime) * Y;
    }

    // sRGB<->XYZ 矩阵（线性）
    static inline cv::Matx33d srgbToXyzMatrix()
    {
        return cv::Matx33d(0.4124564, 0.3575761, 0.1804375,
                           0.2126729, 0.7151522, 0.0721750,
                           0.0193339, 0.1191920, 0.9503041);
    }
    static inline cv::Matx33d xyzToSrgbMatrix()
    {
        return srgbToXyzMatrix().inv(cv::DECOMP_SVD);
    }

    // 在 RGB 空间应用 3x3 变换（以 RGB 顺序定义），输入/输出为 BGR 图
    static cv::Mat applyRgb3x3OnBgr(const cv::Mat &bgrLinear, const cv::Matx33d &T_rgb)
    {
        cv::Mat rgb;
        cv::cvtColor(bgrLinear, rgb, cv::COLOR_BGR2RGB);
        cv::Mat out;
        cv::transform(rgb, out, cv::Mat(T_rgb));
        cv::Mat bgrOut;
        cv::cvtColor(out, bgrOut, cv::COLOR_RGB2BGR);
        return bgrOut;
    }

    // XYZ 转 xy（用于 McCamy CCT 估计）
    static inline void xyzToXy(double X, double Y, double Z, double &x, double &y)
    {
        double denom = (X + Y + Z);
        if (denom <= 1e-12)
        {
            x = 0.0;
            y = 0.0;
            return;
        }
        x = X / denom;
        y = Y / denom;
    }

    // McCamy 1992：由 xy 近似估计 CCT
    static inline double cctFromXy_McCamy(double x, double y)
    {
        double n = (x - 0.3320) / (0.1858 - y);
        double cct = 449.0 * n * n * n + 3525.0 * n * n + 6823.3 * n + 5520.33;
        return clampValue(cct, 1000.0, 40000.0);
    }

    // Daylight 近似：给定 CCT(K) 近似求 xy（Judd/CIE 日光轨迹近似）
    // 参考: http://en.wikipedia.org/wiki/Color_temperature#Approximation
    static inline void xyFromCct_DaylightApprox(double cct, double &x, double &y)
    {
        cct = clampValue(cct, 1667.0, 25000.0);
        double t = cct;
        double xApprox;
        if (t >= 1667.0 && t <= 4000.0)
        {
            xApprox = -0.2661239e9 / (t * t * t) - 0.2343580e6 / (t * t) + 0.8776956e3 / t + 0.179910;
        }
        else
        {
            xApprox = -3.0258469e9 / (t * t * t) + 2.1070379e6 / (t * t) + 0.2226347e3 / t + 0.240390;
        }
        double x2 = xApprox * xApprox;
        double x3 = x2 * xApprox;
        double yApprox = -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * xApprox - 0.20219683;
        x = xApprox;
        y = yApprox;
    }

    // 由线性 sRGB 的平均值估算 CCT 与 duv
    static CctTint estimateCctTintFromLinearSrgbAverages(double avgR, double avgG, double avgB)
    {
        // 线性 sRGB → XYZ（无需归一，比例不影响 xy）
        double X, Y, Z;
        linearSrgbToXyz(avgR, avgG, avgB, X, Y, Z);
        double x, y;
        xyzToXy(X, Y, Z, x, y);
        double cct = cctFromXy_McCamy(x, y);

        // 计算 u'v' 并与相同 CCT 的日光轨迹点比较，获得 duv（tint）
        double u, v;
        xyzToUvPrime(X, Y, Z, u, v);
        double locusX, locusY;
        xyFromCct_DaylightApprox(cct, locusX, locusY);
        double locusXyzX, locusXyzY, locusXyzZ;
        // 参考点 xy → XYZ（设定 Y=1）
        if (locusY <= 1e-12)
        {
            locusXyzX = locusXyzY = locusXyzZ = 0.0;
        }
        else
        {
            locusXyzY = 1.0;
            locusXyzX = locusX * (locusXyzY / locusY);
            locusXyzZ = (1.0 - locusX - locusY) * (locusXyzY / locusY);
        }
        double uRef, vRef;
        xyzToUvPrime(locusXyzX, locusXyzY, locusXyzZ, uRef, vRef);
        double du = u - uRef;
        double dv = v - vRef;
        double duv = std::sqrt(du * du + dv * dv);
        // 赋予符号：高于轨迹为正（偏绿），低于轨迹为负（偏洋红）
        duv = (v >= vRef) ? duv : -duv;
        return CctTint{cct, duv};
    }

    // 计算 Daylight 近似 xy（Kelvin）
    static inline void kelvinToXy(double kelvin, double &x, double &y)
    {
        xyFromCct_DaylightApprox(kelvin, x, y);
    }

    // 将 xy（Y=1）转 XYZ
    static inline void xyToXyz(double x, double y, double &X, double &Y, double &Z)
    {
        if (y <= 1e-12)
        {
            X = Y = Z = 0.0;
            return;
        }
        Y = 1.0;
        X = x * (Y / y);
        Z = (1.0 - x - y) * (Y / y);
    }

    // 简单把 Tint_UI（正=洋红/负=绿色）映射为 duv（u'v' 上的偏移）
    // duv = -tint / scale（scale 默认 1000：tint=+10 → duv=-0.01）
    static inline double uiTintToDuv(double tintUi, double scale)
    {
        if (scale <= 1e-9)
            scale = 1000.0;
        return -tintUi / scale;
    }

    // 从 LibRaw 获取 camRGB→XYZ 3x3（G 双列取平均）
    static bool getCameraToXyzMatrix(const LibRaw &proc, cv::Matx33d &M)
    {
        const libraw_colordata_t &c = proc.imgdata.color;
        double sumabs = 0.0;
        for (int i = 0; i < 4; ++i)
            for (int j = 0; j < 3; ++j)
                sumabs += std::fabs(c.cam_xyz[i][j]);
        if (sumabs > 1e-9)
        {
            cv::Vec3d r(c.cam_xyz[0][0], c.cam_xyz[0][1], c.cam_xyz[0][2]);
            cv::Vec3d g1(c.cam_xyz[1][0], c.cam_xyz[1][1], c.cam_xyz[1][2]);
            cv::Vec3d b(c.cam_xyz[2][0], c.cam_xyz[2][1], c.cam_xyz[2][2]);
            cv::Vec3d g2(c.cam_xyz[3][0], c.cam_xyz[3][1], c.cam_xyz[3][2]);
            cv::Vec3d g = 0.5 * (g1 + g2);
            M = cv::Matx33d(r[0], r[1], r[2],
                            g[0], g[1], g[2],
                            b[0], b[1], b[2]);
            return true;
        }
        return false;
    }

    // Bradford CAT 矩阵
    static inline cv::Matx33d bradfordMatrix()
    {
        return cv::Matx33d(0.8951, 0.2664, -0.1614,
                           -0.7502, 1.7135, 0.0367,
                           0.0389, -0.0685, 1.0296);
    }
    static inline cv::Matx33d bradfordInverse()
    {
        return cv::Matx33d(0.9869929, -0.1470543, 0.1599627,
                           0.4323053, 0.5183603, 0.0492912,
                           -0.0085287, 0.0400428, 0.9684867);
    }

    // 由 Kelvin/Tint 严谨求等效 user_mul（R,G,B,G2），G 归一为 1
    static bool computeUserMulFromKelvinTint(const LibRaw &proc, double kelvin, double tintUi, double tintScale, float userMul[4])
    {
        cv::Matx33d M_cam2xyz;
        if (!getCameraToXyzMatrix(proc, M_cam2xyz))
            return false;

        // 目标白点 XYZ（含 tint 偏移）
        double xt, yt;
        kelvinToXy(kelvin, xt, yt);
        double Xt, Yt, Zt;
        xyToXyz(xt, yt, Xt, Yt, Zt);
        double ut, vt;
        xyzToUvPrime(Xt, Yt, Zt, ut, vt);
        double duv = uiTintToDuv(tintUi, tintScale);
        double ut2 = ut, vt2 = vt + duv;
        uvPrimeToXyz(ut2, vt2, Xt, Yt, Zt);
        cv::Vec3d XYZt(Xt, Yt, Zt);

        // 相机对目标白点的响应 v
        cv::Matx33d M_inv = M_cam2xyz.inv(cv::DECOMP_SVD);
        cv::Vec3d v = M_inv * XYZt; // [R,G,B]
        double r = std::max(1e-12, (double)v[0]);
        double g = std::max(1e-12, (double)v[1]);
        double b = std::max(1e-12, (double)v[2]);

        // 归一到 G=1：mul=[g/r, 1, g/b, 1]
        userMul[0] = static_cast<float>(g / r);
        userMul[1] = 1.0f;
        userMul[2] = static_cast<float>(g / b);
        userMul[3] = 1.0f;
        return true;
    }

    // 计算 AsShot 的 duv（相机 AsShot 白点相对其 CCT 的垂直偏移，正=偏绿/负=偏洋红）
    static bool getAsShotDuv(const LibRaw &proc, double &duvAsShot)
    {
        cv::Matx33d M_cam2xyz;
        if (!getCameraToXyzMatrix(proc, M_cam2xyz))
            return false;
        double camMulR = proc.imgdata.color.cam_mul[0];
        double camMulG = (proc.imgdata.color.cam_mul[1] + proc.imgdata.color.cam_mul[3]) * 0.5;
        double camMulB = proc.imgdata.color.cam_mul[2];
        cv::Vec3d wCam((camMulR > 1e-9) ? (1.0 / camMulR) : 1.0,
                       (camMulG > 1e-9) ? (1.0 / camMulG) : 1.0,
                       (camMulB > 1e-9) ? (1.0 / camMulB) : 1.0);
        cv::Vec3d XYZs = M_cam2xyz * wCam;
        double u, v;
        xyzToUvPrime(XYZs[0], XYZs[1], XYZs[2], u, v);
        double xs, ys;
        xyzToXy(XYZs[0], XYZs[1], XYZs[2], xs, ys);
        double cct = cctFromXy_McCamy(xs, ys);
        double xr, yr;
        xyFromCct_DaylightApprox(cct, xr, yr);
        double Xr, Yr, Zr;
        xyToXyz(xr, yr, Xr, Yr, Zr);
        double ur, vr;
        xyzToUvPrime(Xr, Yr, Zr, ur, vr);
        duvAsShot = v - vr; // v' 方向偏移
        return true;
    }

    // 计算 AsShot 的 CCT（近似）
    static bool getAsShotCct(const LibRaw &proc, double &cct)
    {
        cv::Matx33d M_cam2xyz;
        if (!getCameraToXyzMatrix(proc, M_cam2xyz))
            return false;
        double camMulR = proc.imgdata.color.cam_mul[0];
        double camMulG = (proc.imgdata.color.cam_mul[1] + proc.imgdata.color.cam_mul[3]) * 0.5;
        double camMulB = proc.imgdata.color.cam_mul[2];
        cv::Vec3d wCam((camMulR > 1e-9) ? (1.0 / camMulR) : 1.0,
                       (camMulG > 1e-9) ? (1.0 / camMulG) : 1.0,
                       (camMulB > 1e-9) ? (1.0 / camMulB) : 1.0);
        cv::Vec3d XYZs = M_cam2xyz * wCam;
        double xs, ys;
        xyzToXy(XYZs[0], XYZs[1], XYZs[2], xs, ys);
        cct = cctFromXy_McCamy(xs, ys);
        return true;
    }

    // Kelvin + 直接 duv（用于“只改色温，保持 AsShot Tint”）
    static bool computeUserMulFromKelvinWithDuv(const LibRaw &proc, double kelvin, double duvDirect, float userMul[4])
    {
        cv::Matx33d M_cam2xyz;
        if (!getCameraToXyzMatrix(proc, M_cam2xyz))
            return false;
        double xt, yt;
        kelvinToXy(kelvin, xt, yt);
        double Xt, Yt, Zt;
        xyToXyz(xt, yt, Xt, Yt, Zt);
        double ut, vt;
        xyzToUvPrime(Xt, Yt, Zt, ut, vt);
        double ut2 = ut, vt2 = vt + duvDirect; // 保持 Tint 不变
        uvPrimeToXyz(ut2, vt2, Xt, Yt, Zt);
        cv::Vec3d XYZt(Xt, Yt, Zt);
        cv::Matx33d M_inv = M_cam2xyz.inv(cv::DECOMP_SVD);
        cv::Vec3d v = M_inv * XYZt;
        double r = std::max(1e-12, (double)v[0]);
        double g = std::max(1e-12, (double)v[1]);
        double b = std::max(1e-12, (double)v[2]);
        userMul[0] = static_cast<float>(g / r);
        userMul[1] = 1.0f;
        userMul[2] = static_cast<float>(g / b);
        userMul[3] = 1.0f;
        return true;
    }

    // 白平衡模式
    enum class WbMode
    {
        Camera,
        Auto,
        None,
        User
    };

    // 配置 LibRaw：设置线性输出、禁用自动提亮，并根据 wb 模式设置白平衡
    static void setLibRawForLinearOutputAndWb(LibRaw &proc, WbMode mode, const float userMul[4])
    {
        // 线性输出与禁用自动提亮（统计更稳定）
        proc.imgdata.params.gamm[0] = 1.0f;
        proc.imgdata.params.gamm[1] = 1.0f;
        proc.imgdata.params.no_auto_bright = 1;
        proc.imgdata.params.output_bps = 16;

        // 先清空 user_mul
        proc.imgdata.params.user_mul[0] = 0.f;
        proc.imgdata.params.user_mul[1] = 0.f;
        proc.imgdata.params.user_mul[2] = 0.f;
        proc.imgdata.params.user_mul[3] = 0.f;

        switch (mode)
        {
        case WbMode::Camera:
            proc.imgdata.params.use_camera_wb = 1;
            proc.imgdata.params.use_auto_wb = 0;
            break;
        case WbMode::Auto:
            proc.imgdata.params.use_camera_wb = 0;
            proc.imgdata.params.use_auto_wb = 1;
            break;
        case WbMode::None:
            proc.imgdata.params.use_camera_wb = 0;
            proc.imgdata.params.use_auto_wb = 0;
            // 显式设置为无白平衡（单位增益）
            proc.imgdata.params.user_mul[0] = 1.f;
            proc.imgdata.params.user_mul[1] = 1.f;
            proc.imgdata.params.user_mul[2] = 1.f;
            proc.imgdata.params.user_mul[3] = 1.f;
            break;
        case WbMode::User:
            proc.imgdata.params.use_camera_wb = 0;
            proc.imgdata.params.use_auto_wb = 0;
            proc.imgdata.params.user_mul[0] = userMul[0];
            proc.imgdata.params.user_mul[1] = userMul[1];
            proc.imgdata.params.user_mul[2] = userMul[2];
            proc.imgdata.params.user_mul[3] = userMul[3];
            break;
        }
    }

    // 将 LibRaw 的内存图转换为 OpenCV Mat（保持 3 通道）
    static cv::Mat makeMatFromLibRawImage(const libraw_processed_image_t *img)
    {
        if (!img)
            return {};
        int width = static_cast<int>(img->width);
        int height = static_cast<int>(img->height);
        int channels = static_cast<int>(img->colors);
        if (channels != 3)
        {
            std::cerr << "Only 3-channel RGB output supported, got colors=" << channels << "\n";
            return {};
        }
        if (img->bits == 16)
        {
            // LibRaw 输出为 RGB 顺序；OpenCV 常用 BGR。构造后立即转换为 BGR。
            cv::Mat matRgb(height, width, CV_16UC3, const_cast<void *>(static_cast<const void *>(img->data)));
            cv::Mat matRgbClone = matRgb.clone();
            cv::Mat matBgr;
            cv::cvtColor(matRgbClone, matBgr, cv::COLOR_RGB2BGR);
            return matBgr;
        }
        else if (img->bits == 8)
        {
            cv::Mat matRgb(height, width, CV_8UC3, const_cast<void *>(static_cast<const void *>(img->data)));
            cv::Mat matRgbClone = matRgb.clone();
            cv::Mat matBgr;
            cv::cvtColor(matRgbClone, matBgr, cv::COLOR_RGB2BGR);
            return matBgr;
        }
        else
        {
            std::cerr << "Unsupported bit depth: " << img->bits << "\n";
            return {};
        }
    }

    // 转为 32 位浮点并归一化到 0..1（保持线性域）
    static cv::Mat toLinearFloat3(const cv::Mat &src)
    {
        CV_Assert(src.channels() == 3);
        cv::Mat f32;
        if (src.depth() == CV_16U)
        {
            src.convertTo(f32, CV_32F, 1.0 / 65535.0);
        }
        else if (src.depth() == CV_8U)
        {
            src.convertTo(f32, CV_32F, 1.0 / 255.0);
        }
        else if (src.depth() == CV_32F)
        {
            f32 = src.clone();
        }
        else
        {
            src.convertTo(f32, CV_32F);
        }
        // 由于 LibRaw 已强制 gamma=1，此处数据本身已近似线性
        return f32;
    }

    // 灰世界估计：在掩膜下计算 B/G/R 均值，以 G 为 1 反推 R/B 增益
    static WhiteBalanceGains computeGrayWorldGains(const cv::Mat &linearRgb)
    {
        CV_Assert(linearRgb.type() == CV_32FC3);
        // 掩膜：剔除过曝与过暗像素，降低偏色与噪声的影响
        std::vector<cv::Mat> ch;
        cv::split(linearRgb, ch);
        cv::Mat maxCh, minCh;
        cv::max(ch[0], ch[1], maxCh);
        cv::max(maxCh, ch[2], maxCh);
        cv::min(ch[0], ch[1], minCh);
        cv::min(minCh, ch[2], minCh);
        cv::Mat mask = (maxCh < 0.98f) & (minCh > 0.02f);

        cv::Scalar meanAll = cv::mean(linearRgb, mask);
        double rMean = std::max(1e-6, static_cast<double>(meanAll[2])); // OpenCV 通道顺序为 B,G,R
        double gMean = std::max(1e-6, static_cast<double>(meanAll[1]));
        double bMean = std::max(1e-6, static_cast<double>(meanAll[0]));

        WhiteBalanceGains gains{};
        gains.greenGain = 1.0;
        gains.redGain = gMean / rMean;
        gains.blueGain = gMean / bMean;
        return gains;
    }

    // 应用增益：按 B,G,R 顺序分别乘以对应增益
    static cv::Mat applyWhiteBalanceGains(const cv::Mat &linearRgb, const WhiteBalanceGains &g)
    {
        CV_Assert(linearRgb.type() == CV_32FC3);
        std::vector<cv::Mat> ch;
        cv::split(linearRgb, ch);
        // OpenCV 通道顺序：B, G, R
        ch[2] *= static_cast<float>(g.redGain);
        ch[1] *= static_cast<float>(g.greenGain);
        ch[0] *= static_cast<float>(g.blueGain);
        cv::Mat balanced;
        cv::merge(ch, balanced);
        return balanced;
    }

    // 简单用法提示
    static void printUsage(const char *argv0)
    {
        std::cerr << "Usage: " << argv0 << " [--wb camera|auto|none|user:R,G,B,G2] [--kelvin K] [--tint T] [--tint-scale S] [--lock-tint] [--ocv-auto none|grayworld|simple] [--ocv-kelvin K] [--ocv-tint T] [--out-decoded <img>] [--out-balanced <img>] <path-to-raw>\n";
        std::cerr << "  --out-decoded: 导出解码后(应用所选WB), 线性→sRGB 的图像\n";
        std::cerr << "  --out-balanced: 导出应用灰世界后的图像\n";
    }

} // namespace

// 将 0..1 线性值限定到 [0,1]
static cv::Mat clamp01(const cv::Mat &m)
{
    CV_Assert(m.type() == CV_32FC3);
    cv::Mat lo, hi, out;
    cv::max(m, 0.0f, lo);
    cv::min(lo, 1.0f, hi);
    return hi;
}

// 对每个通道应用 sRGB OETF（线性→sRGB 编码），保持 0..1 浮点
static cv::Mat linearToSrgb(const cv::Mat &linear)
{
    CV_Assert(linear.type() == CV_32FC3);
    cv::Mat src = clamp01(linear);
    std::vector<cv::Mat> ch(3);
    cv::split(src, ch);
    for (int i = 0; i < 3; ++i)
    {
        cv::Mat &c = ch[i];
        cv::Mat belowMask, aboveMask;
        cv::compare(c, 0.0031308f, belowMask, cv::CMP_LE);
        cv::compare(c, 0.0031308f, aboveMask, cv::CMP_GT);

        cv::Mat resBelow, cPow, resAbove, res;
        resBelow = c * 12.92f;
        cv::pow(c, 1.0 / 2.4, cPow);
        resAbove = 1.055f * cPow - 0.055f;
        res = cv::Mat::zeros(c.size(), c.type());
        resBelow.copyTo(res, belowMask);
        resAbove.copyTo(res, aboveMask);
        ch[i] = res;
    }
    cv::Mat out;
    cv::merge(ch, out);
    return out;
}

// 保存线性 BGR 图为 sRGB 8-bit 图像
static bool saveLinearBgrAsSrgb8bit(const cv::Mat &linearBgr, const std::string &path)
{
    if (linearBgr.empty() || linearBgr.type() != CV_32FC3)
        return false;
    cv::Mat srgb = linearToSrgb(linearBgr);
    cv::Mat u8;
    srgb.convertTo(u8, CV_8UC3, 255.0);
    return cv::imwrite(path, u8);
}

int main(int argc, char **argv)
{
    if (argc < 2)
    {
        printUsage(argv[0]);
        return 2;
    }
    // 解析参数：支持 --wb、--out
    std::string outDecoded;
    std::string outBalanced;
    WbMode wbMode = WbMode::Camera;
    float userMul[4] = {1.f, 1.f, 1.f, 1.f};
    double optKelvin = 0.0; // 0 表示未设置
    double optTintUi = 0.0; // UI Tint，正=洋红/负=绿色
    double optTintScale = 1000.0;
    bool tintProvided = false;
    bool lockTint = false;
    std::string ocvAuto = "none"; // none|grayworld|simple（仅估计，不应用）
    double ocvKelvin = 0.0;       // OpenCV 层手动色温
    double ocvTintUi = 0.0;       // OpenCV 层手动色调（UI，正=洋红/负=绿色）
    bool ocvTintProvided = false;
    bool ocvLockTint = false;
    std::vector<std::string> positional;
    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];
        if (arg == "--wb" && i + 1 < argc)
        {
            std::string val = argv[++i];
            if (val == "camera")
                wbMode = WbMode::Camera;
            else if (val == "auto")
                wbMode = WbMode::Auto;
            else if (val == "none")
                wbMode = WbMode::None;
            else if (val.rfind("user:", 0) == 0)
            {
                wbMode = WbMode::User;
                std::string nums = val.substr(5);
                // 解析 R,G,B,G2
                double r = 1, g1 = 1, b = 1, g2 = 1;
                if (std::sscanf(nums.c_str(), "%lf,%lf,%lf,%lf", &r, &g1, &b, &g2) == 4)
                {
                    userMul[0] = static_cast<float>(r);
                    userMul[1] = static_cast<float>(g1);
                    userMul[2] = static_cast<float>(b);
                    userMul[3] = static_cast<float>(g2);
                }
                else
                {
                    std::cerr << "Invalid --wb user:R,G,B,G2 format\n";
                    return 2;
                }
            }
            else
            {
                std::cerr << "Unknown --wb value: " << val << "\n";
                return 2;
            }
            continue;
        }
        if (arg == "--kelvin" && i + 1 < argc)
        {
            optKelvin = std::atof(argv[++i]);
            continue;
        }
        if (arg == "--tint" && i + 1 < argc)
        {
            optTintUi = std::atof(argv[++i]);
            tintProvided = true;
            continue;
        }
        if (arg == "--ocv-auto" && i + 1 < argc)
        {
            ocvAuto = argv[++i];
            continue;
        }
        if (arg == "--ocv-kelvin" && i + 1 < argc)
        {
            ocvKelvin = std::atof(argv[++i]);
            continue;
        }
        if (arg == "--ocv-tint" && i + 1 < argc)
        {
            ocvTintUi = std::atof(argv[++i]);
            ocvTintProvided = true;
            continue;
        }
        if (arg == "--lock-tint")
        {
            lockTint = true;
            ocvLockTint = true;
            continue;
        }
        if (arg == "--tint-scale" && i + 1 < argc)
        {
            optTintScale = std::atof(argv[++i]);
            continue;
        }
        if (arg == "--out-decoded" && i + 1 < argc)
        {
            outDecoded = argv[++i];
        }
        else if (arg == "--out-balanced" && i + 1 < argc)
        {
            outBalanced = argv[++i];
        }
        else if (arg == "--help" || arg == "-h")
        {
            printUsage(argv[0]);
            return 0;
        }
        else if (!arg.empty() && arg[0] == '-')
        {
            std::cerr << "Unknown option: " << arg << "\n";
            printUsage(argv[0]);
            return 2;
        }
        else
        {
            positional.push_back(arg);
        }
    }
    if (positional.empty())
    {
        printUsage(argv[0]);
        return 2;
    }
    const char *rawPath = positional[0].c_str();

    LibRaw proc;
    // 1) 先配置线性输出
    proc.imgdata.params.gamm[0] = 1.0f;
    proc.imgdata.params.gamm[1] = 1.0f;
    proc.imgdata.params.no_auto_bright = 1;
    proc.imgdata.params.output_bps = 16;

    // 2) 打开 RAW 文件
    int ret = proc.open_file(rawPath);
    // 2.5) 如果给了 Kelvin/Tint，则将其转换为等效 user_mul
    // 组合逻辑：
    // - Kelvin 仅设置：保持 AsShot Tint（或 lockTint 时 duv=0）
    // - Tint 仅设置：以 AsShot CCT 为基准，调整 Tint
    // - Kelvin+Tint：按给定 Kelvin 与 Tint 共同确定白点
    if (optKelvin > 0.0 || tintProvided)
    {
        double baseKelvin = optKelvin;
        double duvDirect = 0.0;
        bool ok = false;

        if (!tintProvided)
        {
            if (lockTint)
            {
                duvDirect = 0.0; // 锁定在日光轨迹
            }
            else
            {
                double duvShot = 0.0;
                if (getAsShotDuv(proc, duvShot))
                    duvDirect = duvShot;
            }
        }
        else
        {
            duvDirect = uiTintToDuv(optTintUi, optTintScale);
        }

        if (baseKelvin <= 0.0)
        {
            if (!getAsShotCct(proc, baseKelvin))
                baseKelvin = 6500.0;
        }

        ok = computeUserMulFromKelvinWithDuv(proc, baseKelvin, duvDirect, userMul);
        if (ok)
            wbMode = WbMode::User;
    }

    // 设置 WB 参数（camera/auto/user/none）
    proc.imgdata.params.use_camera_wb = 0;
    proc.imgdata.params.use_auto_wb = 0;
    proc.imgdata.params.user_mul[0] = 0.f;
    proc.imgdata.params.user_mul[1] = 0.f;
    proc.imgdata.params.user_mul[2] = 0.f;
    proc.imgdata.params.user_mul[3] = 0.f;
    if (wbMode == WbMode::Camera)
        proc.imgdata.params.use_camera_wb = 1;
    else if (wbMode == WbMode::Auto)
        proc.imgdata.params.use_auto_wb = 1;
    else if (wbMode == WbMode::None)
    {
        proc.imgdata.params.user_mul[0] = 1.f;
        proc.imgdata.params.user_mul[1] = 1.f;
        proc.imgdata.params.user_mul[2] = 1.f;
        proc.imgdata.params.user_mul[3] = 1.f;
    }
    else if (wbMode == WbMode::User)
    {
        proc.imgdata.params.user_mul[0] = userMul[0];
        proc.imgdata.params.user_mul[1] = userMul[1];
        proc.imgdata.params.user_mul[2] = userMul[2];
        proc.imgdata.params.user_mul[3] = userMul[3];
    }

    // 打印实际应用的 user_mul（便于验证 K/T 的影响）
    std::cout << "applied_user_mul: { R: " << proc.imgdata.params.user_mul[0]
              << ", G: " << proc.imgdata.params.user_mul[1]
              << ", B: " << proc.imgdata.params.user_mul[2]
              << ", G2: " << proc.imgdata.params.user_mul[3] << " }\n";

    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "LibRaw open_file failed: " << libraw_strerror(ret) << "\n";
        return 1;
    }

    // 3) 解包 RAW 数据
    ret = proc.unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "LibRaw unpack failed: " << libraw_strerror(ret) << "\n";
        proc.recycle();
        return 1;
    }

    // 4) 走 dcraw 流程，按上述参数进行去马赛克与颜色处理
    ret = proc.dcraw_process();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "LibRaw dcraw_process failed: " << libraw_strerror(ret) << "\n";
        proc.recycle();
        return 1;
    }

    // 5) 拿到处理后的 RGB 内存图像
    libraw_processed_image_t *image = proc.dcraw_make_mem_image(&ret);
    if (!image || ret != LIBRAW_SUCCESS)
    {
        std::cerr << "LibRaw dcraw_make_mem_image failed: " << libraw_strerror(ret) << "\n";
        if (image)
            LibRaw::dcraw_clear_mem(image);
        proc.recycle();
        return 1;
    }

    // 6) 转换为 OpenCV Mat，并在线性域下转为 32F
    cv::Mat rgb = makeMatFromLibRawImage(image);
    LibRaw::dcraw_clear_mem(image);
    if (rgb.empty())
    {
        std::cerr << "Failed to convert LibRaw mem image to cv::Mat\n";
        proc.recycle();
        return 1;
    }

    cv::Mat linearF32 = toLinearFloat3(rgb);

    // 7) 计算灰世界增益（OpenCV 统计）
    WhiteBalanceGains gw = computeGrayWorldGains(linearF32);
    // 8) 应用增益用于验证（可选）
    cv::Mat balanced = applyWhiteBalanceGains(linearF32, gw);

    // 8.5) OpenCV 自动白平衡：仅估计参数，不应用
    if (ocvAuto == "grayworld")
    {
        WhiteBalanceGains g2 = computeGrayWorldGains(linearF32);
        std::cout << "ocv_auto_grayworld_gains: { R: " << g2.redGain << ", G: " << g2.greenGain << ", B: " << g2.blueGain << " }\n";
    }
    else if (ocvAuto == "simple")
    {
        cv::Mat u8;
        linearF32.convertTo(u8, CV_8UC3, 255.0);
        cv::Mat u8wb;
        cv::Ptr<cv::xphoto::SimpleWB> wb = cv::xphoto::createSimpleWB();
        wb->setP(0.5f);
        wb->balanceWhite(u8, u8wb);
        cv::Mat f32wb;
        u8wb.convertTo(f32wb, CV_32FC3, 1.0 / 255.0);
        // 以 G 为基准估计等效增益（均值法）
        cv::Scalar m0 = cv::mean(linearF32);
        double rMean = std::max(1e-6, (double)m0[2]);
        double gMean = std::max(1e-6, (double)m0[1]);
        double bMean = std::max(1e-6, (double)m0[0]);
        std::cout << "ocv_auto_simple_gains: { R: " << (gMean / rMean) << ", G: 1, B: " << (gMean / bMean) << " }\n";
    }
    // 8.6) OpenCV 手动 Kelvin/Tint：直接实现视觉效果
    cv::Mat decodedForExport = linearF32; // 默认不改
    if (ocvKelvin > 0.0 || ocvTintProvided)
    {
        // 简化实现：直接产生视觉效果，不涉及复杂的色彩科学计算
        // 用户期望：K值越高->图像越暖（偏黄红），K值越低->图像越冷（偏蓝）
        double kelvinTarget = (ocvKelvin > 0.0) ? ocvKelvin : 6500.0;
        double tintValue = ocvTintProvided ? ocvTintUi : 0.0;

        // 基于经验的色温->RGB增益映射
        double rGain, gGain, bGain;

        if (kelvinTarget <= 6500.0)
        {
            // 冷色调范围 (2000K - 6500K)
            // K值越低，越冷（更蓝）
            double factor = (6500.0 - kelvinTarget) / 4500.0; // 归一化到[0,1]
            rGain = 1.0 - factor * 0.4;                       // 减少红色
            gGain = 1.0 - factor * 0.1;                       // 轻微减少绿色
            bGain = 1.0 + factor * 0.5;                       // 增加蓝色
        }
        else
        {
            // 暖色调范围 (6500K - 12000K)
            // K值越高，越暖（更黄红）
            double factor = (kelvinTarget - 6500.0) / 5500.0; // 归一化到[0,1]
            factor = std::min(1.0, factor);
            rGain = 1.0 + factor * 0.4;  // 增加红色
            gGain = 1.0 - factor * 0.05; // 轻微减少绿色产生橙色
            bGain = 1.0 - factor * 0.4;  // 减少蓝色
        }

        // Tint调整：正值偏洋红，负值偏绿
        if (tintValue != 0.0)
        {
            double tintFactor = tintValue / 100.0;
            gGain *= std::exp(-tintFactor * 0.15); // Tint主要影响绿色通道
            // 轻微调整红蓝以产生洋红/绿色偏移
            if (tintValue > 0)
            {
                // 偏洋红：轻微增加红蓝
                rGain *= 1.0 + std::abs(tintFactor) * 0.05;
                bGain *= 1.0 + std::abs(tintFactor) * 0.05;
            }
        }

        // 归一化保持整体亮度
        double avgGain = (rGain + gGain + bGain) / 3.0;
        rGain /= avgGain;
        gGain /= avgGain;
        bGain /= avgGain;

        std::cout << "ocv_visual_kelvin: " << kelvinTarget << " K\n";
        if (ocvTintProvided)
        {
            std::cout << "ocv_visual_tint: " << tintValue << "\n";
        }
        std::cout << "ocv_visual_gains: { R: " << rGain << ", G: " << gGain << ", B: " << bGain << " }\n";

        // 应用增益到图像
        decodedForExport = linearF32.clone();
        cv::Mat channels[3];
        cv::split(decodedForExport, channels);
        channels[0] *= bGain; // BGR顺序
        channels[1] *= gGain;
        channels[2] *= rGain;
        cv::merge(channels, 3, decodedForExport);
    }

    // 9) 分别统计平衡前与平衡后的平均线性 RGB
    cv::Scalar meanBefore = cv::mean(linearF32);
    cv::Scalar meanAfter = cv::mean(balanced);

    // 10) 转为 RGB 顺序以便输出（OpenCV 为 B,G,R）
    double avgR_before = meanBefore[2], avgG_before = meanBefore[1], avgB_before = meanBefore[0];
    double avgR_after = meanAfter[2], avgG_after = meanAfter[1], avgB_after = meanAfter[0];

    // 11) 由“平衡前”的线性 RGB 平均值估算场景光源的 CCT 与 Tint
    CctTint ct = estimateCctTintFromLinearSrgbAverages(avgR_before, avgG_before, avgB_before);

    // 12) 输出相机 AsShot 增益（两个 G 取平均）
    double camMulR = proc.imgdata.color.cam_mul[0];
    double camMulG = (proc.imgdata.color.cam_mul[1] + proc.imgdata.color.cam_mul[3]) * 0.5; // average greens
    double camMulB = proc.imgdata.color.cam_mul[2];

    std::cout.setf(std::ios::fixed);
    std::cout.precision(6);

    // 13) 打印所有关键结果
    std::cout << "file: " << rawPath << "\n";
    std::cout << "libraw_cam_mul: { R: " << camMulR << ", G: " << camMulG << ", B: " << camMulB << " }\n";
    std::cout << "opencv_grayworld_gains: { R: " << gw.redGain << ", G: " << gw.greenGain << ", B: " << gw.blueGain << " }\n";
    std::cout << "avg_linear_rgb_before: { R: " << avgR_before << ", G: " << avgG_before << ", B: " << avgB_before << " }\n";
    std::cout << "avg_linear_rgb_after:  { R: " << avgR_after << ", G: " << avgG_after << ", B: " << avgB_after << " }\n";
    std::cout << "estimated_cct_K: " << ct.cctKelvin << "\n";
    std::cout << "estimated_tint_duv: " << ct.duv << "\n";

    // 导出：解码后（应用 WB）和灰世界后
    if (!outDecoded.empty())
    {
        bool ok = saveLinearBgrAsSrgb8bit(decodedForExport.empty() ? linearF32 : decodedForExport, outDecoded);
        if (ok)
            std::cout << "saved_decoded_image: " << outDecoded << "\n";
        else
            std::cerr << "Failed to save image to: " << outDecoded << "\n";
    }
    if (!outBalanced.empty())
    {
        bool ok = saveLinearBgrAsSrgb8bit(balanced, outBalanced);
        if (ok)
            std::cout << "saved_grayworld_image: " << outBalanced << "\n";
        else
            std::cerr << "Failed to save image to: " << outBalanced << "\n";
    }

    proc.recycle();
    return 0;
}
