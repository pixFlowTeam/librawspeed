#include <iostream>
#include <string>
#include <vector>
#include <cstdio>
#include <cstdlib>
#include <cmath>

#include <libraw/libraw.h>
#include <lcms2.h>

#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>

// 复用现有的色温/色调估算工具
#include "../wb_temperature.h"

namespace
{
    enum class WbMode
    {
        Camera,
        Auto,
        None,
        User
    };

    struct ProgramConfig
    {
        std::string input_path;
        std::string output_path;
        std::string output_jpeg_path;
        std::string output_notes_path;

        WbMode wb_mode = WbMode::Camera;
        float user_mul[4] = {1.0f, 1.0f, 1.0f, 1.0f};

        double kelvin = 0.0; // 0 表示不覆盖，相机或自动WB
        double tint = 0.0;   // Lightroom 风格，正=洋红，负=绿色
        bool tint_provided = false;

        int output_bps = 16;
        int quality = 90;
        bool notes = false;
    };

    void printUsage(const char *prog)
    {
        std::cout << "用法: " << prog << " [选项] <RAW文件>\n\n";
        std::cout << "选项:\n";
        std::cout << "  --out <path>           输出JPEG路径\n";
        std::cout << "  --wb <mode>            白平衡: camera|auto|none|user:R,G,B,G2\n";
        std::cout << "  --kelvin <K>           色温(K)，例: 6500\n";
        std::cout << "  --tint <T>             色调(洋红+ / 绿色-)，例: +10/-10\n";
        std::cout << "  --bps <8|16>           处理位深(默认16)\n";
        std::cout << "  --quality <1..100>     JPEG质量(默认90)\n";
        std::cout << "  --notes                输出步骤备注(raw同目录 .txt)\n";
        std::cout << "  --help                 显示帮助\n";
    }

    bool parseArgs(int argc, char **argv, ProgramConfig &cfg)
    {
        std::vector<std::string> pos;
        for (int i = 1; i < argc; ++i)
        {
            std::string a = argv[i];
            if (a == "--out" && i + 1 < argc)
            {
                cfg.output_path = argv[++i];
            }
            else if (a == "--wb" && i + 1 < argc)
            {
                std::string v = argv[++i];
                if (v == "camera")
                    cfg.wb_mode = WbMode::Camera;
                else if (v == "auto")
                    cfg.wb_mode = WbMode::Auto;
                else if (v == "none")
                    cfg.wb_mode = WbMode::None;
                else if (v.rfind("user:", 0) == 0)
                {
                    cfg.wb_mode = WbMode::User;
                    double r, g1, b, g2;
                    if (std::sscanf(v.c_str() + 5, "%lf,%lf,%lf,%lf", &r, &g1, &b, &g2) == 4)
                    {
                        cfg.user_mul[0] = static_cast<float>(r);
                        cfg.user_mul[1] = static_cast<float>(g1);
                        cfg.user_mul[2] = static_cast<float>(b);
                        cfg.user_mul[3] = static_cast<float>(g2);
                    }
                }
            }
            else if (a == "--kelvin" && i + 1 < argc)
            {
                cfg.kelvin = std::atof(argv[++i]);
            }
            else if (a == "--tint" && i + 1 < argc)
            {
                cfg.tint = std::atof(argv[++i]);
                cfg.tint_provided = true;
            }
            else if (a == "--bps" && i + 1 < argc)
            {
                cfg.output_bps = std::atoi(argv[++i]);
            }
            else if (a == "--quality" && i + 1 < argc)
            {
                cfg.quality = std::atoi(argv[++i]);
            }
            else if (a == "--notes")
            {
                cfg.notes = true;
            }
            else if (a == "--help")
            {
                return false;
            }
            else if (!a.empty() && a[0] != '-')
            {
                pos.push_back(a);
            }
        }

        if (pos.empty())
            return false;
        cfg.input_path = pos[0];
        if (cfg.output_path.empty())
        {
            cfg.output_path = cfg.input_path + std::string(".jpg");
        }
        return true;
    }

    // Lightroom 风格 K/Tint 到通道增益的近似：
    // - 基于黑体轨迹(cct)控制 R/B 相对 G 的比例
    // - Tint 作为正交于轨迹的绿色-洋红偏移，影响 R/G 和 B/G 相对比，彼此相反方向
    struct RGBGains
    {
        float r = 1.0f;
        float g = 1.0f;
        float b = 1.0f;
    };

    // 近似的 CCT->RGB 比例，使用简单幂律拟合；精度足以驱动可视滑块
    static RGBGains gainsFromKelvinTint(double kelvin, double tint)
    {
        // 基线: D65 作为 6500K
        const double refK = 6500.0;
        if (kelvin <= 0.0)
            kelvin = refK;

        double kRatio = kelvin / refK;
        // 提高 Kelvin 应更“暖”：增加红、降低蓝
        double rScale = std::pow(kRatio, +0.5);
        double bScale = std::pow(kRatio, -0.5);

        // Tint：+ 洋红 同时提高 R/G 与 B/G；- 绿色 同时降低
        double tintScale = 0.01; // 调小灵敏度
        double t = tint * tintScale;

        double r = rScale * (1.0 + t);
        double g = 1.0;
        double b = bScale * (1.0 + t);

        // 归一化以保持灰卡不变（以G为基准）
        double norm = 1.0 / std::max({r, g, b});
        RGBGains gains;
        gains.r = static_cast<float>(r * norm);
        gains.g = static_cast<float>(g * norm);
        gains.b = static_cast<float>(b * norm);
        return gains;
    }

    void configureLibRaw(LibRaw &proc, const ProgramConfig &cfg)
    {
        proc.imgdata.params.output_bps = cfg.output_bps;
        proc.imgdata.params.no_auto_bright = 1;
        proc.imgdata.params.gamm[0] = 1.0f; // 线性输出，后续交给 lcms2 做TRC
        proc.imgdata.params.gamm[1] = 1.0f;
        proc.imgdata.params.output_color = 1; // sRGB 颜色空间（线性TRC，由 lcms 负责编码）

        proc.imgdata.params.use_camera_wb = 0;
        proc.imgdata.params.use_auto_wb = 0;
        for (int i = 0; i < 4; ++i)
            proc.imgdata.params.user_mul[i] = 0.f;

        switch (cfg.wb_mode)
        {
        case WbMode::Camera:
            proc.imgdata.params.use_camera_wb = 1;
            break;
        case WbMode::Auto:
            proc.imgdata.params.use_auto_wb = 1;
            break;
        case WbMode::None:
            for (int i = 0; i < 4; ++i)
                proc.imgdata.params.user_mul[i] = 1.f;
            break;
        case WbMode::User:
            for (int i = 0; i < 4; ++i)
                proc.imgdata.params.user_mul[i] = cfg.user_mul[i];
            break;
        }
    }

    // 应用 K/Tint 增益到线性 RGB 图片
    static cv::Mat applyGains(const cv::Mat &linearRgb, const RGBGains &g)
    {
        CV_Assert(linearRgb.type() == CV_32FC3);
        std::vector<cv::Mat> ch;
        cv::split(linearRgb, ch);
        ch[2] *= g.r; // R
        ch[1] *= g.g; // G
        ch[0] *= g.b; // B
        cv::Mat out;
        cv::merge(ch, out);
        return out;
    }

    // 使用 littleCMS: 线性 sRGB (D65, 线性TRC) -> sRGB (标准TRC)
    static cv::Mat convertToSrgbUsingLCMS(const cv::Mat &linearRgb)
    {
        CV_Assert(linearRgb.type() == CV_32FC3);

        // 定义 sRGB 原色与 D65 白点
        cmsCIExyY whitePoint;
        // 使用 D65 白点（约 6504K）
        cmsWhitePointFromTemp(&whitePoint, 6504.0);

        cmsCIExyYTRIPLE primaries;
        primaries.Red.x = 0.6400;
        primaries.Red.y = 0.3300;
        primaries.Red.Y = 1.0;
        primaries.Green.x = 0.3000;
        primaries.Green.y = 0.6000;
        primaries.Green.Y = 1.0;
        primaries.Blue.x = 0.1500;
        primaries.Blue.y = 0.0600;
        primaries.Blue.Y = 1.0;

        // 线性 TRC（gamma 1.0）
        cmsToneCurve *linear = cmsBuildGamma(nullptr, 1.0);
        cmsToneCurve *tf[3] = {linear, linear, linear};

        cmsHPROFILE src = cmsCreateRGBProfile(&whitePoint, &primaries, tf);
        cmsHPROFILE dst = cmsCreate_sRGBProfile();

        cmsUInt32Number fmt = TYPE_RGB_FLT;
        cmsHTRANSFORM xform = cmsCreateTransform(src, fmt, dst, fmt, INTENT_RELATIVE_COLORIMETRIC, 0);

        cv::Mat srgb(linearRgb.size(), CV_32FC3);
        cmsDoTransform(xform, linearRgb.ptr(), srgb.ptr(), static_cast<cmsUInt32Number>(linearRgb.total()));

        cmsDeleteTransform(xform);
        cmsCloseProfile(src);
        cmsCloseProfile(dst);
        cmsFreeToneCurve(linear);
        return srgb;
    }

    // 线性到 sRGB 的 OETF（作为对比/回退）。
    static cv::Mat linearToSrgbOETF(const cv::Mat &linear)
    {
        CV_Assert(linear.type() == CV_32FC3);
        cv::Mat res = linear.clone();
        std::vector<cv::Mat> ch;
        cv::split(res, ch);
        for (auto &c : ch)
        {
            cv::Mat lowMask, highMask;
            cv::compare(c, 0.0031308f, lowMask, cv::CMP_LE);
            cv::compare(c, 0.0031308f, highMask, cv::CMP_GT);
            lowMask.convertTo(lowMask, CV_32F, 1.0 / 255.0);
            highMask.convertTo(highMask, CV_32F, 1.0 / 255.0);
            cv::Mat lowRes, powRes, highRes;
            lowRes = c * 12.92f;
            cv::pow(c, 1.0 / 2.4, powRes);
            highRes = 1.055f * powRes - 0.055f;
            c = lowRes.mul(lowMask) + highRes.mul(highMask);
        }
        cv::merge(ch, res);
        return res;
    }

    static bool saveJpeg(const cv::Mat &srgbU8, const std::string &path, int quality)
    {
        std::vector<int> params = {cv::IMWRITE_JPEG_QUALITY, quality};
        return cv::imwrite(path, srgbU8, params);
    }

} // namespace

int main(int argc, char **argv)
{
    ProgramConfig cfg;
    if (!parseArgs(argc, argv, cfg))
    {
        printUsage(argv[0]);
        return 1;
    }

    LibRaw raw;
    int ret = raw.open_file(cfg.input_path.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "无法打开RAW: " << libraw_strerror(ret) << "\n";
        return 2;
    }

    configureLibRaw(raw, cfg);

    ret = raw.unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "解包失败: " << libraw_strerror(ret) << "\n";
        raw.recycle();
        return 3;
    }

    // 先让 LibRaw 做最小化处理到RGB线性空间（不做gamma）
    ret = raw.dcraw_process();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "处理失败: " << libraw_strerror(ret) << "\n";
        raw.recycle();
        return 4;
    }

    int err = 0;
    libraw_processed_image_t *img = raw.dcraw_make_mem_image(&err);
    if (!img || err != LIBRAW_SUCCESS)
    {
        std::cerr << "创建内存图像失败: " << libraw_strerror(err) << "\n";
        if (img)
            LibRaw::dcraw_clear_mem(img);
        raw.recycle();
        return 5;
    }

    // 转 OpenCV Mat, 线性浮点 [0,1]
    cv::Mat linear;
    if (img->colors != 3)
    {
        std::cerr << "只支持3通道输出\n";
        LibRaw::dcraw_clear_mem(img);
        raw.recycle();
        return 6;
    }
    if (img->bits == 16)
    {
        cv::Mat rgb(img->height, img->width, CV_16UC3, img->data);
        cv::Mat bgr;
        cv::cvtColor(rgb, bgr, cv::COLOR_RGB2BGR);
        bgr.convertTo(linear, CV_32FC3, 1.0 / 65535.0);
    }
    else if (img->bits == 8)
    {
        cv::Mat rgb(img->height, img->width, CV_8UC3, img->data);
        cv::Mat bgr;
        cv::cvtColor(rgb, bgr, cv::COLOR_RGB2BGR);
        bgr.convertTo(linear, CV_32FC3, 1.0 / 255.0);
    }
    else
    {
        std::cerr << "不支持位深: " << img->bits << "\n";
        LibRaw::dcraw_clear_mem(img);
        raw.recycle();
        return 7;
    }

    // 估算基础色温/色调，用于报告（基于线性 sRGB 平均值）
    cv::Scalar meanBefore = cv::mean(linear);
    wb::temperature::ColorTemperature est = wb::temperature::estimateFromLinearSrgb(
        meanBefore[2], meanBefore[1], meanBefore[0]);

    // 将 K/Tint 作为后乘增益应用（保持无损: 在线性空间中缩放通道）
    if (cfg.kelvin > 0.0 || cfg.tint_provided)
    {
        RGBGains g = gainsFromKelvinTint(cfg.kelvin, cfg.tint);
        linear = applyGains(linear, g);
    }

    // 使用 lcms2 将线性RGB映射到 sRGB（已包含 sRGB TRC），因此无需再次应用 OETF
    cv::Mat srgbEncoded = convertToSrgbUsingLCMS(linear);

    // 裁剪到[0,1] 并转 8-bit 保存 JPEG
    cv::min(srgbEncoded, 1.0, srgbEncoded);
    cv::max(srgbEncoded, 0.0, srgbEncoded);
    cv::Mat u8;
    srgbEncoded.convertTo(u8, CV_8UC3, 255.0);

    bool ok = saveJpeg(u8, cfg.output_path, cfg.quality);
    std::cout << "CCT(估算): " << est.cct_kelvin << " K, duv: " << est.duv << "\n";

    // 输出备注
    if (cfg.notes)
    {
        std::string notesPath = cfg.input_path + std::string(".wb_notes.txt");
        FILE *f = std::fopen(notesPath.c_str(), "w");
        if (f)
        {
            std::fprintf(f, "Input: %s\n", cfg.input_path.c_str());
            std::fprintf(f, "WB Mode: %s\n", (cfg.wb_mode == WbMode::Camera ? "camera" : (cfg.wb_mode == WbMode::Auto ? "auto" : (cfg.wb_mode == WbMode::None ? "none" : "user"))));
            if (cfg.wb_mode == WbMode::User)
                std::fprintf(f, "user_mul: %.6f, %.6f, %.6f, %.6f\n", cfg.user_mul[0], cfg.user_mul[1], cfg.user_mul[2], cfg.user_mul[3]);
            std::fprintf(f, "Kelvin: %.2f, Tint: %.2f\n", cfg.kelvin, cfg.tint);
            std::fprintf(f, "Output JPEG: %s (Q=%d)\n", cfg.output_path.c_str(), cfg.quality);
            std::fprintf(f, "Mean before balance (B,G,R): %.6f, %.6f, %.6f\n", meanBefore[0], meanBefore[1], meanBefore[2]);
            std::fclose(f);
        }
    }

    LibRaw::dcraw_clear_mem(img);
    raw.recycle();

    if (!ok)
    {
        std::cerr << "保存JPEG失败: " << cfg.output_path << "\n";
        return 8;
    }

    std::cout << "✅ 已导出: " << cfg.output_path << "\n";
    return 0;
}
