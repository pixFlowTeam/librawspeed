#ifndef WB_GAINS_H
#define WB_GAINS_H

#include <opencv2/core.hpp>
#include <algorithm>

namespace wb
{

    // 白平衡增益结构
    struct WhiteBalanceGains
    {
        double red_gain;
        double green_gain;
        double blue_gain;

        // 构造函数
        WhiteBalanceGains(double r = 1.0, double g = 1.0, double b = 1.0)
            : red_gain(r), green_gain(g), blue_gain(b) {}

        // 归一化到绿色通道为 1.0
        void normalizeToGreen()
        {
            if (green_gain > 1e-9)
            {
                red_gain /= green_gain;
                blue_gain /= green_gain;
                green_gain = 1.0;
            }
        }

        // 归一化使平均增益为 1.0（保持亮度）
        void normalizeAverage()
        {
            double avg = (red_gain + green_gain + blue_gain) / 3.0;
            if (avg > 1e-9)
            {
                red_gain /= avg;
                green_gain /= avg;
                blue_gain /= avg;
            }
        }

        // 限制增益范围
        void clampGains(double min_gain = 0.1, double max_gain = 10.0)
        {
            red_gain = std::max(min_gain, std::min(max_gain, red_gain));
            green_gain = std::max(min_gain, std::min(max_gain, green_gain));
            blue_gain = std::max(min_gain, std::min(max_gain, blue_gain));
        }
    };

    // 应用白平衡增益到图像
    inline cv::Mat applyGains(const cv::Mat &image, const WhiteBalanceGains &gains)
    {
        CV_Assert(image.type() == CV_32FC3);

        std::vector<cv::Mat> channels;
        cv::split(image, channels);

        // OpenCV 通道顺序：B, G, R
        // 使用 multiply 函数避免类型问题
        cv::multiply(channels[0], cv::Scalar(gains.blue_gain), channels[0]);
        cv::multiply(channels[1], cv::Scalar(gains.green_gain), channels[1]);
        cv::multiply(channels[2], cv::Scalar(gains.red_gain), channels[2]);

        cv::Mat result;
        cv::merge(channels, result);
        return result;
    }

    // 从色温和色调计算白平衡增益
    // 模拟调色软件的行为：色温是对光源的补偿
    inline WhiteBalanceGains gainsFromKelvinTint(double kelvin, double tint = 0.0)
    {
        WhiteBalanceGains gains;

        // 将色温限制在合理范围
        // 2000K 到 12000K
        kelvin = std::max(2000.0, std::min(12000.0, kelvin));

        // 调色软件的色温逻辑：补偿光源色温
        // 低色温设置 = 补偿暖光 = 图像变冷（增加蓝，减少红）
        // 高色温设置 = 补偿冷光 = 图像变暖（增加红，减少蓝）
        if (kelvin < 6500.0)
        {
            // 低色温设置 (2000K - 6500K) → 补偿暖光 → 图像变冷
            double factor = (6500.0 - kelvin) / 4500.0; // 0 到 1
            gains.red_gain = 1.0 - factor * 0.4;        // 减少红色
            gains.green_gain = 1.0;
            gains.blue_gain = 1.0 + factor * 0.5; // 增加蓝色
        }
        else
        {
            // 高色温设置 (6500K - 12000K) → 补偿冷光 → 图像变暖
            double factor = (kelvin - 6500.0) / 5500.0; // 0 到 1
            gains.red_gain = 1.0 + factor * 0.5;        // 增加红色
            gains.green_gain = 1.0;
            gains.blue_gain = 1.0 - factor * 0.4; // 减少蓝色
        }

        // 应用 Tint（色调）调整
        // Tint 正值：偏洋红（减少绿色，轻微增加红蓝）
        // Tint 负值：偏绿（增加绿色，轻微减少红蓝）
        if (std::abs(tint) > 1e-6)
        {
            double tint_factor = tint / 100.0; // 归一化 tint 值

            if (tint > 0)
            {
                // 偏洋红
                gains.green_gain *= std::exp(-tint_factor * 0.2);
                gains.red_gain *= 1.0 + tint_factor * 0.05;
                gains.blue_gain *= 1.0 + tint_factor * 0.05;
            }
            else
            {
                // 偏绿
                gains.green_gain *= std::exp(-tint_factor * 0.2);
                gains.red_gain *= 1.0 + tint_factor * 0.05;
                gains.blue_gain *= 1.0 + tint_factor * 0.05;
            }
        }

        // 归一化以保持整体亮度
        gains.normalizeAverage();

        return gains;
    }

} // namespace wb

#endif // WB_GAINS_H
