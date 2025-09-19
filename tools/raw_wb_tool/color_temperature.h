/**
 * @file color_temperature.h
 * @brief 色温转换和白点计算工具库
 *
 * 提供色温、xy色度坐标、白点、色调(Tint/Duv)之间的相互转换
 *
 * @author Fuguo Qiang
 * @date 2025
 */

#ifndef COLOR_TEMPERATURE_H
#define COLOR_TEMPERATURE_H

#include <cmath>
#include <algorithm>
#include <utility>

namespace ColorTemp
{

    // ========== 常量定义 ==========
    constexpr double EPSILON = 1e-6;

    // 标准光源的色温
    constexpr double ILLUMINANT_A = 2856.0;   // 钨丝灯
    constexpr double ILLUMINANT_D50 = 5003.0; // 印刷标准
    constexpr double ILLUMINANT_D55 = 5503.0; // 中间日光
    constexpr double ILLUMINANT_D65 = 6504.0; // 标准日光
    constexpr double ILLUMINANT_D75 = 7504.0; // 北方日光

    // ========== 数据结构 ==========

    /**
     * @brief CIE xy 色度坐标
     */
    struct ChromaticityXY
    {
        double x;
        double y;

        ChromaticityXY(double x_ = 0.3127, double y_ = 0.3290) : x(x_), y(y_) {} // 默认 D65
    };

    /**
     * @brief CIE XYZ 三刺激值
     */
    struct ColorXYZ
    {
        double X;
        double Y;
        double Z;

        ColorXYZ(double x = 0.0, double y = 1.0, double z = 0.0) : X(x), Y(y), Z(z) {}

        // 转换到 xy 色度坐标
        ChromaticityXY toXY() const;

        // 从 xy 色度坐标创建（假设 Y=1）
        static ColorXYZ fromXY(const ChromaticityXY &xy, double Y = 1.0);
    };

    /**
     * @brief 色温和色调信息
     */
    struct ColorTemperatureInfo
    {
        double kelvin;     // 色温（K）
        double duv;        // 色调偏移（Duv）
        ChromaticityXY xy; // xy 色度坐标

        // 场景照明色温（Lightroom 风格）
        double scene_illuminant_K; // 等同于 kelvin，用于明确语义

        ColorTemperatureInfo() : kelvin(ILLUMINANT_D65), duv(0.0),
                                 xy(0.3127, 0.3290), scene_illuminant_K(ILLUMINANT_D65) {}
    };

    // ========== 主要转换函数 ==========

    /**
     * @brief 从色温计算 xy 色度坐标（使用 CIE 推荐方法）
     *
     * 基于黑体辐射的 Planck 公式和 CIE 1931 标准观察者
     * 适用范围：1000K - 25000K
     *
     * @param kelvin 色温（K）
     * @return xy 色度坐标
     */
    ChromaticityXY kelvinToXY(double kelvin);

    /**
     * @brief 从 xy 色度坐标估算最接近的色温（CCT）
     *
     * 使用 McCamy 的逆变换方法，适用于接近黑体轨迹的点
     *
     * @param xy 色度坐标
     * @return 相关色温（K）
     */
    double xyToKelvin(const ChromaticityXY &xy);

    /**
     * @brief 计算点到黑体轨迹的 Duv 距离
     *
     * Duv 是在 CIE 1960 UCS 色度图上的距离
     * 正值表示在轨迹上方（洋红），负值表示下方（绿色）
     *
     * @param xy 色度坐标
     * @return Duv 值（带符号）
     */
    double calculateDuv(const ChromaticityXY &xy);

    /**
     * @brief 应用色调偏移到色温对应的白点
     *
     * 在垂直于黑体轨迹的方向上偏移
     *
     * @param kelvin 基础色温
     * @param duv 色调偏移（正=洋红，负=绿色）
     * @return 调整后的 xy 坐标
     */
    // 将 Duv 偏移应用到指定色温对应的白点
    ChromaticityXY applyDuvToKelvin(double kelvin, double duv);

    /**
     * @brief 从 Lightroom 风格的 Tint 值转换到 Duv
     *
     * Lightroom: -150 到 +150
     * Duv: 约 -0.05 到 +0.05
     *
     * @param tint Lightroom 风格的色调值
     * @return 标准 Duv 值
     */
    // 已移除：Tint 映射改为直接使用 Duv

    /**
     * @brief 从 Duv 转换到 Lightroom 风格的 Tint 值
     *
     * @param duv 标准 Duv 值
     * @return Lightroom 风格的色调值
     */
    // 已移除：Tint 映射改为直接使用 Duv

    /**
     * @brief 获取标准光源的白点
     *
     * @param illuminant 光源名称（"D65", "D50", "A" 等）
     * @return 白点的 xy 坐标
     */
    ChromaticityXY getStandardIlluminant(const char *illuminant);

    /**
     * @brief 从白平衡系数估算色温
     *
     * 根据 RGB 通道的相对强度估算场景色温
     *
     * @param r_mul 红色通道乘数
     * @param g_mul 绿色通道乘数
     * @param b_mul 蓝色通道乘数
     * @return 估算的色温信息
     */
    ColorTemperatureInfo estimateFromMultipliers(float r_mul, float g_mul, float b_mul);

    // 已移除 Lightroom 风格接口，统一使用物理 Kelvin 与 Duv

    /**
     * @brief 使用相机白平衡系数与色彩矩阵估算场景白点 xy
     *
     * 将系数倒数视为场景 RGB 相对能量，经 cam_xyz 转到 XYZ，再归一得到 xy
     */
    ChromaticityXY estimateWhitePointXYFromCamMulAndMatrix(const float cam_mul[4], const float cam_xyz[4][3]);

    /**
     * @brief 计算从源白点到目标白点的 RGB 增益
     *
     * 用于简单的通道缩放白平衡
     *
     * @param source_kelvin 源色温
     * @param target_kelvin 目标色温
     * @param source_tint 源色调（可选）
     * @param target_tint 目标色调（可选）
     * @param[out] r_gain 红色通道增益
     * @param[out] g_gain 绿色通道增益
     * @param[out] b_gain 蓝色通道增益
     */
    void calculateRGBGains(double source_kelvin, double target_kelvin,
                           double source_tint, double target_tint,
                           float &r_gain, float &g_gain, float &b_gain);

    // ========== 辅助函数 ==========

    /**
     * @brief 将 xy 坐标转换到 CIE 1960 UCS (u,v)
     */
    std::pair<double, double> xyToUV(const ChromaticityXY &xy);

    /**
     * @brief 将 CIE 1960 UCS (u,v) 转换到 xy 坐标
     */
    ChromaticityXY uvToXY(double u, double v);

    /**
     * @brief 获取色温的描述性文字
     *
     * @param kelvin 色温
     * @return 描述（如 "暖光"、"中性"、"冷光"）
     */
    const char *getTemperatureDescription(double kelvin);

    /**
     * @brief 判断 xy 坐标是否在合理的白点范围内
     */
    bool isValidWhitePoint(const ChromaticityXY &xy);

} // namespace ColorTemp

#endif // COLOR_TEMPERATURE_H
