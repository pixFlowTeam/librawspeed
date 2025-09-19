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

        // 确定符号（使用叉积判断点在轨迹的哪一侧）
        // 简化：v_actual > v_bb 表示在上方（洋红侧）
        if (v_actual < v_bb)
            duv = -duv;

        return duv;
    }

    ChromaticityXY applyTintToKelvin(double kelvin, double duv)
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

    double tintToDuv(double tint)
    {
        // Lightroom 的 Tint 范围约为 -150 到 +150
        // 映射到 Duv 约 -0.05 到 +0.05
        return tint / 3000.0;
    }

    double duvToTint(double duv)
    {
        // Duv 转换回 Lightroom Tint
        return duv * 3000.0;
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

    LightroomWB getLightroomWBFromCameraMul(const float cam_mul[4])
    {
        LightroomWB result;

        // 使用前三个通道（R, G, B），忽略 G2
        float coeffs[3];
        coeffs[0] = cam_mul[0]; // R
        coeffs[1] = cam_mul[1]; // G
        coeffs[2] = cam_mul[2]; // B

        // 确保系数有效
        for (int i = 0; i < 3; i++)
        {
            if (coeffs[i] <= 0)
                coeffs[i] = 1.0f;
        }

        // 归一化到绿色通道
        float norm = coeffs[1];
        for (int i = 0; i < 3; i++)
        {
            coeffs[i] /= norm;
        }

        // 使用与 raw_wb_whitepoint.cpp 相同的算法
        // 系数的倒数表示实际捕获的相对强度
        float r_factor = 1.0f / coeffs[0];
        float g_factor = 1.0f / coeffs[1];
        float b_factor = 1.0f / coeffs[2];

        // 使用 R/G 和 B/G 比例估算色温
        double rg_ratio = r_factor / g_factor;
        double bg_ratio = b_factor / g_factor;

        // 经验公式：从 R/G, B/G 比例估算色温
        double estimated_kelvin = ILLUMINANT_D65;

        if (bg_ratio > 0 && rg_ratio > 0)
        {
            // 使用对数关系估算色温（与raw_wb_whitepoint完全一致）
            double log_ratio = std::log(bg_ratio / rg_ratio);
            estimated_kelvin = ILLUMINANT_D65 * std::exp(log_ratio * 0.3);
            estimated_kelvin = std::max(2000.0, std::min(12000.0, estimated_kelvin));
        }

        // 将估算的色温转换到xy坐标
        ChromaticityXY white_point = kelvinToXY(estimated_kelvin);

        // 从xy坐标重新计算色温（确保一致性）
        result.temperature = xyToKelvin(white_point);

        // 计算色调（基于绿色通道的偏离）
        // 绿色通道强（rb_avg < 1） = 场景偏绿 = 负Tint
        // 绿色通道弱（rb_avg > 1） = 场景偏洋红 = 正Tint
        double rb_avg = (coeffs[0] + coeffs[2]) / 2.0;
        double green_factor = 1.0 - rb_avg;

        // 转换到Lightroom Tint范围
        result.tint = green_factor * 100.0;
        result.tint = std::max(-150.0, std::min(150.0, result.tint));

        return result;
    }

    LightroomWB getLightroomWBFromCameraMulWithMatrix(const float cam_mul[4], const float cam_xyz[4][3])
    {
        LightroomWB result;

        // 使用前三个通道（R, G, B）
        float coeffs[3];
        coeffs[0] = cam_mul[0]; // R
        coeffs[1] = cam_mul[1]; // G
        coeffs[2] = cam_mul[2]; // B

        // 确保系数有效
        for (int i = 0; i < 3; i++)
        {
            if (coeffs[i] <= 0)
                coeffs[i] = 1.0f;
        }

        // 归一化到绿色通道
        float norm = coeffs[1];
        for (int i = 0; i < 3; i++)
        {
            coeffs[i] /= norm;
        }

        // 计算场景的RGB相对强度（系数的倒数）
        float scene_rgb[3];
        scene_rgb[0] = 1.0f / coeffs[0];
        scene_rgb[1] = 1.0f / coeffs[1];
        scene_rgb[2] = 1.0f / coeffs[2];

        // 使用相机的色彩矩阵转换到XYZ
        // cam_xyz是4x3矩阵，前3行对应RGB通道
        double X = 0, Y = 0, Z = 0;
        for (int i = 0; i < 3; i++)
        {
            X += cam_xyz[i][0] * scene_rgb[i];
            Y += cam_xyz[i][1] * scene_rgb[i];
            Z += cam_xyz[i][2] * scene_rgb[i];
        }

        // 归一化XYZ（使Y=1作为参考）
        if (Y > EPSILON)
        {
            X /= Y;
            Z /= Y;
            Y = 1.0;
        }

        // 转换到xy色度坐标
        double xyz_sum = X + Y + Z;
        ChromaticityXY white_point;
        if (xyz_sum > EPSILON)
        {
            white_point.x = X / xyz_sum;
            white_point.y = Y / xyz_sum;
        }
        else
        {
            white_point = getStandardIlluminant("D65");
        }

        // 计算色温和色调
        result.temperature = xyToKelvin(white_point);
        double duv = calculateDuv(white_point);
        result.tint = duvToTint(duv);

        return result;
    }

    void calculateRGBGains(double source_kelvin, double target_kelvin,
                           double source_tint, double target_tint,
                           float &r_gain, float &g_gain, float &b_gain)
    {
        // 获取源和目标白点
        ChromaticityXY source_xy = applyTintToKelvin(source_kelvin, source_tint);
        ChromaticityXY target_xy = applyTintToKelvin(target_kelvin, target_tint);

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
        double tint_diff = target_tint - source_tint;
        if (std::abs(tint_diff) > EPSILON)
        {
            // 色调主要影响 R 和 B 的相对关系
            float tint_factor = static_cast<float>(1.0 + tint_diff * 0.01);
            r_gain *= tint_factor;
            b_gain *= tint_factor;
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
            return "🕯️ 烛光（极暖）";
        }
        else if (kelvin < 3000)
        {
            return "💡 钨丝灯（暖）";
        }
        else if (kelvin < 3500)
        {
            return "🏠 室内暖光";
        }
        else if (kelvin < 4500)
        {
            return "🌅 日出/日落";
        }
        else if (kelvin < 5500)
        {
            return "☀️ 早晨/傍晚阳光";
        }
        else if (kelvin < 6500)
        {
            return "🌞 正午日光";
        }
        else if (kelvin < 7500)
        {
            return "☁️ 阴天";
        }
        else if (kelvin < 9000)
        {
            return "🌫️ 薄雾";
        }
        else if (kelvin < 11000)
        {
            return "🏔️ 高山/雪地";
        }
        else
        {
            return "🔵 极冷蓝光";
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
