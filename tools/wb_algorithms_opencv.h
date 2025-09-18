#ifndef WB_ALGORITHMS_OPENCV_H
#define WB_ALGORITHMS_OPENCV_H

#include "wb_gains.h"
#include <opencv2/core.hpp>
#include <opencv2/xphoto.hpp>
#include <opencv2/imgproc.hpp>
#include <memory>
#include <iostream>

namespace wb
{
    namespace algorithms_opencv
    {

        // OpenCV 白平衡算法配置
        struct OpenCVAlgorithmConfig
        {
            // SimpleWB 参数
            float input_min = 0.0f;
            float input_max = 1.0f;
            float output_min = 0.0f;
            float output_max = 1.0f;
            float p = 2.0f; // 百分位参数

            // GrayWorld 参数
            float saturation_threshold = 0.98f;
        };

        // 辅助函数：从处理后的图像计算增益
        inline WhiteBalanceGains computeGainsFromBalanced(const cv::Mat &original,
                                                          const cv::Mat &balanced)
        {
            CV_Assert(original.type() == CV_32FC3);
            CV_Assert(balanced.type() == CV_32FC3);
            CV_Assert(original.size() == balanced.size());

            // 计算原始图像和平衡后图像的平均值
            cv::Scalar orig_mean = cv::mean(original);
            cv::Scalar balanced_mean = cv::mean(balanced);

            // 避免除零
            double orig_b = std::max(1e-6, orig_mean[0]);
            double orig_g = std::max(1e-6, orig_mean[1]);
            double orig_r = std::max(1e-6, orig_mean[2]);

            double bal_b = std::max(1e-6, balanced_mean[0]);
            double bal_g = std::max(1e-6, balanced_mean[1]);
            double bal_r = std::max(1e-6, balanced_mean[2]);

            // 计算增益
            WhiteBalanceGains gains;
            gains.blue_gain = bal_b / orig_b;
            gains.green_gain = bal_g / orig_g;
            gains.red_gain = bal_r / orig_r;

            // 归一化到绿色通道
            gains.normalizeToGreen();
            gains.clampGains(0.2, 5.0);

            return gains;
        }

        // 使用 OpenCV 的灰世界算法
        inline WhiteBalanceGains computeGrayWorldOpenCV(const cv::Mat &image,
                                                        const OpenCVAlgorithmConfig &config = OpenCVAlgorithmConfig())
        {
            CV_Assert(image.type() == CV_32FC3);

            try
            {
                // OpenCV xphoto 的 GrayWorld 需要 8UC3 或 16UC3 格式
                cv::Mat input_8bit;
                image.convertTo(input_8bit, CV_8UC3, 255.0);

                // 创建灰世界白平衡对象
                cv::Ptr<cv::xphoto::GrayworldWB> wb = cv::xphoto::createGrayworldWB();
                wb->setSaturationThreshold(config.saturation_threshold);

                // 应用白平衡
                cv::Mat balanced_8bit;
                wb->balanceWhite(input_8bit, balanced_8bit);

                // 转换回浮点格式
                cv::Mat balanced;
                balanced_8bit.convertTo(balanced, CV_32FC3, 1.0 / 255.0);

                // 从平衡后的图像计算增益
                return computeGainsFromBalanced(image, balanced);
            }
            catch (const cv::Exception &e)
            {
                std::cerr << "OpenCV GrayWorld 算法失败: " << e.what() << "\n";
                // 返回默认增益
                return WhiteBalanceGains();
            }
        }

        // 使用 OpenCV 的简单白平衡算法
        inline WhiteBalanceGains computeSimpleWBOpenCV(const cv::Mat &image,
                                                       const OpenCVAlgorithmConfig &config = OpenCVAlgorithmConfig())
        {
            CV_Assert(image.type() == CV_32FC3);

            try
            {
                // 创建简单白平衡对象
                cv::Ptr<cv::xphoto::SimpleWB> wb = cv::xphoto::createSimpleWB();
                wb->setInputMin(config.input_min);
                wb->setInputMax(config.input_max);
                wb->setOutputMin(config.output_min);
                wb->setOutputMax(config.output_max);
                wb->setP(config.p);

                // 应用白平衡
                cv::Mat balanced;
                wb->balanceWhite(image, balanced);

                // 从平衡后的图像计算增益
                return computeGainsFromBalanced(image, balanced);
            }
            catch (const cv::Exception &e)
            {
                std::cerr << "OpenCV SimpleWB 算法失败: " << e.what() << "\n";
                // 返回默认增益
                return WhiteBalanceGains();
            }
        }

        // 使用 OpenCV 的基于学习的白平衡算法
        inline WhiteBalanceGains computeLearningBasedWBOpenCV(const cv::Mat &image,
                                                              const std::string &model_path = "")
        {
            CV_Assert(image.type() == CV_32FC3);

            try
            {
                // OpenCV xphoto 的 LearningBasedWB 需要 8UC3 或 16UC3 格式
                cv::Mat input_8bit;
                image.convertTo(input_8bit, CV_8UC3, 255.0);

                // 创建基于学习的白平衡对象
                cv::Ptr<cv::xphoto::LearningBasedWB> wb = cv::xphoto::createLearningBasedWB();

                // 如果提供了模型路径，加载模型
                if (!model_path.empty())
                {
                    wb->setHistBinNum(256);
                    wb->setRangeMaxVal(255);
                    wb->setSaturationThreshold(0.98f);
                    // 注意：实际使用时需要提供训练好的模型文件
                    // wb->load(model_path);
                }

                // 应用白平衡
                cv::Mat balanced_8bit;
                wb->balanceWhite(input_8bit, balanced_8bit);

                // 转换回浮点格式
                cv::Mat balanced;
                balanced_8bit.convertTo(balanced, CV_32FC3, 1.0 / 255.0);

                // 从平衡后的图像计算增益
                return computeGainsFromBalanced(image, balanced);
            }
            catch (const cv::Exception &e)
            {
                std::cerr << "OpenCV LearningBasedWB 算法失败: " << e.what() << "\n";
                // 返回默认增益
                return WhiteBalanceGains();
            }
        }

        // 直接应用 OpenCV 白平衡到图像
        inline cv::Mat applyOpenCVWhiteBalance(const cv::Mat &image,
                                               const std::string &algorithm = "grayworld",
                                               const OpenCVAlgorithmConfig &config = OpenCVAlgorithmConfig())
        {
            CV_Assert(image.type() == CV_32FC3);

            cv::Mat balanced;

            try
            {
                // 某些算法需要 8UC3 或 16UC3 格式
                cv::Mat input_format;
                bool needs_conversion = (algorithm == "grayworld" || algorithm == "learning");

                if (needs_conversion)
                {
                    image.convertTo(input_format, CV_8UC3, 255.0);
                }
                else
                {
                    input_format = image;
                }

                cv::Mat output_format;

                if (algorithm == "grayworld")
                {
                    cv::Ptr<cv::xphoto::GrayworldWB> wb = cv::xphoto::createGrayworldWB();
                    wb->setSaturationThreshold(config.saturation_threshold);
                    wb->balanceWhite(input_format, output_format);
                }
                else if (algorithm == "simple")
                {
                    cv::Ptr<cv::xphoto::SimpleWB> wb = cv::xphoto::createSimpleWB();
                    wb->setP(config.p);
                    wb->balanceWhite(input_format, output_format);
                }
                else if (algorithm == "learning")
                {
                    cv::Ptr<cv::xphoto::LearningBasedWB> wb = cv::xphoto::createLearningBasedWB();
                    wb->balanceWhite(input_format, output_format);
                }
                else
                {
                    std::cerr << "未知的 OpenCV 算法: " << algorithm << "\n";
                    return image.clone();
                }

                // 如果需要，转换回浮点格式
                if (needs_conversion)
                {
                    output_format.convertTo(balanced, CV_32FC3, 1.0 / 255.0);
                }
                else
                {
                    balanced = output_format;
                }
            }
            catch (const cv::Exception &e)
            {
                std::cerr << "OpenCV 白平衡算法失败: " << e.what() << "\n";
                return image.clone();
            }

            return balanced;
        }

    } // namespace algorithms_opencv
} // namespace wb

#endif // WB_ALGORITHMS_OPENCV_H
