#include <iostream>
#include <string>
#include <vector>
#include <cstdio>
#include <cstdlib>

#include <libraw/libraw.h>
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>

#include "wb_color_space.h"
#include "wb_temperature.h"
#include "wb_gains.h"
#include "wb_algorithms.h"
#include "wb_algorithms_opencv.h"

// 白平衡计算工具 - 重构版

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
        std::string output_decoded;
        std::string output_balanced;

        WbMode wb_mode = WbMode::Camera;
        float user_mul[4] = {1.0f, 1.0f, 1.0f, 1.0f};

        double kelvin = 0.0;
        double tint_ui = 0.0;
        double tint_scale = 1000.0;
        bool tint_provided = false;

        std::string algorithm = "grayworld";
        wb::algorithms::AlgorithmConfig algo_config;
        wb::algorithms_opencv::OpenCVAlgorithmConfig opencv_config;
        bool use_opencv = false;
    };

    void configureLibRaw(LibRaw &proc, const ProgramConfig &config)
    {
        proc.imgdata.params.gamm[0] = 1.0f;
        proc.imgdata.params.gamm[1] = 1.0f;
        proc.imgdata.params.no_auto_bright = 1;
        proc.imgdata.params.output_bps = 16;

        for (int i = 0; i < 4; ++i)
        {
            proc.imgdata.params.user_mul[i] = 0.0f;
        }

        proc.imgdata.params.use_camera_wb = 0;
        proc.imgdata.params.use_auto_wb = 0;

        switch (config.wb_mode)
        {
        case WbMode::Camera:
            proc.imgdata.params.use_camera_wb = 1;
            break;
        case WbMode::Auto:
            proc.imgdata.params.use_auto_wb = 1;
            break;
        case WbMode::None:
            for (int i = 0; i < 4; ++i)
            {
                proc.imgdata.params.user_mul[i] = 1.0f;
            }
            break;
        case WbMode::User:
            for (int i = 0; i < 4; ++i)
            {
                proc.imgdata.params.user_mul[i] = config.user_mul[i];
            }
            break;
        }
    }

    cv::Mat createMatFromLibRaw(const libraw_processed_image_t *img)
    {
        if (!img)
            return cv::Mat();

        int width = img->width;
        int height = img->height;
        int channels = img->colors;

        if (channels != 3)
        {
            std::cerr << "只支持 3 通道 RGB 输出\n";
            return cv::Mat();
        }

        cv::Mat result;
        if (img->bits == 16)
        {
            cv::Mat rgb(height, width, CV_16UC3,
                        const_cast<void *>(static_cast<const void *>(img->data)));
            cv::Mat bgr;
            cv::cvtColor(rgb.clone(), bgr, cv::COLOR_RGB2BGR);
            bgr.convertTo(result, CV_32FC3, 1.0 / 65535.0);
        }
        else if (img->bits == 8)
        {
            cv::Mat rgb(height, width, CV_8UC3,
                        const_cast<void *>(static_cast<const void *>(img->data)));
            cv::Mat bgr;
            cv::cvtColor(rgb.clone(), bgr, cv::COLOR_RGB2BGR);
            bgr.convertTo(result, CV_32FC3, 1.0 / 255.0);
        }
        else
        {
            std::cerr << "不支持的位深度: " << img->bits << "\n";
            return cv::Mat();
        }

        return result;
    }

    cv::Mat linearToSrgb(const cv::Mat &linear)
    {
        CV_Assert(linear.type() == CV_32FC3);

        cv::Mat result = linear.clone();

        // 限制到 [0, 1]
        cv::threshold(result, result, 0.0, 0.0, cv::THRESH_TOZERO);
        cv::threshold(result, result, 1.0, 1.0, cv::THRESH_TRUNC);

        std::vector<cv::Mat> channels;
        cv::split(result, channels);

        for (auto &ch : channels)
        {
            // 创建掩码
            cv::Mat low_mask, high_mask;
            cv::compare(ch, 0.0031308f, low_mask, cv::CMP_LE);
            cv::compare(ch, 0.0031308f, high_mask, cv::CMP_GT);

            // 转换掩码类型为 CV_32F
            low_mask.convertTo(low_mask, CV_32F, 1.0 / 255.0);
            high_mask.convertTo(high_mask, CV_32F, 1.0 / 255.0);

            // 计算低值和高值结果
            cv::Mat low_result, high_result, pow_result;
            cv::multiply(ch, cv::Scalar(12.92f), low_result);
            cv::pow(ch, 1.0 / 2.4, pow_result);
            high_result = 1.055f * pow_result - 0.055f;

            // 合并结果
            ch = low_result.mul(low_mask) + high_result.mul(high_mask);
        }

        cv::merge(channels, result);
        return result;
    }

    bool saveImage(const cv::Mat &image, const std::string &path)
    {
        if (image.empty() || image.type() != CV_32FC3)
        {
            return false;
        }

        cv::Mat srgb = linearToSrgb(image);
        cv::Mat u8;
        srgb.convertTo(u8, CV_8UC3, 255.0);

        return cv::imwrite(path, u8);
    }

    bool parseArguments(int argc, char **argv, ProgramConfig &config)
    {
        std::vector<std::string> positional;

        for (int i = 1; i < argc; ++i)
        {
            std::string arg = argv[i];

            if (arg == "--wb" && i + 1 < argc)
            {
                std::string val = argv[++i];
                if (val == "camera")
                {
                    config.wb_mode = WbMode::Camera;
                }
                else if (val == "auto")
                {
                    config.wb_mode = WbMode::Auto;
                }
                else if (val == "none")
                {
                    config.wb_mode = WbMode::None;
                }
                else if (val.substr(0, 5) == "user:")
                {
                    config.wb_mode = WbMode::User;
                    std::string nums = val.substr(5);
                    double r, g1, b, g2;
                    if (std::sscanf(nums.c_str(), "%lf,%lf,%lf,%lf", &r, &g1, &b, &g2) == 4)
                    {
                        config.user_mul[0] = static_cast<float>(r);
                        config.user_mul[1] = static_cast<float>(g1);
                        config.user_mul[2] = static_cast<float>(b);
                        config.user_mul[3] = static_cast<float>(g2);
                    }
                }
            }
            else if (arg == "--kelvin" && i + 1 < argc)
            {
                config.kelvin = std::atof(argv[++i]);
            }
            else if (arg == "--tint" && i + 1 < argc)
            {
                config.tint_ui = std::atof(argv[++i]);
                config.tint_provided = true;
            }
            else if (arg == "--algorithm" && i + 1 < argc)
            {
                config.algorithm = argv[++i];
            }
            else if (arg == "--use-opencv")
            {
                config.use_opencv = true;
            }
            else if (arg == "--opencv-p" && i + 1 < argc)
            {
                config.opencv_config.p = std::atof(argv[++i]);
            }
            else if (arg == "--opencv-saturation" && i + 1 < argc)
            {
                config.opencv_config.saturation_threshold = std::atof(argv[++i]);
            }
            else if (arg == "--out-decoded" && i + 1 < argc)
            {
                config.output_decoded = argv[++i];
            }
            else if (arg == "--out-balanced" && i + 1 < argc)
            {
                config.output_balanced = argv[++i];
            }
            else if (arg == "--help" || arg == "-h")
            {
                return false;
            }
            else if (arg[0] != '-')
            {
                positional.push_back(arg);
            }
        }

        if (positional.empty())
        {
            return false;
        }

        config.input_path = positional[0];
        return true;
    }

    void printUsage(const char *program)
    {
        std::cout << "用法: " << program << " [选项] <RAW文件路径>\n\n";
        std::cout << "选项:\n";
        std::cout << "  --wb <mode>           白平衡模式: camera|auto|none|user:R,G,B,G2\n";
        std::cout << "  --kelvin <K>          色温（开尔文）\n";
        std::cout << "  --tint <T>            色调（正值偏洋红，负值偏绿）\n";
        std::cout << "  --algorithm <name>    算法: grayworld|whitepoint|perfect|simple|combined|learning\n";
        std::cout << "  --use-opencv          使用 OpenCV 的内置算法（而非自定义实现）\n";
        std::cout << "  --opencv-p <value>    OpenCV SimpleWB 的百分位参数（默认: 2.0）\n";
        std::cout << "  --opencv-saturation <value>  OpenCV GrayWorld 的饱和度阈值（默认: 0.98）\n";
        std::cout << "  --out-decoded <path>  保存解码后的图像\n";
        std::cout << "  --out-balanced <path> 保存白平衡后的图像\n";
        std::cout << "  --help, -h            显示帮助信息\n";
    }

} // namespace

int main(int argc, char **argv)
{
    ProgramConfig config;

    if (!parseArguments(argc, argv, config))
    {
        printUsage(argv[0]);
        return 1;
    }

    LibRaw processor;

    int ret = processor.open_file(config.input_path.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "无法打开文件: " << libraw_strerror(ret) << "\n";
        return 1;
    }

    configureLibRaw(processor, config);

    ret = processor.unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "解包失败: " << libraw_strerror(ret) << "\n";
        processor.recycle();
        return 1;
    }

    ret = processor.dcraw_process();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "处理失败: " << libraw_strerror(ret) << "\n";
        processor.recycle();
        return 1;
    }

    libraw_processed_image_t *image = processor.dcraw_make_mem_image(&ret);
    if (!image || ret != LIBRAW_SUCCESS)
    {
        std::cerr << "无法创建图像: " << libraw_strerror(ret) << "\n";
        if (image)
            LibRaw::dcraw_clear_mem(image);
        processor.recycle();
        return 1;
    }

    cv::Mat linear_image = createMatFromLibRaw(image);
    LibRaw::dcraw_clear_mem(image);

    if (linear_image.empty())
    {
        std::cerr << "图像转换失败\n";
        processor.recycle();
        return 1;
    }

    wb::WhiteBalanceGains gains;
    cv::Mat balanced_image;

    if (config.use_opencv)
    {
        // 使用 OpenCV 的内置算法
        std::cout << "使用 OpenCV 内置算法: " << config.algorithm << "\n";

        if (config.algorithm == "grayworld")
        {
            gains = wb::algorithms_opencv::computeGrayWorldOpenCV(linear_image, config.opencv_config);
            balanced_image = wb::applyGains(linear_image, gains);
        }
        else if (config.algorithm == "simple")
        {
            gains = wb::algorithms_opencv::computeSimpleWBOpenCV(linear_image, config.opencv_config);
            balanced_image = wb::applyGains(linear_image, gains);
        }
        else if (config.algorithm == "learning")
        {
            gains = wb::algorithms_opencv::computeLearningBasedWBOpenCV(linear_image);
            balanced_image = wb::applyGains(linear_image, gains);
        }
        else
        {
            // 对于其他算法，直接应用 OpenCV 白平衡
            balanced_image = wb::algorithms_opencv::applyOpenCVWhiteBalance(linear_image, config.algorithm, config.opencv_config);
            // 计算增益用于显示
            gains = wb::algorithms_opencv::computeGainsFromBalanced(linear_image, balanced_image);
        }
    }
    else
    {
        // 使用自定义算法
        std::cout << "使用自定义算法: " << config.algorithm << "\n";

        if (config.algorithm == "grayworld")
        {
            gains = wb::algorithms::computeGrayWorld(linear_image, config.algo_config);
        }
        else if (config.algorithm == "whitepoint")
        {
            gains = wb::algorithms::computeWhitePoint(linear_image, config.algo_config);
        }
        else if (config.algorithm == "perfect")
        {
            gains = wb::algorithms::computePerfectReflector(linear_image, config.algo_config);
        }
        else if (config.algorithm == "simple")
        {
            gains = wb::algorithms::computeSimpleWB(linear_image);
        }
        else if (config.algorithm == "combined")
        {
            gains = wb::algorithms::computeCombined(linear_image, config.algo_config);
        }
        else
        {
            std::cerr << "未知算法: " << config.algorithm << "\n";
            processor.recycle();
            return 1;
        }

        balanced_image = wb::applyGains(linear_image, gains);
    }

    // 如果指定了色温或色调，应用额外的调整
    if (config.kelvin > 0.0 || config.tint_provided)
    {
        wb::WhiteBalanceGains temp_gains = wb::gainsFromKelvinTint(config.kelvin, config.tint_ui);
        balanced_image = wb::applyGains(balanced_image, temp_gains);
        std::cout << "应用色温调整: " << config.kelvin << " K";
        if (config.tint_provided)
        {
            std::cout << ", 色调: " << config.tint_ui;
        }
        std::cout << "\n";
        std::cout << "色温增益: R=" << temp_gains.red_gain
                  << ", G=" << temp_gains.green_gain
                  << ", B=" << temp_gains.blue_gain << "\n";
    }

    cv::Scalar mean_before = cv::mean(linear_image);
    cv::Scalar mean_after = cv::mean(balanced_image);

    wb::temperature::ColorTemperature temp = wb::temperature::estimateFromLinearSrgb(
        mean_before[2], mean_before[1], mean_before[0]);

    std::cout << "文件: " << config.input_path << "\n";
    std::cout << "算法: " << config.algorithm << "\n";
    std::cout << "白平衡增益: R=" << gains.red_gain
              << ", G=" << gains.green_gain
              << ", B=" << gains.blue_gain << "\n";
    std::cout << "平衡前 RGB 均值: R=" << mean_before[2]
              << ", G=" << mean_before[1]
              << ", B=" << mean_before[0] << "\n";
    std::cout << "平衡后 RGB 均值: R=" << mean_after[2]
              << ", G=" << mean_after[1]
              << ", B=" << mean_after[0] << "\n";
    std::cout << "估算色温: " << temp.cct_kelvin << " K\n";
    std::cout << "色调偏移 (duv): " << temp.duv << "\n";

    if (!config.output_decoded.empty())
    {
        if (saveImage(linear_image, config.output_decoded))
        {
            std::cout << "已保存解码图像: " << config.output_decoded << "\n";
        }
        else
        {
            std::cerr << "保存解码图像失败\n";
        }
    }

    if (!config.output_balanced.empty())
    {
        if (saveImage(balanced_image, config.output_balanced))
        {
            std::cout << "已保存白平衡图像: " << config.output_balanced << "\n";
        }
        else
        {
            std::cerr << "保存白平衡图像失败\n";
        }
    }

    processor.recycle();
    return 0;
}
