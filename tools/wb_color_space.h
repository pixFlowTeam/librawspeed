#ifndef WB_COLOR_SPACE_H
#define WB_COLOR_SPACE_H

#include <opencv2/core.hpp>
#include <cmath>
#include <algorithm>

namespace wb
{

    // 色彩空间转换工具函数
    namespace color
    {

        // 辅助函数：限制值范围
        template <typename T>
        inline T clamp(T value, T min_val, T max_val)
        {
            return std::max(min_val, std::min(value, max_val));
        }

        // 线性 sRGB 转 XYZ（D65）
        inline void linearSrgbToXyz(double r, double g, double b,
                                    double &X, double &Y, double &Z)
        {
            // sRGB D65 矩阵（IEC 61966-2-1:1999）
            X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
            Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
            Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
        }

        // XYZ 转线性 sRGB
        inline void xyzToLinearSrgb(double X, double Y, double Z,
                                    double &r, double &g, double &b)
        {
            r = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
            g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
            b = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
        }

        // XYZ 转 xy 色度坐标
        inline void xyzToXy(double X, double Y, double Z, double &x, double &y)
        {
            double sum = X + Y + Z;
            if (sum <= 1e-12)
            {
                x = 0.3127; // D65 默认值
                y = 0.3290;
                return;
            }
            x = X / sum;
            y = Y / sum;
        }

        // xy 转 XYZ（假设 Y=1）
        inline void xyToXyz(double x, double y, double &X, double &Y, double &Z)
        {
            if (y <= 1e-12)
            {
                X = Y = Z = 0.0;
                return;
            }
            Y = 1.0;
            X = x * (Y / y);
            Z = (1.0 - x - y) * (Y / y);
        }

        // XYZ 转 CIE u'v'（用于 tint 距离计算）
        inline void xyzToUvPrime(double X, double Y, double Z,
                                 double &u_prime, double &v_prime)
        {
            double denom = X + 15.0 * Y + 3.0 * Z;
            if (denom <= 1e-12)
            {
                u_prime = 0.0;
                v_prime = 0.0;
                return;
            }
            u_prime = (4.0 * X) / denom;
            v_prime = (9.0 * Y) / denom;
        }

        // u'v' 转 XYZ（假设 Y=1）
        inline void uvPrimeToXyz(double u_prime, double v_prime,
                                 double &X, double &Y, double &Z)
        {
            if (v_prime <= 1e-12)
            {
                X = Y = Z = 0.0;
                return;
            }
            Y = 1.0;
            X = (9.0 * u_prime) / (4.0 * v_prime) * Y;
            Z = (12.0 - 3.0 * u_prime - 20.0 * v_prime) / (4.0 * v_prime) * Y;
        }

        // 获取 sRGB 到 XYZ 的转换矩阵
        inline cv::Matx33d getSrgbToXyzMatrix()
        {
            return cv::Matx33d(
                0.4124564, 0.3575761, 0.1804375,
                0.2126729, 0.7151522, 0.0721750,
                0.0193339, 0.1191920, 0.9503041);
        }

        // 获取 XYZ 到 sRGB 的转换矩阵
        inline cv::Matx33d getXyzToSrgbMatrix()
        {
            return cv::Matx33d(
                3.2404542, -1.5371385, -0.4985314,
                -0.9692660, 1.8760108, 0.0415560,
                0.0556434, -0.2040259, 1.0572252);
        }

        // Bradford 色适应变换矩阵
        inline cv::Matx33d getBradfordMatrix()
        {
            return cv::Matx33d(
                0.8951, 0.2664, -0.1614,
                -0.7502, 1.7135, 0.0367,
                0.0389, -0.0685, 1.0296);
        }

        inline cv::Matx33d getBradfordInverseMatrix()
        {
            return cv::Matx33d(
                0.9869929, -0.1470543, 0.1599627,
                0.4323053, 0.5183603, 0.0492912,
                -0.0085287, 0.0400428, 0.9684867);
        }

    } // namespace color
} // namespace wb

#endif // WB_COLOR_SPACE_H
