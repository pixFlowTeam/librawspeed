/**
 * @file raw_wb_whitepoint.cpp
 * @brief 基于白点（White Point）的白平衡调节工具
 *
 * 使用 LibRaw 读取 RAW 文件，使用 LittleCMS 进行基于白点的色彩适应变换（Chromatic Adaptation Transform）
 *
 * ========== 白点调节白平衡的核心理论 ==========
 *
 * 1. 白点（White Point）定义：
 *    - 白点定义了在特定光源条件下"纯白色"在色彩空间中的位置
 *    - 常见标准白点：D65（6504K，日光）、D50（5003K，印刷）、A（2856K，钨丝灯）
 *    - 白点用 CIE XYZ 或 xyY 色度坐标表示
 *
 * 2. 色温（Color Temperature）与白点的关系：
 *    - 色温基于黑体辐射理论：加热黑体到特定温度时发出的光的颜色
 *    - 色温通过 Planck's law 决定光谱功率分布（SPD）
 *    - SPD 通过 CIE 标准观察者函数积分得到 XYZ 值，进而计算 xy 色度
 *    - 公式：从色温 K 计算 xy 坐标（使用 Robertson 或 McCamy 近似）
 *
 * 3. 色调偏移（Duv）的含义：
 *    - Duv 表示到黑体轨迹（Planckian locus）的带符号垂直距离
 *    - 在 CIE 1960 UCS (u,v) 图上，Duv 沿着垂直于黑体轨迹的方向
 *    - 正值 = 洋红偏移（向上），负值 = 绿色偏移（向下）
 *    - Duv（Delta uv）是标准度量，表示到黑体轨迹的距离
 *
 * 4. 色彩适应变换（Chromatic Adaptation Transform, CAT）：
 *    - 模拟人眼视觉系统对不同光源的适应
 *    - 将源白点下的颜色转换到目标白点下的对应颜色
 *    - 常用算法：
 *      • Bradford Transform（最常用，LittleCMS 默认）
 *      • CAT02（CIECAM02 的一部分）
 *      • von Kries Transform（最简单）
 *    - 基本步骤：
 *      a) 将 XYZ 转换到锥细胞响应空间（LMS）
 *      b) 应用对角缩放矩阵进行适应
 *      c) 转换回 XYZ 空间
 *
 * 5. 从 LibRaw 白平衡系数转换到白点：
 *    - LibRaw 提供的是 RGBG 通道乘数（multipliers）
 *    - 假设中性灰在原始空间的响应为 (R_raw, G_raw, B_raw)
 *    - 应用乘数后：(R_raw * mul_r, G_raw * mul_g, B_raw * mul_b)
 *    - 归一化后的比例代表了实际捕获的白点
 *    - 通过色彩矩阵转换到 XYZ，得到源白点坐标
 *
 * 6. 色温/Duv 到白点的转换：
 *    - 色温 K → xy 坐标（黑体轨迹上的点）
 *    - 直接使用 Duv 偏移量
 *    - 最终白点 = 黑体轨迹点 + 垂直偏移
 *
 * ========== 实现优势 ==========
 *
 * 优点：
 * 1. 色彩学准确性：基于标准 CIE 色彩学理论，结果可预测且一致
 * 2. 感知均匀：使用 CAT 保持色彩关系，更自然的视觉效果
 * 3. 灵活性：可以精确控制目标白点，支持任意光源间转换
 * 4. 标准化：与专业色彩管理工作流程兼容
 * 5. 保留色彩关系：不是简单的通道缩放，保持色相和饱和度关系
 *
 * 缺点：
 * 1. 计算复杂度：需要矩阵运算和色彩空间转换，比简单通道缩放慢
 * 2. 需要色彩配置文件：准确性依赖于正确的色彩矩阵和配置
 * 3. 极端情况处理：极端白点调整可能导致色域裁剪
 * 4. 学习曲线：理解和调试需要色彩学知识
 *
 * @author Fuguo Qiang
 * @date 2025
 */

#include <iostream>
#include <iomanip>
#include <string>
#include <vector>
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <memory>

#include <libraw.h>
#include <lcms2.h>

#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>

#include "color_temperature.h"

namespace WhitePointWB
{
    // 使用 ColorTemp 命名空间的定义
    using namespace ColorTemp;

    // 保留一些本地常量
    constexpr double PI = 3.14159265358979323846;

    /**
     * @brief 白平衡配置
     *
     * 说明：
     * - 本工具在 RAW→线性RGB 后，不使用 LibRaw 的白平衡，转而使用 LCMS 基于白点的 CAT 从“源白点→目标白点”。
     * - 避免“双重白平衡”：估计源白点时不调用 dcraw_process()；真正渲染时 use_camera_wb/use_auto_wb 均为 0。
     * - 输入输出约定：CMS 侧使用 RGB 顺序（TYPE_RGB_FLT），保存前再转回 OpenCV 的 BGR 写出。
     */
    struct WhiteBalanceConfig
    {
        // 输入输出路径
        std::string input_path;
        std::string output_path;

        // 白平衡模式
        enum Mode
        {
            CAMERA_WB,     // 使用相机记录的白平衡
            AUTO_WB,       // LibRaw 自动白平衡
            MANUAL_KELVIN, // 手动指定色温和 Duv
            MANUAL_XY,     // 手动指定 xy 色度坐标
            NEUTRAL_PICK   // 从图像中选择中性点
        } mode = CAMERA_WB;

        // 手动白平衡参数
        double target_kelvin = ILLUMINANT_D65; // 目标色温
        double target_duv = 0.0;               // 目标 Duv（正=绿色，负=洋红）
        ChromaticityXY target_xy;              // 目标 xy 坐标

        // CAT 算法选择
        enum CATMethod
        {
            BRADFORD, // Bradford Transform（推荐）
            CAT02,    // CAT02（CIECAM02 的一部分）
            VON_KRIES // von Kries（简单但不够准确）
        } cat_method = BRADFORD;

        // 输出设置
        int output_bps = 16;      // 处理位深
        int jpeg_quality = 95;    // JPEG 质量
        bool save_linear = false; // 是否保存线性输出
        bool verbose = false;     // 详细输出
    };

    // 色温转换函数现在由 color_temperature.h 提供

    // ========== LibRaw 白平衡系数处理 ==========

    /**
     * @brief 从 LibRaw 的白平衡系数推算源白点
     *
     * LibRaw 提供的系数是将 RAW 数据转换到"平衡"状态的乘数
     * 通过这些系数的比例，可以推算出实际捕获场景的白点
     *
     * @param processor LibRaw 处理器实例
     * @return 推算出的源白点 xy 坐标
     */
    ChromaticityXY estimateWhitePointFromCoefficients(LibRaw &processor)
    {
        // 使用相机系数与相机矩阵，直接估算场景白点（更物理）
        const float *cam_mul = processor.imgdata.color.cam_mul;
        const float(*cam_xyz)[3] = processor.imgdata.color.cam_xyz;
        return estimateWhitePointXYFromCamMulAndMatrix(cam_mul, cam_xyz);
    }

    // ========== 色彩适应变换（CAT）==========

    /**
     * @brief 使用 LittleCMS 创建色彩适应变换
     *
     * 创建从源白点到目标白点的色彩适应变换
     * 使用 Bradford 或其他 CAT 算法
     *
     * @param source_wp 源白点 XYZ
     * @param target_wp 目标白点 XYZ
     * @param method CAT 方法
     * @return LittleCMS 变换句柄
     */
    cmsHTRANSFORM createChromaticAdaptationTransform(
        const ColorXYZ &source_wp,
        const ColorXYZ &target_wp,
        WhiteBalanceConfig::CATMethod method)
    {

        // 转换到 LittleCMS 的 xyY 格式
        cmsCIExyY source_xyY, target_xyY;
        ChromaticityXY source_xy = source_wp.toXY();
        ChromaticityXY target_xy = target_wp.toXY();

        source_xyY.x = source_xy.x;
        source_xyY.y = source_xy.y;
        source_xyY.Y = source_wp.Y;

        target_xyY.x = target_xy.x;
        target_xyY.y = target_xy.y;
        target_xyY.Y = target_wp.Y;

        // 创建线性 RGB 配置文件（使用 sRGB 原色）
        cmsCIExyYTRIPLE srgb_primaries;
        srgb_primaries.Red.x = 0.6400;
        srgb_primaries.Red.y = 0.3300;
        srgb_primaries.Red.Y = 1.0;
        srgb_primaries.Green.x = 0.3000;
        srgb_primaries.Green.y = 0.6000;
        srgb_primaries.Green.Y = 1.0;
        srgb_primaries.Blue.x = 0.1500;
        srgb_primaries.Blue.y = 0.0600;
        srgb_primaries.Blue.Y = 1.0;

        // 线性传输曲线
        cmsToneCurve *linear_curve = cmsBuildGamma(nullptr, 1.0);
        cmsToneCurve *linear_rgb[3] = {linear_curve, linear_curve, linear_curve};

        // 创建源和目标配置文件
        cmsHPROFILE source_profile = cmsCreateRGBProfile(&source_xyY, &srgb_primaries, linear_rgb);
        cmsHPROFILE target_profile = cmsCreateRGBProfile(&target_xyY, &srgb_primaries, linear_rgb);

        // 设置适应算法
        cmsUInt32Number adaptation_state = 1; // 完全适应
        switch (method)
        {
        case WhiteBalanceConfig::BRADFORD:
            cmsSetAdaptationState(adaptation_state);
            break;
        case WhiteBalanceConfig::CAT02:
            // LittleCMS 默认使用 Bradford，CAT02 需要特殊处理
            // 这里简化处理，实际应用中可能需要自定义插件
            cmsSetAdaptationState(adaptation_state);
            break;
        case WhiteBalanceConfig::VON_KRIES:
            // von Kries 是最简单的对角矩阵变换
            cmsSetAdaptationState(adaptation_state);
            break;
        }

        // 创建变换
        cmsHTRANSFORM transform = cmsCreateTransform(
            source_profile, TYPE_RGB_FLT,
            target_profile, TYPE_RGB_FLT,
            INTENT_ABSOLUTE_COLORIMETRIC, // 使用绝对色度以保持白点
            cmsFLAGS_NOOPTIMIZE           // 不优化，保持精度
        );

        // 清理
        cmsFreeToneCurve(linear_curve);
        cmsCloseProfile(source_profile);
        cmsCloseProfile(target_profile);

        return transform;
    }

    /**
     * @brief 应用白点变换到图像
     *
     * @param input 输入图像（线性 RGB，浮点）
     * @param transform LittleCMS 变换
     * @return 变换后的图像
     */
    cv::Mat applyWhitePointTransform(const cv::Mat &input, cmsHTRANSFORM transform)
    {
        CV_Assert(input.type() == CV_32FC3);

        cv::Mat output(input.size(), CV_32FC3);

        // LittleCMS 期望的是连续内存布局
        if (input.isContinuous() && output.isContinuous())
        {
            // 直接变换整个图像
            cmsDoTransform(transform,
                           input.ptr<float>(),
                           output.ptr<float>(),
                           static_cast<cmsUInt32Number>(input.total()));
        }
        else
        {
            // 逐行变换
            for (int y = 0; y < input.rows; ++y)
            {
                const float *src_row = input.ptr<float>(y);
                float *dst_row = output.ptr<float>(y);
                cmsDoTransform(transform,
                               const_cast<float *>(src_row),
                               dst_row,
                               static_cast<cmsUInt32Number>(input.cols));
            }
        }

        return output;
    }

    // ========== 主处理流程 ==========

    /**
     * @brief 处理 RAW 文件并应用白点白平衡
     */
    class WhitePointProcessor
    {
    private:
        WhiteBalanceConfig config_;
        std::unique_ptr<LibRaw> processor_;

    public:
        explicit WhitePointProcessor(const WhiteBalanceConfig &config)
            : config_(config), processor_(std::make_unique<LibRaw>())
        {
        }

        bool process()
        {
            // 1. 打开和解包 RAW 文件
            if (!loadRawFile())
                return false;

            // 2. 获取源白点
            ChromaticityXY source_xy = getSourceWhitePoint();
            double source_kelvin = xyToKelvin(source_xy); // 在外部作用域声明

            if (config_.verbose)
            {
                std::cout << "\n========== 白平衡信息 ==========\n";
                std::cout << "📷 源白点（相机捕获）:\n";
                std::cout << "   xy坐标: (" << std::fixed << std::setprecision(4)
                          << source_xy.x << ", " << source_xy.y << ")\n";
                std::cout << "   物理色温: " << std::fixed << std::setprecision(0)
                          << source_kelvin << "K\n";
                double source_duv = calculateDuv(source_xy);
                std::cout << "   Duv: " << std::fixed << std::setprecision(4) << source_duv << "\n";
                std::cout << "   " << (source_kelvin < 4000 ? "🔥 暖光场景" : source_kelvin < 6000 ? "☀️ 中性光"
                                                                                                   : "❄️ 冷光场景")
                          << "\n\n";
            }

            // 3. 确定目标白点
            ChromaticityXY target_xy = getTargetWhitePoint();
            if (config_.verbose)
            {
                double target_kelvin = xyToKelvin(target_xy);
                double target_duv = calculateDuv(target_xy);
                std::cout << "🎯 目标白点（补偿后）:\n";
                std::cout << "   xy坐标: (" << std::fixed << std::setprecision(4)
                          << target_xy.x << ", " << target_xy.y << ")\n";
                std::cout << "   目标色温: " << std::fixed << std::setprecision(0)
                          << target_kelvin << "K\n";

                if (std::abs(target_duv) > 0.0001)
                {
                    std::cout << "   色调(Duv): " << std::fixed << std::setprecision(4)
                              << target_duv;
                    if (target_duv > 0)
                    {
                        std::cout << " (洋红偏移)";
                    }
                    else
                    {
                        std::cout << " (绿色偏移)";
                    }
                    std::cout << "\n";
                }

                // 显示补偿方向
                std::cout << "\n💡 补偿说明:\n";
                if (source_kelvin < target_kelvin)
                {
                    std::cout << "   场景偏暖(" << source_kelvin << "K) → 加冷色补偿 → ";
                }
                else if (source_kelvin > target_kelvin)
                {
                    std::cout << "   场景偏冷(" << source_kelvin << "K) → 加暖色补偿 → ";
                }
                else
                {
                    std::cout << "   场景中性 → 无需补偿 → ";
                }
                std::cout << "目标(" << target_kelvin << "K)\n";
                std::cout << "==================================\n\n";
            }

            // 4. 处理图像到线性 RGB
            cv::Mat linear_rgb = processToLinearRGB();
            if (linear_rgb.empty())
                return false;

            // 5. 创建并应用色彩适应变换
            ColorXYZ source_wp = ColorXYZ::fromXY(source_xy);
            ColorXYZ target_wp = ColorXYZ::fromXY(target_xy);

            cmsHTRANSFORM cat_transform = createChromaticAdaptationTransform(
                source_wp, target_wp, config_.cat_method);

            cv::Mat adapted_rgb = applyWhitePointTransform(linear_rgb, cat_transform);
            cmsDeleteTransform(cat_transform);

            // 6. 应用 sRGB 色调映射曲线
            cv::Mat srgb_encoded = applyGammaEncoding(adapted_rgb);

            // 7. 保存结果
            return saveOutput(srgb_encoded, linear_rgb);
        }

    private:
        bool loadRawFile()
        {
            int ret = processor_->open_file(config_.input_path.c_str());
            if (ret != LIBRAW_SUCCESS)
            {
                std::cerr << "错误：无法打开 RAW 文件: " << libraw_strerror(ret) << std::endl;
                return false;
            }

            // 配置 LibRaw 参数
            auto &params = processor_->imgdata.params;
            params.output_bps = config_.output_bps;
            params.no_auto_bright = 1; // 不自动调整亮度
            params.gamm[0] = 1.0;      // 线性输出
            params.gamm[1] = 1.0;
            params.output_color = 1;  // sRGB 色彩空间
            params.use_camera_wb = 0; // 暂不应用白平衡
            params.use_auto_wb = 0;

            // 解包
            ret = processor_->unpack();
            if (ret != LIBRAW_SUCCESS)
            {
                std::cerr << "错误：解包失败: " << libraw_strerror(ret) << std::endl;
                return false;
            }

            return true;
        }

        ChromaticityXY getSourceWhitePoint()
        {
            // 根据模式获取源白点
            switch (config_.mode)
            {
            case WhiteBalanceConfig::CAMERA_WB:
                // 基于相机记录的白平衡系数与相机矩阵估算白点
                return estimateWhitePointFromCoefficients(*processor_);

            case WhiteBalanceConfig::AUTO_WB:
                // 简化：当前不在估计阶段调用自动 WB 处理，退化为使用相机白平衡估计
                return estimateWhitePointFromCoefficients(*processor_);

            default:
                // 假设源为 D65（未调整）
                return kelvinToXY(ILLUMINANT_D65);
            }
        }

        ChromaticityXY getTargetWhitePoint()
        {
            switch (config_.mode)
            {
            case WhiteBalanceConfig::MANUAL_KELVIN:
                // 直接使用传入的 Duv 作为色调偏移（正=绿色，负=洋红）
                return applyDuvToKelvin(config_.target_kelvin, config_.target_duv);

            case WhiteBalanceConfig::MANUAL_XY:
                return config_.target_xy;

            default:
                // 默认目标为 D65
                return kelvinToXY(ILLUMINANT_D65);
            }
        }

        cv::Mat processToLinearRGB()
        {
            // 让 LibRaw 处理去马赛克等操作
            int ret = processor_->dcraw_process();
            if (ret != LIBRAW_SUCCESS)
            {
                std::cerr << "错误：处理失败: " << libraw_strerror(ret) << std::endl;
                return cv::Mat();
            }

            // 获取处理后的图像
            int err = 0;
            libraw_processed_image_t *img = processor_->dcraw_make_mem_image(&err);
            if (!img || err != LIBRAW_SUCCESS)
            {
                std::cerr << "错误：创建内存图像失败" << std::endl;
                if (img)
                    LibRaw::dcraw_clear_mem(img);
                return cv::Mat();
            }

            // 转换到 OpenCV Mat
            cv::Mat linear;
            if (img->colors != 3 || (img->bits != 8 && img->bits != 16))
            {
                std::cerr << "错误：不支持的图像格式" << std::endl;
                LibRaw::dcraw_clear_mem(img);
                return cv::Mat();
            }

            if (img->bits == 16)
            {
                cv::Mat temp(img->height, img->width, CV_16UC3, img->data);
                // 保持为 RGB 顺序，方便直接传给 LCMS（TYPE_RGB_FLT）
                cv::Mat rgb = temp.clone();
                rgb.convertTo(linear, CV_32FC3, 1.0 / 65535.0);
            }
            else
            {
                cv::Mat temp(img->height, img->width, CV_8UC3, img->data);
                cv::Mat rgb = temp.clone();
                rgb.convertTo(linear, CV_32FC3, 1.0 / 255.0);
            }

            LibRaw::dcraw_clear_mem(img);
            return linear;
        }

        cv::Mat applyGammaEncoding(const cv::Mat &linear_rgb)
        {
            // 将线性 sRGB（原色为 sRGB，TRC=1.0）编码为标准 sRGB OETF
            cmsCIExyYTRIPLE srgb_primaries;
            srgb_primaries.Red.x = 0.6400;
            srgb_primaries.Red.y = 0.3300;
            srgb_primaries.Red.Y = 1.0;
            srgb_primaries.Green.x = 0.3000;
            srgb_primaries.Green.y = 0.6000;
            srgb_primaries.Green.Y = 1.0;
            srgb_primaries.Blue.x = 0.1500;
            srgb_primaries.Blue.y = 0.0600;
            srgb_primaries.Blue.Y = 1.0;

            // 使用 D65 白点（与 sRGB 一致）
            cmsCIExyY d65;
            d65.x = 0.31271;
            d65.y = 0.32902;
            d65.Y = 1.0;

            cmsToneCurve *linear_curve = cmsBuildGamma(nullptr, 1.0);
            // 避免与函数参数名 linear_rgb 冲突，使用不同变量名
            cmsToneCurve *linear_trc[3] = {linear_curve, linear_curve, linear_curve};

            cmsHPROFILE linear_srgb_profile = cmsCreateRGBProfile(&d65, &srgb_primaries, linear_trc);
            cmsHPROFILE srgb_profile = cmsCreate_sRGBProfile();

            cmsHTRANSFORM gamma_transform = cmsCreateTransform(
                linear_srgb_profile, TYPE_RGB_FLT,
                srgb_profile, TYPE_RGB_FLT,
                INTENT_PERCEPTUAL, 0);

            cv::Mat encoded = applyWhitePointTransform(linear_rgb, gamma_transform);

            cmsDeleteTransform(gamma_transform);
            cmsFreeToneCurve(linear_curve);
            cmsCloseProfile(linear_srgb_profile);
            cmsCloseProfile(srgb_profile);
            return encoded;
        }

        bool saveOutput(const cv::Mat &srgb, const cv::Mat &linear)
        {
            // 裁剪到 [0,1] 范围
            cv::Mat clipped;
            cv::min(srgb, 1.0, clipped);
            cv::max(clipped, 0.0, clipped);

            // 转换到 8 位，并从 RGB 转回 BGR 以匹配 OpenCV 保存
            cv::Mat rgb_u8;
            clipped.convertTo(rgb_u8, CV_8UC3, 255.0);
            cv::Mat bgr_u8;
            cv::cvtColor(rgb_u8, bgr_u8, cv::COLOR_RGB2BGR);

            // 保存 JPEG
            std::vector<int> jpeg_params = {cv::IMWRITE_JPEG_QUALITY, config_.jpeg_quality};
            bool success = cv::imwrite(config_.output_path, bgr_u8, jpeg_params);

            if (!success)
            {
                std::cerr << "错误：保存 JPEG 失败: " << config_.output_path << std::endl;
                return false;
            }

            std::cout << "✓ 已保存: " << config_.output_path << std::endl;

            // 可选：保存线性输出
            if (config_.save_linear)
            {
                std::string linear_path = config_.output_path + ".linear.tiff";
                cv::Mat linear_u16;
                linear.convertTo(linear_u16, CV_16UC3, 65535.0);
                cv::imwrite(linear_path, linear_u16);
                std::cout << "✓ 线性输出: " << linear_path << std::endl;
            }

            return true;
        }
    };

} // namespace WhitePointWB

// ========== 主函数 ==========

void printUsage(const char *prog)
{
    std::cout << "\n基于白点的白平衡调节工具\n\n";
    std::cout << "用法: " << prog << " [选项] <RAW文件>\n\n";
    std::cout << "选项:\n";
    std::cout << "  --out <path>          输出 JPEG 路径\n";
    std::cout << "  --mode <mode>         白平衡模式:\n";
    std::cout << "                        camera  - 使用相机白平衡（默认）\n";
    std::cout << "                        auto    - 自动白平衡\n";
    std::cout << "                        kelvin  - 指定色温和色调\n";
    std::cout << "                        xy      - 指定 CIE xy 坐标\n";
    std::cout << "  --kelvin <K>          目标色温（2000-12000K）\n";
    std::cout << "  --duv <duv>          Duv 色调偏移（-0.05 到 +0.05；正=绿色）\n";
    std::cout << "  --xy <x,y>            目标白点 xy 坐标\n";
    std::cout << "  --cat <method>        CAT 方法: bradford|cat02|vonkries\n";
    std::cout << "  --quality <1-100>     JPEG 质量（默认 95）\n";
    std::cout << "  --save-linear         同时保存线性 TIFF\n";
    std::cout << "  --verbose             详细输出\n";
    std::cout << "  --help                显示帮助\n\n";
    std::cout << "示例:\n";
    std::cout << "  " << prog << " --mode kelvin --kelvin 5500 --duv -0.01 input.raw\n";
    std::cout << "  " << prog << " --mode xy --xy 0.3127,0.3290 input.raw\n\n";
}

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        printUsage(argv[0]);
        return 1;
    }

    WhitePointWB::WhiteBalanceConfig config;
    std::vector<std::string> positional;

    // 解析命令行参数
    for (int i = 1; i < argc; ++i)
    {
        std::string arg = argv[i];

        if (arg == "--help")
        {
            printUsage(argv[0]);
            return 0;
        }
        else if (arg == "--out" && i + 1 < argc)
        {
            config.output_path = argv[++i];
        }
        else if (arg == "--mode" && i + 1 < argc)
        {
            std::string mode = argv[++i];
            if (mode == "camera")
                config.mode = WhitePointWB::WhiteBalanceConfig::CAMERA_WB;
            else if (mode == "auto")
                config.mode = WhitePointWB::WhiteBalanceConfig::AUTO_WB;
            else if (mode == "kelvin")
                config.mode = WhitePointWB::WhiteBalanceConfig::MANUAL_KELVIN;
            else if (mode == "xy")
                config.mode = WhitePointWB::WhiteBalanceConfig::MANUAL_XY;
        }
        else if (arg == "--kelvin" && i + 1 < argc)
        {
            config.target_kelvin = std::atof(argv[++i]);
        }
        else if (arg == "--duv" && i + 1 < argc)
        {
            config.target_duv = std::atof(argv[++i]);
        }
        else if (arg == "--xy" && i + 1 < argc)
        {
            std::string xy_str = argv[++i];
            size_t comma = xy_str.find(',');
            if (comma != std::string::npos)
            {
                config.target_xy.x = std::atof(xy_str.substr(0, comma).c_str());
                config.target_xy.y = std::atof(xy_str.substr(comma + 1).c_str());
            }
        }
        else if (arg == "--cat" && i + 1 < argc)
        {
            std::string cat = argv[++i];
            if (cat == "bradford")
                config.cat_method = WhitePointWB::WhiteBalanceConfig::BRADFORD;
            else if (cat == "cat02")
                config.cat_method = WhitePointWB::WhiteBalanceConfig::CAT02;
            else if (cat == "vonkries")
                config.cat_method = WhitePointWB::WhiteBalanceConfig::VON_KRIES;
        }
        else if (arg == "--quality" && i + 1 < argc)
        {
            config.jpeg_quality = std::atoi(argv[++i]);
        }
        else if (arg == "--save-linear")
        {
            config.save_linear = true;
        }
        else if (arg == "--verbose")
        {
            config.verbose = true;
        }
        else if (arg[0] != '-')
        {
            positional.push_back(arg);
        }
    }

    if (positional.empty())
    {
        std::cerr << "错误：请指定输入 RAW 文件\n";
        return 1;
    }

    config.input_path = positional[0];
    if (config.output_path.empty())
    {
        config.output_path = config.input_path + "_whitepoint.jpg";
    }

    // 执行处理
    WhitePointWB::WhitePointProcessor processor(config);
    return processor.process() ? 0 : 1;
}
