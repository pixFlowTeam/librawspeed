/**
 * @file color_temperature.cpp
 * @brief 色温转换和白点计算工具库实现
 *
 * @author Fuguo Qiang
 * @date 2025
 */

#include "color_temperature.h"
#include <cstring>

namespace ColorTemp
{
    /*
     * ========================= 白平衡与白点相关概念速记 =========================
     *
     * 1) 相关色温 CCT (Correlated Color Temperature)
     *    - 表示在 CIE 色度图上某点到黑体辐射轨迹的“沿轨迹方向”的投影所对应的温度（K）。
     *    - 我们的 kelvinToXY/xyToKelvin 实现用于在黑体轨迹附近进行近似换算。
     *
     * 2) Duv（Delta uv）
     *    - 在 CIE 1960 UCS (u,v) 空间中，该点到黑体轨迹的“垂直距离”，带符号。
     *    - 行业口径（本库采用）：Duv > 0 表示偏绿色，Duv < 0 表示偏洋红。
     *    - 这是“色调偏移”的物理量度，与 CCT 正交。
     *
     * 3) UI 标度（如需）
     *    - 某些软件会提供自定义的 UI 标度（非物理量）。本库不内置该标度，仅暴露 Kelvin 与 Duv；
     *
     * 4) 场景白点 vs 目标白点
     *    - 场景白点（Scene Illuminant）：相机拍摄时光源的白点（由 RAW 的白平衡系数 cam_mul 推导）。
     *    - 目标白点（Target White Point）：渲染时希望图像呈现的白点（UI 上的 K/Duv 参数所代表的目标）。
     *    - 白平衡的本质是“把图像从源白点适应到目标白点”（CAT）。
     *
     * 5) 本库的核心流程
     *    - 估计场景白点：使用 cam_mul 的倒数作为场景 RGB 相对强度，并用相机矩阵 cam_xyz 将其映射至 XYZ 再归一得到 xy。
     *    - 色彩适应（CAT）：用 Bradford（或 CAT02 等）在线性空间中从源白点变换到目标白点。
     *    - 编码：线性 sRGB → sRGB OETF（或其他输出空间）。
     *
     * 6) 与 Lightroom/Capture One 的数值差异
     *    - 他家 UI 标度是各自引擎/配置相关的数值，观感可一致，但数值不必然一致。
     *    - 若需对齐他家读数，可在外部加载相机 Profile、做双光源插值与少量标定拟合（可选模块），本库核心保持物理 K/Duv。
     */

    // ========== ColorXYZ 方法实现 ==========

    ChromaticityXY ColorXYZ::toXY() const
    {
        double sum = X + Y + Z;
        if (sum < EPSILON)
            return ChromaticityXY(0.3127, 0.3290); // D65 默认
        return ChromaticityXY(X / sum, Y / sum);
    }

    ColorXYZ ColorXYZ::fromXY(const ChromaticityXY &xy, double Y)
    {
        if (std::abs(xy.y) < EPSILON)
            return ColorXYZ(0, 0, 0);
        double X = (xy.x * Y) / xy.y;
        double Z = ((1.0 - xy.x - xy.y) * Y) / xy.y;
        return ColorXYZ(X, Y, Z);
    }

    // ========== 主要转换函数实现 ==========

    ChromaticityXY kelvinToXY(double kelvin)
    {
        // 限制范围
        kelvin = std::max(1000.0, std::min(25000.0, kelvin));

        double x, y;
        double T = kelvin;

        // CIE 推荐的分段公式
        if (T >= 1667.0 && T < 4000.0)
        {
            // 低色温范围
            x = -0.2661239 * (1e9 / (T * T * T)) - 0.2343589 * (1e6 / (T * T)) + 0.8776956 * (1e3 / T) + 0.179910;
        }
        else if (T >= 4000.0 && T <= 25000.0)
        {
            // 高色温范围
            x = -3.0258469 * (1e9 / (T * T * T)) + 2.1070379 * (1e6 / (T * T)) + 0.2226347 * (1e3 / T) + 0.240390;
        }
        else
        {
            // 超出范围，使用端点值
            if (T < 1667.0)
            {
                x = 0.5268; // 1667K 的值
            }
            else
            {
                x = 0.2526; // 25000K 的值
            }
        }

        // 计算 y 坐标
        double x2 = x * x;
        double x3 = x2 * x;

        if (T >= 1667.0 && T < 2222.0)
        {
            y = -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683;
        }
        else if (T >= 2222.0 && T < 4000.0)
        {
            y = -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867;
        }
        else if (T >= 4000.0)
        {
            y = 3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483;
        }
        else
        {
            y = 0.4; // 默认值
        }

        return ChromaticityXY(x, y);
    }

    double xyToKelvin(const ChromaticityXY &xy)
    {
        // McCamy 逆变换公式
        double n = (xy.x - 0.3320) / (0.1858 - xy.y);
        double cct = 449.0 * n * n * n + 3525.0 * n * n + 6823.3 * n + 5520.33;

        return std::max(1000.0, std::min(25000.0, cct));
    }

    double calculateDuv(const ChromaticityXY &xy)
    {
        // 首先找到最接近的色温
        double cct = xyToKelvin(xy);
        ChromaticityXY blackbody = kelvinToXY(cct);

        // 转换到 CIE 1960 UCS (u, v)
        auto [u_actual, v_actual] = xyToUV(xy);
        auto [u_bb, v_bb] = xyToUV(blackbody);

        // 计算 Duv（带符号的距离）
        double duv = std::sqrt((u_actual - u_bb) * (u_actual - u_bb) +
                               (v_actual - v_bb) * (v_actual - v_bb));

        // 确定符号（使用相对 v 位置判断点在轨迹的哪一侧）
        // 简化：v_actual > v_bb 表示在上方（通常更偏洋红）。
        // 行业口径：Duv > 0 = 偏绿，Duv < 0 = 偏洋红。
        if (v_actual > v_bb)
            duv = -duv;

        return duv;
    }

    ChromaticityXY applyDuvToKelvin(double kelvin, double duv)
    {
        ChromaticityXY base = kelvinToXY(kelvin);

        if (std::abs(duv) < EPSILON)
            return base;

        // 转换到 CIE 1960 UCS
        auto [u, v] = xyToUV(base);

        // 计算黑体轨迹在此点的切线方向
        // 使用数值微分
        double delta_k = 10.0; // 小的温度变化
        ChromaticityXY next = kelvinToXY(kelvin + delta_k);
        auto [u_next, v_next] = xyToUV(next);

        // 切线向量
        double du = u_next - u;
        double dv = v_next - v;
        double mag = std::sqrt(du * du + dv * dv);

        if (mag < EPSILON)
            return base;

        // 垂直向量（逆时针旋转90度）
        double perp_u = -dv / mag;
        double perp_v = du / mag;

        // 应用偏移
        u += perp_u * duv;
        v += perp_v * duv;

        // 转换回 xy
        return uvToXY(u, v);
    }

    ChromaticityXY getStandardIlluminant(const char *illuminant)
    {
        if (std::strcmp(illuminant, "A") == 0)
        {
            return ChromaticityXY(0.44757, 0.40745); // 2856K 钨丝灯
        }
        else if (std::strcmp(illuminant, "D50") == 0)
        {
            return ChromaticityXY(0.34567, 0.35851); // 5003K
        }
        else if (std::strcmp(illuminant, "D55") == 0)
        {
            return ChromaticityXY(0.33242, 0.34743); // 5503K
        }
        else if (std::strcmp(illuminant, "D65") == 0)
        {
            return ChromaticityXY(0.31271, 0.32902); // 6504K
        }
        else if (std::strcmp(illuminant, "D75") == 0)
        {
            return ChromaticityXY(0.29902, 0.31485); // 7504K
        }
        else if (std::strcmp(illuminant, "E") == 0)
        {
            return ChromaticityXY(1.0 / 3.0, 1.0 / 3.0); // 等能白点
        }
        else
        {
            // 默认返回 D65
            return ChromaticityXY(0.31271, 0.32902);
        }
    }

    ColorTemperatureInfo estimateFromMultipliers(float r_mul, float g_mul, float b_mul)
    {
        ColorTemperatureInfo info;

        // 归一化到绿色通道
        if (g_mul <= 0)
            g_mul = 1.0f;
        float r_norm = r_mul / g_mul;
        float b_norm = b_mul / g_mul;

        // 方法1：基于 R/B 比例的经验公式
        double rb_ratio = r_norm / b_norm;

        // 根据 R/B 比例估算色温
        if (rb_ratio > 1.0)
        {
            // 暖色（R > B）
            info.kelvin = 5500.0 / std::pow(rb_ratio, 1.5);
        }
        else
        {
            // 冷色（B > R）
            info.kelvin = 5500.0 * std::pow(1.0 / rb_ratio, 0.8);
        }

        // 限制范围
        info.kelvin = std::max(2000.0, std::min(12000.0, info.kelvin));
        info.scene_illuminant_K = info.kelvin;

        // 计算对应的 xy
        info.xy = kelvinToXY(info.kelvin);

        // 估算色调（简化方法）
        // 如果 R 和 B 都偏离 G，表示有色调偏移
        double rg_diff = r_norm - 1.0;
        double bg_diff = b_norm - 1.0;

        if ((rg_diff > 0 && bg_diff > 0) || (rg_diff < 0 && bg_diff < 0))
        {
            // R 和 B 同向偏移
            info.duv = (rg_diff + bg_diff) / 40.0; // 经验缩放因子
            info.duv = std::max(-0.05, std::min(0.05, info.duv));
        }
        else
        {
            info.duv = 0.0;
        }

        return info;
    }

    ChromaticityXY estimateWhitePointXYFromCamMulAndMatrix(const float cam_mul[4], const float cam_xyz[4][3])
    {
        // 读取并校正系数
        // 取两路绿色的平均作为 G
        float g1 = cam_mul[1] > 0.0f ? cam_mul[1] : 1.0f;
        float g2 = cam_mul[3] > 0.0f ? cam_mul[3] : g1;
        float g_avg = (g1 + g2) * 0.5f;
        float coeffs[3] = {cam_mul[0], g_avg, cam_mul[2]};
        for (int i = 0; i < 3; ++i)
        {
            if (coeffs[i] <= 0.0f)
            {
                coeffs[i] = 1.0f;
            }
        }

        // 归一化到绿色通道
        float green_norm = coeffs[1];
        if (green_norm <= 0.0f)
        {
            green_norm = 1.0f;
        }
        for (int i = 0; i < 3; ++i)
        {
            coeffs[i] /= green_norm;
        }

        // 系数的倒数代表场景 RGB 相对强度
        double scene_rgb[3];
        scene_rgb[0] = 1.0 / static_cast<double>(coeffs[0]);
        scene_rgb[1] = 1.0 / static_cast<double>(coeffs[1]);
        scene_rgb[2] = 1.0 / static_cast<double>(coeffs[2]);

        // 使用相机矩阵将场景 RGB 转到 XYZ（使用矩阵前 3 行）
        double X = 0.0, Y = 0.0, Z = 0.0;
        for (int i = 0; i < 3; ++i)
        {
            X += static_cast<double>(cam_xyz[i][0]) * scene_rgb[i];
            Y += static_cast<double>(cam_xyz[i][1]) * scene_rgb[i];
            Z += static_cast<double>(cam_xyz[i][2]) * scene_rgb[i];
        }

        // 物理上 XYZ 不应为负，做最小裁剪
        X = std::max(X, EPSILON);
        Y = std::max(Y, EPSILON);
        Z = std::max(Z, EPSILON);

        // 归一化使 Y=1，然后转换到 xy
        if (Y > EPSILON)
        {
            X /= Y;
            Z /= Y;
            Y = 1.0;
        }

        double sum = X + Y + Z;
        if (sum <= EPSILON)
        {
            return getStandardIlluminant("D65");
        }

        ChromaticityXY xy;
        xy.x = X / sum;
        xy.y = Y / sum;
        // 若不在合理范围，回退到接近的黑体点
        if (!isValidWhitePoint(xy))
        {
            double cct = std::max(2000.0, std::min(12000.0, xyToKelvin(xy)));
            return kelvinToXY(cct);
        }
        return xy;
    }

    void calculateRGBGains(double source_kelvin, double target_kelvin,
                           double source_duv, double target_duv,
                           float &r_gain, float &g_gain, float &b_gain)
    {
        // 获取源和目标白点
        ChromaticityXY source_xy = applyDuvToKelvin(source_kelvin, source_duv);
        ChromaticityXY target_xy = applyDuvToKelvin(target_kelvin, target_duv);

        // 简化的 RGB 增益计算
        // 这是一个近似方法，精确计算需要完整的色彩矩阵

        // 基于色温的 R/B 比例调整
        double source_rb = std::pow(5500.0 / source_kelvin, 0.7);
        double target_rb = std::pow(5500.0 / target_kelvin, 0.7);

        // 计算增益
        r_gain = static_cast<float>(target_rb / source_rb);
        g_gain = 1.0f;
        b_gain = static_cast<float>(source_rb / target_rb);

        // 应用色调调整
        double duv_diff = target_duv - source_duv;
        if (std::abs(duv_diff) > EPSILON)
        {
            // 色调主要影响 R 和 B 的相对关系
            float duv_factor = static_cast<float>(1.0 + duv_diff * 0.01);
            r_gain *= duv_factor;
            b_gain *= duv_factor;
        }

        // 归一化，保持亮度
        float max_gain = std::max({r_gain, g_gain, b_gain});
        if (max_gain > 0)
        {
            r_gain /= max_gain;
            g_gain /= max_gain;
            b_gain /= max_gain;
        }
    }

    // ========== 辅助函数实现 ==========

    std::pair<double, double> xyToUV(const ChromaticityXY &xy)
    {
        double denom = -2.0 * xy.x + 12.0 * xy.y + 3.0;
        if (std::abs(denom) < EPSILON)
            return {0.0, 0.0};
        double u = 4.0 * xy.x / denom;
        double v = 6.0 * xy.y / denom;
        return {u, v};
    }

    ChromaticityXY uvToXY(double u, double v)
    {
        double denom = 2.0 * u - 8.0 * v + 4.0;
        if (std::abs(denom) < EPSILON)
            return ChromaticityXY();
        double x = 3.0 * u / denom;
        double y = 2.0 * v / denom;
        return ChromaticityXY(x, y);
    }

    const char *getTemperatureDescription(double kelvin)
    {
        if (kelvin < 2500)
        {
            return "🕯️ 烛光/火焰（极暖）";
        }
        else if (kelvin < 3200)
        {
            return "💡 钨丝灯（暖）";
        }
        else if (kelvin < 4000)
        {
            return "🏠 室内暖白/卤素";
        }
        else if (kelvin < 5000)
        {
            return "💡 冷白/荧光";
        }
        else if (kelvin < 5500)
        {
            return "📷 日光 D50–D55";
        }
        else if (kelvin < 6500)
        {
            return "🌞 日光 D65/正午";
        }
        else if (kelvin < 7500)
        {
            return "☁️ 阴天 D75（偏冷）";
        }
        else if (kelvin < 9000)
        {
            return "🌫️ 阴影/蓝调（较冷）";
        }
        else
        {
            return "🔵 雪地/高山/蓝时刻（极冷）";
        }
    }

    bool isValidWhitePoint(const ChromaticityXY &xy)
    {
        // 检查是否在合理的白点范围内
        // 粗略检查：x 和 y 都应该在 0.2 到 0.5 之间
        if (xy.x < 0.2 || xy.x > 0.5)
            return false;
        if (xy.y < 0.2 || xy.y > 0.5)
            return false;

        // 检查是否接近黑体轨迹
        double duv = calculateDuv(xy);
        if (std::abs(duv) > 0.1)
            return false; // 偏离太远

        return true;
    }

} // namespace ColorTemp
