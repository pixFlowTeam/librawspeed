#ifndef WB_ALGORITHMS_H
#define WB_ALGORITHMS_H

#include "wb_gains.h"
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <vector>

namespace wb {
namespace algorithms {

// 白平衡算法配置
struct AlgorithmConfig {
    // 灰世界算法参数
    float highlight_threshold = 0.98f;  // 高光阈值
    float shadow_threshold = 0.02f;     // 阴影阈值
    
    // 白点检测参数
    float white_percentile = 0.95f;     // 白点百分位
    float white_saturation_max = 0.05f; // 最大饱和度
    
    // 完美反射算法参数
    int patch_size = 32;                // 分块大小
    float reflectance_threshold = 0.9f; // 反射率阈值
};

// 灰世界算法（改进版）
inline WhiteBalanceGains computeGrayWorld(const cv::Mat& image, 
                                          const AlgorithmConfig& config = AlgorithmConfig()) {
    CV_Assert(image.type() == CV_32FC3);
    
    // 创建掩膜：排除过曝和过暗区域
    std::vector<cv::Mat> channels;
    cv::split(image, channels);
    
    // 计算最大和最小通道值
    cv::Mat max_channel, min_channel;
    cv::max(channels[0], channels[1], max_channel);
    cv::max(max_channel, channels[2], max_channel);
    cv::min(channels[0], channels[1], min_channel);
    cv::min(min_channel, channels[2], min_channel);
    
    // 创建有效像素掩膜
    cv::Mat mask = (max_channel < config.highlight_threshold) & 
                   (min_channel > config.shadow_threshold);
    
    // 额外排除高饱和度区域（可能是彩色物体）
    cv::Mat saturation;
    cv::Mat range = max_channel - min_channel;
    cv::Mat valid_max = max_channel.clone();
    valid_max.setTo(1.0, max_channel < 1e-6);  // 避免除零
    saturation = range / valid_max;
    mask = mask & (saturation < 0.8f);  // 排除饱和度大于80%的像素
    
    // 计算掩膜下的平均值
    cv::Scalar mean_values = cv::mean(image, mask);
    
    // OpenCV 通道顺序：B, G, R
    double b_mean = std::max(1e-6, mean_values[0]);
    double g_mean = std::max(1e-6, mean_values[1]);
    double r_mean = std::max(1e-6, mean_values[2]);
    
    // 以绿色为基准计算增益
    WhiteBalanceGains gains;
    gains.green_gain = 1.0;
    gains.red_gain = g_mean / r_mean;
    gains.blue_gain = g_mean / b_mean;
    
    // 限制增益范围，避免极端值
    gains.clampGains(0.2, 5.0);
    
    return gains;
}

// 白点检测算法
inline WhiteBalanceGains computeWhitePoint(const cv::Mat& image,
                                           const AlgorithmConfig& config = AlgorithmConfig()) {
    CV_Assert(image.type() == CV_32FC3);
    
    std::vector<cv::Mat> channels;
    cv::split(image, channels);
    
    // 计算亮度（简单平均）
    cv::Mat luminance = (channels[0] + channels[1] + channels[2]) / 3.0f;
    
    // 找到亮度的高百分位值
    std::vector<float> lum_values;
    luminance.reshape(1, 1).copyTo(lum_values);
    std::sort(lum_values.begin(), lum_values.end());
    int percentile_idx = static_cast<int>(lum_values.size() * config.white_percentile);
    float lum_threshold = lum_values[percentile_idx];
    
    // 创建白点候选掩膜
    cv::Mat white_mask = luminance >= lum_threshold;
    
    // 计算饱和度并过滤
    cv::Mat max_channel, min_channel;
    cv::max(channels[0], channels[1], max_channel);
    cv::max(max_channel, channels[2], max_channel);
    cv::min(channels[0], channels[1], min_channel);
    cv::min(min_channel, channels[2], min_channel);
    
    cv::Mat saturation = (max_channel - min_channel) / (max_channel + 1e-6f);
    white_mask = white_mask & (saturation < config.white_saturation_max);
    
    // 计算白点区域的平均值
    cv::Scalar white_mean = cv::mean(image, white_mask);
    
    // 假设白点应该是中性的，计算增益
    double b_white = std::max(1e-6, white_mean[0]);
    double g_white = std::max(1e-6, white_mean[1]);
    double r_white = std::max(1e-6, white_mean[2]);
    
    // 计算使白点变为中性灰的增益
    double target = (r_white + g_white + b_white) / 3.0;
    
    WhiteBalanceGains gains;
    gains.red_gain = target / r_white;
    gains.green_gain = target / g_white;
    gains.blue_gain = target / b_white;
    
    // 归一化到绿色通道
    gains.normalizeToGreen();
    gains.clampGains(0.2, 5.0);
    
    return gains;
}

// 简单白平衡算法（基于百分位）
inline WhiteBalanceGains computeSimpleWB(const cv::Mat& image, float p = 0.5f) {
    CV_Assert(image.type() == CV_32FC3);
    CV_Assert(p >= 0.0f && p <= 100.0f);
    
    std::vector<cv::Mat> channels;
    cv::split(image, channels);
    
    WhiteBalanceGains gains;
    
    // 对每个通道独立处理
    for (int i = 0; i < 3; ++i) {
        // 将通道展平并排序
        std::vector<float> values;
        channels[i].reshape(1, 1).copyTo(values);
        std::sort(values.begin(), values.end());
        
        // 找到百分位点
        int low_idx = static_cast<int>(values.size() * (p / 100.0f));
        int high_idx = static_cast<int>(values.size() * (1.0f - p / 100.0f));
        
        float low_val = values[low_idx];
        float high_val = values[high_idx];
        
        // 计算缩放因子使范围映射到 [0, 1]
        float scale = 1.0f / (high_val - low_val + 1e-6f);
        
        // OpenCV 通道顺序：B, G, R
        if (i == 0) gains.blue_gain = scale;
        else if (i == 1) gains.green_gain = scale;
        else gains.red_gain = scale;
    }
    
    // 归一化
    gains.normalizeToGreen();
    gains.clampGains(0.2, 5.0);
    
    return gains;
}

// 完美反射算法（基于局部最亮点）
inline WhiteBalanceGains computePerfectReflector(const cv::Mat& image,
                                                 const AlgorithmConfig& config = AlgorithmConfig()) {
    CV_Assert(image.type() == CV_32FC3);
    
    int patch_size = config.patch_size;
    int rows = image.rows;
    int cols = image.cols;
    
    std::vector<cv::Vec3f> bright_patches;
    
    // 将图像分块
    for (int y = 0; y < rows - patch_size; y += patch_size / 2) {
        for (int x = 0; x < cols - patch_size; x += patch_size / 2) {
            cv::Rect roi(x, y, 
                        std::min(patch_size, cols - x),
                        std::min(patch_size, rows - y));
            cv::Mat patch = image(roi);
            
            // 计算块的平均亮度
            cv::Scalar mean_val = cv::mean(patch);
            float luminance = (mean_val[0] + mean_val[1] + mean_val[2]) / 3.0f;
            
            // 如果亮度足够高，认为可能是完美反射
            if (luminance > config.reflectance_threshold) {
                bright_patches.push_back(cv::Vec3f(mean_val[0], mean_val[1], mean_val[2]));
            }
        }
    }
    
    // 如果没有找到亮块，回退到灰世界算法
    if (bright_patches.empty()) {
        return computeGrayWorld(image, config);
    }
    
    // 计算所有亮块的平均值
    cv::Vec3f avg_bright(0, 0, 0);
    for (const auto& patch : bright_patches) {
        avg_bright += patch;
    }
    avg_bright /= static_cast<float>(bright_patches.size());
    
    // 计算增益
    double target = (avg_bright[0] + avg_bright[1] + avg_bright[2]) / 3.0;
    
    WhiteBalanceGains gains;
    gains.blue_gain = target / std::max(1e-6f, avg_bright[0]);
    gains.green_gain = target / std::max(1e-6f, avg_bright[1]);
    gains.red_gain = target / std::max(1e-6f, avg_bright[2]);
    
    gains.normalizeToGreen();
    gains.clampGains(0.2, 5.0);
    
    return gains;
}

// 组合算法：结合多种算法的结果
inline WhiteBalanceGains computeCombined(const cv::Mat& image,
                                         const AlgorithmConfig& config = AlgorithmConfig()) {
    // 计算各种算法的结果
    WhiteBalanceGains gray_world = computeGrayWorld(image, config);
    WhiteBalanceGains white_point = computeWhitePoint(image, config);
    WhiteBalanceGains perfect_reflector = computePerfectReflector(image, config);
    
    // 加权平均（可以根据场景自适应调整权重）
    WhiteBalanceGains combined;
    combined.red_gain = (gray_world.red_gain * 0.4 + 
                         white_point.red_gain * 0.3 + 
                         perfect_reflector.red_gain * 0.3);
    combined.green_gain = 1.0;
    combined.blue_gain = (gray_world.blue_gain * 0.4 + 
                          white_point.blue_gain * 0.3 + 
                          perfect_reflector.blue_gain * 0.3);
    
    combined.clampGains(0.2, 5.0);
    
    return combined;
}

} // namespace algorithms
} // namespace wb

#endif // WB_ALGORITHMS_H
