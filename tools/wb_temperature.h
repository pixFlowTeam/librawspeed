#ifndef WB_TEMPERATURE_H
#define WB_TEMPERATURE_H

#include "wb_color_space.h"
#include <cmath>

namespace wb {

// 色温和色调相关功能
namespace temperature {

// CCT 与 Tint(duv) 的结果
struct ColorTemperature {
    double cct_kelvin;  // 相关色温（开尔文）
    double duv;         // 在 u'v' 空间相对黑体/日光轨迹的距离（+偏绿 / -偏洋红）
};

// McCamy 1992：由 xy 色度坐标估计相关色温（CCT）
inline double cctFromXy_McCamy(double x, double y) {
    if (std::abs(0.1858 - y) < 1e-12) {
        return 6500.0;  // 避免除零
    }
    double n = (x - 0.3320) / (0.1858 - y);
    double cct = 449.0 * n * n * n + 3525.0 * n * n + 6823.3 * n + 5520.33;
    return color::clamp(cct, 1000.0, 40000.0);
}

// Daylight 近似：给定 CCT(K) 近似求 xy（CIE 日光轨迹近似）
// 参考: http://en.wikipedia.org/wiki/Color_temperature#Approximation
inline void xyFromCct_DaylightApprox(double cct, double& x, double& y) {
    cct = color::clamp(cct, 1667.0, 25000.0);
    
    double x_approx;
    if (cct >= 1667.0 && cct <= 4000.0) {
        // 低色温范围
        x_approx = -0.2661239e9 / (cct * cct * cct) 
                  - 0.2343580e6 / (cct * cct) 
                  + 0.8776956e3 / cct 
                  + 0.179910;
    } else {
        // 高色温范围
        x_approx = -3.0258469e9 / (cct * cct * cct) 
                  + 2.1070379e6 / (cct * cct) 
                  + 0.2226347e3 / cct 
                  + 0.240390;
    }
    
    double x2 = x_approx * x_approx;
    double x3 = x2 * x_approx;
    double y_approx = -1.1063814 * x3 - 1.34811020 * x2 
                     + 2.18555832 * x_approx - 0.20219683;
    
    x = x_approx;
    y = y_approx;
}

// Planckian 轨迹近似（更精确的黑体辐射）
inline void xyFromCct_Planckian(double cct, double& x, double& y) {
    cct = color::clamp(cct, 1000.0, 15000.0);
    
    // 使用更精确的 Planckian 轨迹公式
    double u = (0.860117757 + 1.54118254e-4 * cct + 1.28641212e-7 * cct * cct) /
               (1.0 + 8.42420235e-4 * cct + 7.08145163e-7 * cct * cct);
    
    double v = (0.317398726 + 4.22806245e-5 * cct + 4.20481691e-8 * cct * cct) /
               (1.0 - 2.89741816e-5 * cct + 1.61456053e-7 * cct * cct);
    
    // 从 uv 转换到 xy
    x = 3.0 * u / (2.0 * u - 8.0 * v + 4.0);
    y = 2.0 * v / (2.0 * u - 8.0 * v + 4.0);
}

// 计算给定色度坐标相对于黑体轨迹的 duv 距离
inline double calculateDuv(double x, double y, double cct) {
    // 获取相同 CCT 在黑体轨迹上的参考点
    double ref_x, ref_y;
    xyFromCct_DaylightApprox(cct, ref_x, ref_y);
    
    // 转换到 u'v' 空间计算距离
    double X1, Y1, Z1;
    color::xyToXyz(x, y, X1, Y1, Z1);
    double u1, v1;
    color::xyzToUvPrime(X1, Y1, Z1, u1, v1);
    
    double X2, Y2, Z2;
    color::xyToXyz(ref_x, ref_y, X2, Y2, Z2);
    double u2, v2;
    color::xyzToUvPrime(X2, Y2, Z2, u2, v2);
    
    // 计算 duv（带符号，正值表示偏绿，负值表示偏洋红）
    double duv = v1 - v2;
    return duv;
}

// 从线性 sRGB 平均值估算 CCT 与 duv
inline ColorTemperature estimateFromLinearSrgb(double avg_r, double avg_g, double avg_b) {
    // 线性 sRGB → XYZ
    double X, Y, Z;
    color::linearSrgbToXyz(avg_r, avg_g, avg_b, X, Y, Z);
    
    // XYZ → xy
    double x, y;
    color::xyzToXy(X, Y, Z, x, y);
    
    // 估算 CCT
    double cct = cctFromXy_McCamy(x, y);
    
    // 计算 duv
    double duv = calculateDuv(x, y, cct);
    
    return ColorTemperature{cct, duv};
}

// UI Tint 值转换为 duv
// 正值 = 偏洋红，负值 = 偏绿（与 duv 相反）
inline double uiTintToDuv(double tint_ui, double scale = 1000.0) {
    if (scale <= 1e-9) {
        scale = 1000.0;
    }
    return -tint_ui / scale;  // 注意符号相反
}

// duv 转换为 UI Tint 值
inline double duvToUiTint(double duv, double scale = 1000.0) {
    return -duv * scale;  // 注意符号相反
}

} // namespace temperature
} // namespace wb

#endif // WB_TEMPERATURE_H
