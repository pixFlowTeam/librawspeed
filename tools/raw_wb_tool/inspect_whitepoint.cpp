#include <iostream>
#include <iomanip>
#include <string>
#include <vector>

#include <libraw.h>

/*
 * 该工具用于“检查 RAW 的场景白点”并给出“建议目标白点（默认 D65）”。
 *
 * - 场景白点（Scene）：根据 libraw 的 cam_mul（白平衡乘数）与 cam_xyz（相机矩阵）推导，代表拍摄光源（物理）。
 * - 目标白点（Target）：我们建议对齐到 D65；UI 的 Temp/Tint 表示的是“目标白点”。
 * - CCT（K）与 Duv：K 沿黑体轨迹，Duv 垂直轨迹（正=洋红，负=绿色），二者正交。
 * - Tint（LR 风格）：UI 标度，非标准物理量。默认近似 Tint ≈ Duv×3000；若需和 LR 数值更一致，可做相机级拟合映射。
 *
 * 注意：Capture One/Lightroom 的 Temp/Tint 数值标度不同，观感可一致但数值不等价。
 */

#include "color_temperature.h"

namespace
{
    struct ProgramConfig
    {
        std::string input_path;
        bool output_json = false;
        bool verbose = false;
    };

    void printUsage(const char *prog)
    {
        std::cout << "用法: " << prog << " [选项] <RAW文件>\n\n";
        std::cout << "选项:\n";
        std::cout << "  --json           以 JSON 输出\n";
        std::cout << "  --verbose        显示更多信息\n";
        std::cout << "  --help           显示帮助\n\n";
        std::cout << "示例:\n";
        std::cout << "  " << prog << " --json raw.ARW\n";
    }

    bool parseArgs(int argc, char **argv, ProgramConfig &cfg)
    {
        std::vector<std::string> positional;
        for (int i = 1; i < argc; ++i)
        {
            std::string arg = argv[i];
            if (arg == "--help")
            {
                return false;
            }
            else if (arg == "--json")
            {
                cfg.output_json = true;
            }
            else if (arg == "--verbose")
            {
                cfg.verbose = true;
            }
            else if (!arg.empty() && arg[0] != '-')
            {
                positional.push_back(arg);
            }
        }

        if (positional.empty())
            return false;

        cfg.input_path = positional[0];
        return true;
    }
}

int main(int argc, char **argv)
{
    ProgramConfig cfg;
    if (!parseArgs(argc, argv, cfg))
    {
        printUsage(argv[0]);
        return 1;
    }

    LibRaw processor;
    int ret = processor.open_file(cfg.input_path.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "无法打开 RAW 文件: " << libraw_strerror(ret) << "\n";
        return 1;
    }

    // 仅解包以获取色彩元数据（cam_mul 与 cam_xyz）
    ret = processor.unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::cerr << "解包失败: " << libraw_strerror(ret) << "\n";
        processor.recycle();
        return 1;
    }

    // 使用更严谨的矩阵法估算场景白点
    const float *cam_mul = processor.imgdata.color.cam_mul;
    const float *pre_mul = processor.imgdata.color.pre_mul;
    const float(*cam_xyz)[3] = processor.imgdata.color.cam_xyz;

    ColorTemp::ChromaticityXY source_xy = ColorTemp::estimateWhitePointXYFromCamMulAndMatrix(cam_mul, cam_xyz);
    double source_kelvin = ColorTemp::xyToKelvin(source_xy);
    double source_duv = ColorTemp::calculateDuv(source_xy);
    // 调试辅助中间量
    float g1 = cam_mul[1] > 0.0f ? cam_mul[1] : 1.0f;
    float g2 = cam_mul[3] > 0.0f ? cam_mul[3] : g1;
    float g_avg = (g1 + g2) * 0.5f;
    double cam_mul_norm[3] = {
        cam_mul[0] > 0.0f ? cam_mul[0] / g_avg : 1.0,
        1.0,
        cam_mul[2] > 0.0f ? cam_mul[2] / g_avg : 1.0};
    double scene_rgb_rel[3] = {1.0 / cam_mul_norm[0], 1.0 / cam_mul_norm[1], 1.0 / cam_mul_norm[2]};
    auto uv_scene = ColorTemp::xyToUV(source_xy);

    // 推荐校正目标：默认对齐到 D65（可扩展为参数）
    ColorTemp::ChromaticityXY target_xy = ColorTemp::getStandardIlluminant("D65");
    double target_kelvin = ColorTemp::xyToKelvin(target_xy);
    double target_duv = ColorTemp::calculateDuv(target_xy);

    // Lightroom 风格（近似）：Temp=K, Tint≈duv*3000
    double lr_scene_temp = source_kelvin;
    double lr_scene_tint = ColorTemp::duvToTint(source_duv);
    double lr_target_temp = target_kelvin;
    double lr_target_tint = ColorTemp::duvToTint(target_duv);
    // 统一一位小数显示，并以同一精度计算增量
    auto round1 = [](double v)
    { return std::round(v * 10.0) / 10.0; };
    double lr_scene_tint_d1 = round1(lr_scene_tint);
    double lr_target_tint_d1 = round1(lr_target_tint);
    double lr_delta_tint_d1 = lr_target_tint_d1 - lr_scene_tint_d1;

    if (cfg.output_json)
    {
        std::cout << std::fixed << std::setprecision(4);
        std::cout << "{\n";
        std::cout << "  \"file\": \"" << cfg.input_path << "\",\n";
        // 调试块
        std::cout << std::setprecision(6);
        std::cout << "  \"debug\": {\n";
        std::cout << "    \"cam_mul\": [" << cam_mul[0] << ", " << cam_mul[1] << ", " << cam_mul[2] << ", " << cam_mul[3] << "],\n";
        std::cout << "    \"pre_mul\": [" << pre_mul[0] << ", " << pre_mul[1] << ", " << pre_mul[2] << ", " << pre_mul[3] << "],\n";
        std::cout << "    \"cam_xyz\": [\n";
        for (int r = 0; r < 4; ++r)
        {
            std::cout << "      [" << cam_xyz[r][0] << ", " << cam_xyz[r][1] << ", " << cam_xyz[r][2] << "]" << (r < 3 ? ",\n" : "\n");
        }
        std::cout << "    ],\n";
        std::cout << "    \"cam_mul_norm\": [" << cam_mul_norm[0] << ", 1.000000, " << cam_mul_norm[2] << "],\n";
        std::cout << "    \"scene_rgb_rel\": [" << scene_rgb_rel[0] << ", " << scene_rgb_rel[1] << ", " << scene_rgb_rel[2] << "],\n";
        std::cout << std::setprecision(4);
        std::cout << "    \"scene_uv\": { \"u\": " << uv_scene.first << ", \"v\": " << uv_scene.second << " }\n";
        std::cout << "  },\n";
        std::cout << "  \"scene\": {\n";
        std::cout << "    \"xy\": { \"x\": " << source_xy.x << ", \"y\": " << source_xy.y << " },\n";
        std::cout << std::setprecision(0);
        std::cout << "    \"kelvin\": " << source_kelvin << ",\n";
        std::cout << std::setprecision(4);
        std::cout << "    \"duv\": " << source_duv << "\n";
        std::cout << "  },\n";
        std::cout << std::fixed << std::setprecision(4);
        std::cout << "  \"target\": {\n";
        std::cout << "    \"xy\": { \"x\": " << target_xy.x << ", \"y\": " << target_xy.y << " },\n";
        std::cout << std::setprecision(0);
        std::cout << "    \"kelvin\": " << target_kelvin << ",\n";
        std::cout << std::setprecision(4);
        std::cout << "    \"duv\": " << target_duv << "\n";
        std::cout << "  },\n";
        std::cout << std::setprecision(0);
        std::cout << "  \"lightroom\": {\n";
        std::cout << "    \"scene\": { \"temp\": " << lr_scene_temp << ", ";
        std::cout << std::fixed << std::setprecision(1) << "\"tint\": " << lr_scene_tint_d1 << " },\n";
        std::cout << std::setprecision(0) << "    \"target\": { \"temp\": " << lr_target_temp << ", ";
        std::cout << std::fixed << std::setprecision(1) << "\"tint\": " << lr_target_tint_d1 << " },\n";
        std::cout << "    \"delta\": { \"delta_tint\": " << lr_delta_tint_d1 << " }\n";
        std::cout << "  }\n";
        std::cout << "}\n";
    }
    else
    {
        std::cout << "文件: " << cfg.input_path << "\n";
        std::cout << "--- 调试 (cam_mul / pre_mul / cam_xyz) ---\n";
        std::cout << std::setprecision(6);
        std::cout << "cam_mul: [" << cam_mul[0] << ", " << cam_mul[1] << ", " << cam_mul[2] << ", " << cam_mul[3] << "]\n";
        std::cout << "pre_mul: [" << pre_mul[0] << ", " << pre_mul[1] << ", " << pre_mul[2] << ", " << pre_mul[3] << "]\n";
        std::cout << "cam_xyz:\n";
        for (int r = 0; r < 4; ++r)
        {
            std::cout << "  [" << cam_xyz[r][0] << ", " << cam_xyz[r][1] << ", " << cam_xyz[r][2] << "]\n";
        }
        std::cout << "cam_mul_norm (Gavg=1): [" << cam_mul_norm[0] << ", 1.000000, " << cam_mul_norm[2] << "]\n";
        std::cout << "scene_rgb_rel: [" << scene_rgb_rel[0] << ", " << scene_rgb_rel[1] << ", " << scene_rgb_rel[2] << "]\n\n";
        std::cout << "--- 场景白点 (Scene Illuminant) ---\n";
        std::cout << std::fixed << std::setprecision(4);
        std::cout << "xy: (" << source_xy.x << ", " << source_xy.y << ")\n";
        std::cout << std::setprecision(0);
        std::cout << "色温(K): " << source_kelvin << "\n";
        std::cout << std::setprecision(4);
        std::cout << "Duv: " << source_duv << "\n";
        std::cout << std::setprecision(0);
        std::cout << "LR Temp/Tint: " << lr_scene_temp << ", ";
        std::cout << std::fixed << std::setprecision(1) << lr_scene_tint_d1 << "\n\n";

        std::cout << "--- 建议目标白点 (Target, 默认D65) ---\n";
        std::cout << std::fixed << std::setprecision(4);
        std::cout << "xy: (" << target_xy.x << ", " << target_xy.y << ")\n";
        std::cout << std::setprecision(0);
        std::cout << "色温(K): " << target_kelvin << "\n";
        std::cout << std::setprecision(4);
        std::cout << "Duv: " << target_duv << "\n";
        std::cout << std::setprecision(0);
        std::cout << "LR Temp/Tint: " << lr_target_temp << ", ";
        std::cout << std::fixed << std::setprecision(1) << lr_target_tint_d1 << "\n";
        std::cout << "LR Tint Delta: " << lr_delta_tint_d1 << "\n";
        if (cfg.verbose)
        {
            const char *desc = ColorTemp::getTemperatureDescription(source_kelvin);
            std::cout << desc << "\n";
        }
    }

    processor.recycle();
    return 0;
}
