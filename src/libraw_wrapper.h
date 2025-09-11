#ifndef LIBRAW_WRAPPER_H
#define LIBRAW_WRAPPER_H

#include <napi.h>
#include <string>
#include <memory>
#include "libraw.h"

class LibRawWrapper : public Napi::ObjectWrap<LibRawWrapper>
{
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    LibRawWrapper(const Napi::CallbackInfo &info);
    ~LibRawWrapper();

private:
    static Napi::FunctionReference constructor;

    // 文件操作
    Napi::Value LoadFile(const Napi::CallbackInfo &info);
    Napi::Value LoadBuffer(const Napi::CallbackInfo &info);
    Napi::Value Close(const Napi::CallbackInfo &info);

    // 元数据和信息
    Napi::Value GetMetadata(const Napi::CallbackInfo &info);
    Napi::Value GetImageSize(const Napi::CallbackInfo &info);
    Napi::Value GetAdvancedMetadata(const Napi::CallbackInfo &info);
    Napi::Value GetLensInfo(const Napi::CallbackInfo &info);
    Napi::Value GetColorInfo(const Napi::CallbackInfo &info);

    // 图像处理
    Napi::Value UnpackThumbnail(const Napi::CallbackInfo &info);
    Napi::Value ProcessImage(const Napi::CallbackInfo &info);
    Napi::Value SubtractBlack(const Napi::CallbackInfo &info);
    Napi::Value Raw2Image(const Napi::CallbackInfo &info);
    Napi::Value AdjustMaximum(const Napi::CallbackInfo &info);

    // 内存图像创建
    Napi::Value CreateMemoryImage(const Napi::CallbackInfo &info);
    Napi::Value CreateMemoryThumbnail(const Napi::CallbackInfo &info);

    // 文件写入器
    Napi::Value WritePPM(const Napi::CallbackInfo &info);
    Napi::Value WriteTIFF(const Napi::CallbackInfo &info);
    Napi::Value WriteThumbnail(const Napi::CallbackInfo &info);

    // 配置和设置
    Napi::Value SetOutputParams(const Napi::CallbackInfo &info);
    Napi::Value GetOutputParams(const Napi::CallbackInfo &info);

    // 实用函数
    Napi::Value IsFloatingPoint(const Napi::CallbackInfo &info);
    Napi::Value IsFujiRotated(const Napi::CallbackInfo &info);
    Napi::Value IsSRAW(const Napi::CallbackInfo &info);
    Napi::Value IsJPEGThumb(const Napi::CallbackInfo &info);
    Napi::Value ErrorCount(const Napi::CallbackInfo &info);

    // 错误处理
    Napi::Value GetLastError(const Napi::CallbackInfo &info);
    Napi::Value Strerror(const Napi::CallbackInfo &info);

    // 扩展实用函数
    Napi::Value IsNikonSRAW(const Napi::CallbackInfo &info);
    Napi::Value IsCoolscanNEF(const Napi::CallbackInfo &info);
    Napi::Value HaveFPData(const Napi::CallbackInfo &info);
    Napi::Value SrawMidpoint(const Napi::CallbackInfo &info);
    Napi::Value ThumbOK(const Napi::CallbackInfo &info);
    Napi::Value UnpackFunctionName(const Napi::CallbackInfo &info);
    Napi::Value GetDecoderInfo(const Napi::CallbackInfo &info);

    // 高级处理
    Napi::Value Unpack(const Napi::CallbackInfo &info);
    Napi::Value Raw2ImageEx(const Napi::CallbackInfo &info);
    Napi::Value AdjustSizesInfoOnly(const Napi::CallbackInfo &info);
    Napi::Value FreeImage(const Napi::CallbackInfo &info);
    Napi::Value ConvertFloatToInt(const Napi::CallbackInfo &info);

    // 扩展内存操作
    Napi::Value GetMemImageFormat(const Napi::CallbackInfo &info);
    Napi::Value CopyMemImage(const Napi::CallbackInfo &info);

    // 颜色操作
    Napi::Value GetColorAt(const Napi::CallbackInfo &info);

    // 取消支持
    Napi::Value SetCancelFlag(const Napi::CallbackInfo &info);
    Napi::Value ClearCancelFlag(const Napi::CallbackInfo &info);

    // 版本信息（实例方法）
    Napi::Value Version(const Napi::CallbackInfo &info);
    Napi::Value VersionNumber(const Napi::CallbackInfo &info);

    // 静态方法
    static Napi::Value GetVersion(const Napi::CallbackInfo &info);
    static Napi::Value GetCapabilities(const Napi::CallbackInfo &info);
    static Napi::Value GetCameraList(const Napi::CallbackInfo &info);
    static Napi::Value GetCameraCount(const Napi::CallbackInfo &info);

    // 辅助方法
    Napi::Object CreateImageDataObject(Napi::Env env, libraw_processed_image_t *img);
    bool CheckLoaded(Napi::Env env);

    // LibRaw 实例
    std::unique_ptr<LibRaw> processor;
    bool isLoaded;
    bool isUnpacked;
    bool isProcessed;
};

#endif // LIBRAW_WRAPPER_H
