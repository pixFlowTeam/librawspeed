#include "libraw_wrapper.h"
#include <iostream>
#include <sstream>
#include <vector>

Napi::FunctionReference LibRawWrapper::constructor;

Napi::Object LibRawWrapper::Init(Napi::Env env, Napi::Object exports)
{
    Napi::HandleScope scope(env);

    Napi::Function func = DefineClass(env, "LibRawWrapper", {// 文件操作
                                                             InstanceMethod("loadFile", &LibRawWrapper::LoadFile), InstanceMethod("loadBuffer", &LibRawWrapper::LoadBuffer), InstanceMethod("close", &LibRawWrapper::Close),

                                                             // 错误处理
                                                             InstanceMethod("getLastError", &LibRawWrapper::GetLastError), InstanceMethod("strerror", &LibRawWrapper::Strerror),

                                                             // 元数据和信息
                                                             InstanceMethod("getMetadata", &LibRawWrapper::GetMetadata), InstanceMethod("getImageSize", &LibRawWrapper::GetImageSize), InstanceMethod("getAdvancedMetadata", &LibRawWrapper::GetAdvancedMetadata), InstanceMethod("getLensInfo", &LibRawWrapper::GetLensInfo), InstanceMethod("getColorInfo", &LibRawWrapper::GetColorInfo),

                                                             // 图像处理
                                                             InstanceMethod("unpackThumbnail", &LibRawWrapper::UnpackThumbnail), InstanceMethod("processImage", &LibRawWrapper::ProcessImage), InstanceMethod("subtractBlack", &LibRawWrapper::SubtractBlack), InstanceMethod("raw2Image", &LibRawWrapper::Raw2Image), InstanceMethod("adjustMaximum", &LibRawWrapper::AdjustMaximum),

                                                             // 内存图像创建
                                                             InstanceMethod("createMemoryImage", &LibRawWrapper::CreateMemoryImage), InstanceMethod("createMemoryThumbnail", &LibRawWrapper::CreateMemoryThumbnail),

                                                             // 文件写入器
                                                             InstanceMethod("writePPM", &LibRawWrapper::WritePPM), InstanceMethod("writeTIFF", &LibRawWrapper::WriteTIFF), InstanceMethod("writeThumbnail", &LibRawWrapper::WriteThumbnail),

                                                             // 配置和设置
                                                             InstanceMethod("setOutputParams", &LibRawWrapper::SetOutputParams), InstanceMethod("getOutputParams", &LibRawWrapper::GetOutputParams),

                                                             // 实用函数
                                                             InstanceMethod("isFloatingPoint", &LibRawWrapper::IsFloatingPoint), InstanceMethod("isFujiRotated", &LibRawWrapper::IsFujiRotated), InstanceMethod("isSRAW", &LibRawWrapper::IsSRAW), InstanceMethod("isJPEGThumb", &LibRawWrapper::IsJPEGThumb), InstanceMethod("errorCount", &LibRawWrapper::ErrorCount),

                                                             // 扩展实用函数
                                                             InstanceMethod("isNikonSRAW", &LibRawWrapper::IsNikonSRAW), InstanceMethod("isCoolscanNEF", &LibRawWrapper::IsCoolscanNEF), InstanceMethod("haveFPData", &LibRawWrapper::HaveFPData), InstanceMethod("srawMidpoint", &LibRawWrapper::SrawMidpoint), InstanceMethod("thumbOK", &LibRawWrapper::ThumbOK), InstanceMethod("unpackFunctionName", &LibRawWrapper::UnpackFunctionName), InstanceMethod("getDecoderInfo", &LibRawWrapper::GetDecoderInfo),

                                                             // 高级处理
                                                             InstanceMethod("unpack", &LibRawWrapper::Unpack), InstanceMethod("raw2ImageEx", &LibRawWrapper::Raw2ImageEx), InstanceMethod("adjustSizesInfoOnly", &LibRawWrapper::AdjustSizesInfoOnly), InstanceMethod("freeImage", &LibRawWrapper::FreeImage), InstanceMethod("convertFloatToInt", &LibRawWrapper::ConvertFloatToInt),

                                                             // 扩展内存操作
                                                             InstanceMethod("getMemImageFormat", &LibRawWrapper::GetMemImageFormat), InstanceMethod("copyMemImage", &LibRawWrapper::CopyMemImage),

                                                             // 颜色操作
                                                             InstanceMethod("getColorAt", &LibRawWrapper::GetColorAt), InstanceMethod("getWhitepointPhysics", &LibRawWrapper::GetWhitepointPhysics),

                                                             // 取消支持
                                                             InstanceMethod("setCancelFlag", &LibRawWrapper::SetCancelFlag), InstanceMethod("clearCancelFlag", &LibRawWrapper::ClearCancelFlag),

                                                             // 版本信息（实例方法）
                                                             InstanceMethod("version", &LibRawWrapper::Version), InstanceMethod("versionNumber", &LibRawWrapper::VersionNumber),

                                                             // 静态方法
                                                             StaticMethod("getVersion", &LibRawWrapper::GetVersion), StaticMethod("getCapabilities", &LibRawWrapper::GetCapabilities), StaticMethod("getCameraList", &LibRawWrapper::GetCameraList), StaticMethod("getCameraCount", &LibRawWrapper::GetCameraCount)});

    constructor = Napi::Persistent(func);
    constructor.SuppressDestruct();

    exports.Set("LibRawWrapper", func);
    return exports;
}

LibRawWrapper::LibRawWrapper(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<LibRawWrapper>(info), isLoaded(false), isUnpacked(false), isProcessed(false)
{
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);

    processor = std::make_unique<LibRaw>();
    if (!processor)
    {
        Napi::TypeError::New(env, "Failed to initialize LibRaw").ThrowAsJavaScriptException();
    }
}

LibRawWrapper::~LibRawWrapper()
{
    if (processor && isLoaded)
    {
        processor->recycle();
    }
}

bool LibRawWrapper::CheckLoaded(Napi::Env env)
{
    if (!isLoaded)
    {
        Napi::Error::New(env, "No file loaded. Call loadFile() first.").ThrowAsJavaScriptException();
        return false;
    }
    return true;
}

// ============== 文件操作 ==============

Napi::Value LibRawWrapper::LoadFile(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();
    int ret = processor->open_file(filename.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to open file: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    ret = processor->unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to unpack file: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    isLoaded = true;
    isUnpacked = true;
    isProcessed = false;
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::LoadBuffer(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer())
    {
        Napi::TypeError::New(env, "Expected Buffer").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    int ret = processor->open_buffer(buffer.Data(), buffer.Length());
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to open buffer: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    ret = processor->unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to unpack buffer: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    isLoaded = true;
    isUnpacked = true;
    isProcessed = false;
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::Close(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (processor && isLoaded)
    {
        processor->recycle();
        isLoaded = false;
        isUnpacked = false;
        isProcessed = false;
    }

    return Napi::Boolean::New(env, true);
}

// ============== 元数据和信息 ==============

Napi::Value LibRawWrapper::GetMetadata(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    Napi::Object metadata = Napi::Object::New(env);
    // 相机信息
    if (processor->imgdata.idata.make[0])
    {
        metadata.Set("make", Napi::String::New(env, processor->imgdata.idata.make));
    }
    if (processor->imgdata.idata.model[0])
    {
        metadata.Set("model", Napi::String::New(env, processor->imgdata.idata.model));
    }
    if (processor->imgdata.idata.software[0])
    {
        metadata.Set("software", Napi::String::New(env, processor->imgdata.idata.software));
    }

    // 图像尺寸
    metadata.Set("width", Napi::Number::New(env, processor->imgdata.sizes.width));
    metadata.Set("height", Napi::Number::New(env, processor->imgdata.sizes.height));
    metadata.Set("rawWidth", Napi::Number::New(env, processor->imgdata.sizes.raw_width));
    metadata.Set("rawHeight", Napi::Number::New(env, processor->imgdata.sizes.raw_height));

    // 颜色信息
    metadata.Set("colors", Napi::Number::New(env, processor->imgdata.idata.colors));
    metadata.Set("filters", Napi::Number::New(env, processor->imgdata.idata.filters));

    // ISO 和曝光
    if (processor->imgdata.other.iso_speed > 0)
    {
        metadata.Set("iso", Napi::Number::New(env, processor->imgdata.other.iso_speed));
    }
    if (processor->imgdata.other.shutter > 0)
    {
        metadata.Set("shutterSpeed", Napi::Number::New(env, processor->imgdata.other.shutter));
    }
    if (processor->imgdata.other.aperture > 0)
    {
        metadata.Set("aperture", Napi::Number::New(env, processor->imgdata.other.aperture));
    }
    if (processor->imgdata.other.focal_len > 0)
    {
        metadata.Set("focalLength", Napi::Number::New(env, processor->imgdata.other.focal_len));
    }

    // 时间戳
    if (processor->imgdata.other.timestamp > 0)
    {
        metadata.Set("timestamp", Napi::Number::New(env, processor->imgdata.other.timestamp));
    }

    return metadata;
}

Napi::Value LibRawWrapper::GetImageSize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    Napi::Object size = Napi::Object::New(env);
    size.Set("width", Napi::Number::New(env, processor->imgdata.sizes.width));
    size.Set("height", Napi::Number::New(env, processor->imgdata.sizes.height));
    size.Set("rawWidth", Napi::Number::New(env, processor->imgdata.sizes.raw_width));
    size.Set("rawHeight", Napi::Number::New(env, processor->imgdata.sizes.raw_height));
    size.Set("topMargin", Napi::Number::New(env, processor->imgdata.sizes.top_margin));
    size.Set("leftMargin", Napi::Number::New(env, processor->imgdata.sizes.left_margin));
    size.Set("iWidth", Napi::Number::New(env, processor->imgdata.sizes.iwidth));
    size.Set("iHeight", Napi::Number::New(env, processor->imgdata.sizes.iheight));

    return size;
}

Napi::Value LibRawWrapper::GetAdvancedMetadata(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    Napi::Object metadata = Napi::Object::New(env);
    // 相机详情
    if (processor->imgdata.idata.normalized_make[0])
    {
        metadata.Set("normalizedMake", Napi::String::New(env, processor->imgdata.idata.normalized_make));
    }
    if (processor->imgdata.idata.normalized_model[0])
    {
        metadata.Set("normalizedModel", Napi::String::New(env, processor->imgdata.idata.normalized_model));
    }

    metadata.Set("rawCount", Napi::Number::New(env, processor->imgdata.idata.raw_count));
    metadata.Set("dngVersion", Napi::Number::New(env, processor->imgdata.idata.dng_version));
    metadata.Set("is_foveon", Napi::Number::New(env, processor->imgdata.idata.is_foveon));

    // 颜色矩阵和校准
    Napi::Array colorMatrix = Napi::Array::New(env);
    for (int i = 0; i < 4; i++)
    {
        Napi::Array row = Napi::Array::New(env);
        for (int j = 0; j < 3; j++)
        {
            row.Set(j, Napi::Number::New(env, processor->imgdata.color.cmatrix[i][j]));
        }
        colorMatrix.Set(i, row);
    }
    metadata.Set("colorMatrix", colorMatrix);

    // 相机到 XYZ 矩阵（cam_xyz 4x3）
    Napi::Array camXYZ = Napi::Array::New(env);
    for (int i = 0; i < 4; i++)
    {
        Napi::Array row = Napi::Array::New(env);
        for (int j = 0; j < 3; j++)
        {
            row.Set(j, Napi::Number::New(env, processor->imgdata.color.cam_xyz[i][j]));
        }
        camXYZ.Set(i, row);
    }
    metadata.Set("camXYZ", camXYZ);

    // 白平衡
    Napi::Array camMul = Napi::Array::New(env);
    for (int i = 0; i < 4; i++)
    {
        camMul.Set(i, Napi::Number::New(env, processor->imgdata.color.cam_mul[i]));
    }
    metadata.Set("camMul", camMul);

    Napi::Array preMul = Napi::Array::New(env);
    for (int i = 0; i < 4; i++)
    {
        preMul.Set(i, Napi::Number::New(env, processor->imgdata.color.pre_mul[i]));
    }
    metadata.Set("preMul", preMul);

    // 附加传感器信息
    metadata.Set("blackLevel", Napi::Number::New(env, processor->imgdata.color.black));
    metadata.Set("dataMaximum", Napi::Number::New(env, processor->imgdata.color.data_maximum));
    metadata.Set("whiteLevel", Napi::Number::New(env, processor->imgdata.color.maximum));

    return metadata;
}

Napi::Value LibRawWrapper::GetLensInfo(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    Napi::Object lensInfo = Napi::Object::New(env);
    if (processor->imgdata.lens.Lens[0])
    {
        lensInfo.Set("lensName", Napi::String::New(env, processor->imgdata.lens.Lens));
    }
    if (processor->imgdata.lens.LensMake[0])
    {
        lensInfo.Set("lensMake", Napi::String::New(env, processor->imgdata.lens.LensMake));
    }
    if (processor->imgdata.lens.LensSerial[0])
    {
        lensInfo.Set("lensSerial", Napi::String::New(env, processor->imgdata.lens.LensSerial));
    }
    if (processor->imgdata.lens.InternalLensSerial[0])
    {
        lensInfo.Set("internalLensSerial", Napi::String::New(env, processor->imgdata.lens.InternalLensSerial));
    }

    // 焦距信息
    if (processor->imgdata.lens.MinFocal > 0)
    {
        lensInfo.Set("minFocal", Napi::Number::New(env, processor->imgdata.lens.MinFocal));
    }
    if (processor->imgdata.lens.MaxFocal > 0)
    {
        lensInfo.Set("maxFocal", Napi::Number::New(env, processor->imgdata.lens.MaxFocal));
    }
    if (processor->imgdata.lens.MaxAp4MinFocal > 0)
    {
        lensInfo.Set("maxAp4MinFocal", Napi::Number::New(env, processor->imgdata.lens.MaxAp4MinFocal));
    }
    if (processor->imgdata.lens.MaxAp4MaxFocal > 0)
    {
        lensInfo.Set("maxAp4MaxFocal", Napi::Number::New(env, processor->imgdata.lens.MaxAp4MaxFocal));
    }
    if (processor->imgdata.lens.EXIF_MaxAp > 0)
    {
        lensInfo.Set("exifMaxAp", Napi::Number::New(env, processor->imgdata.lens.EXIF_MaxAp));
    }
    if (processor->imgdata.lens.FocalLengthIn35mmFormat > 0)
    {
        lensInfo.Set("focalLengthIn35mmFormat", Napi::Number::New(env, processor->imgdata.lens.FocalLengthIn35mmFormat));
    }

    return lensInfo;
}

Napi::Value LibRawWrapper::GetColorInfo(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    Napi::Object colorInfo = Napi::Object::New(env);
    // 基本颜色信息
    colorInfo.Set("colors", Napi::Number::New(env, processor->imgdata.idata.colors));
    colorInfo.Set("filters", Napi::Number::New(env, processor->imgdata.idata.filters));

    // 颜色数据
    colorInfo.Set("blackLevel", Napi::Number::New(env, processor->imgdata.color.black));
    colorInfo.Set("dataMaximum", Napi::Number::New(env, processor->imgdata.color.data_maximum));
    colorInfo.Set("whiteLevel", Napi::Number::New(env, processor->imgdata.color.maximum));

    // 颜色配置文件
    if (processor->imgdata.color.profile_length > 0)
    {
        colorInfo.Set("profileLength", Napi::Number::New(env, processor->imgdata.color.profile_length));
    }

    // 颜色矩阵
    Napi::Array rgbCam = Napi::Array::New(env);
    for (int i = 0; i < 3; i++)
    {
        Napi::Array row = Napi::Array::New(env);
        for (int j = 0; j < 4; j++)
        {
            row.Set(j, Napi::Number::New(env, processor->imgdata.color.rgb_cam[i][j]));
        }
        rgbCam.Set(i, row);
    }
    colorInfo.Set("rgbCam", rgbCam);

    // 相机乘数
    Napi::Array camMul = Napi::Array::New(env);
    for (int i = 0; i < 4; i++)
    {
        camMul.Set(i, Napi::Number::New(env, processor->imgdata.color.cam_mul[i]));
    }
    colorInfo.Set("camMul", camMul);

    return colorInfo;
}

// ============== 图像处理 ==============

Napi::Value LibRawWrapper::UnpackThumbnail(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->unpack_thumb();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to unpack thumbnail: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::ProcessImage(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->dcraw_process();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to process image: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    isProcessed = true;
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::SubtractBlack(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->subtract_black();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to subtract black: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::Raw2Image(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->raw2image();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to convert raw to image: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::AdjustMaximum(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->adjust_maximum();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to adjust maximum: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

// ============== 内存图像创建 ==============

Napi::Object LibRawWrapper::CreateImageDataObject(Napi::Env env, libraw_processed_image_t *img)
{
    Napi::Object result = Napi::Object::New(env);

    if (!img)
    {
        return result;
    }

    result.Set("type", Napi::Number::New(env, img->type));
    result.Set("height", Napi::Number::New(env, img->height));
    result.Set("width", Napi::Number::New(env, img->width));
    result.Set("colors", Napi::Number::New(env, img->colors));
    result.Set("bits", Napi::Number::New(env, img->bits));
    result.Set("dataSize", Napi::Number::New(env, img->data_size));

    // 创建包含图像数据的缓冲区
    Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, img->data, img->data_size);
    result.Set("data", buffer);

    return result;
}

Napi::Value LibRawWrapper::CreateMemoryImage(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int errcode = 0;
    libraw_processed_image_t *img = processor->dcraw_make_mem_image(&errcode);

    if (!img || errcode != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to create memory image: ";
        if (errcode != LIBRAW_SUCCESS)
        {
            error += libraw_strerror(errcode);
        }
        else
        {
            error += "Unknown error";
        }
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object result = CreateImageDataObject(env, img);
    LibRaw::dcraw_clear_mem(img);

    return result;
}

Napi::Value LibRawWrapper::CreateMemoryThumbnail(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int errcode = 0;
    libraw_processed_image_t *img = processor->dcraw_make_mem_thumb(&errcode);

    if (!img || errcode != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to create memory thumbnail: ";
        if (errcode != LIBRAW_SUCCESS)
        {
            error += libraw_strerror(errcode);
        }
        else
        {
            error += "Unknown error";
        }
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object result = CreateImageDataObject(env, img);
    LibRaw::dcraw_clear_mem(img);

    return result;
}

// ============== 文件写入器 ==============

Napi::Value LibRawWrapper::WritePPM(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();
    int ret = processor->dcraw_ppm_tiff_writer(filename.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to write PPM file: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::WriteTIFF(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();
    // 设置输出格式为 TIFF
    processor->imgdata.params.output_tiff = 1;

    int ret = processor->dcraw_ppm_tiff_writer(filename.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to write TIFF file: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::WriteThumbnail(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    if (info.Length() < 1 || !info[0].IsString())
    {
        Napi::TypeError::New(env, "Expected string filename").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string filename = info[0].As<Napi::String>().Utf8Value();
    int ret = processor->dcraw_thumb_writer(filename.c_str());
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to write thumbnail: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

// ============== 配置和设置 ==============

Napi::Value LibRawWrapper::SetOutputParams(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    if (info.Length() < 1 || !info[0].IsObject())
    {
        Napi::TypeError::New(env, "Expected object with output parameters").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object params = info[0].As<Napi::Object>();
    // Gamma 设置
    if (params.Has("gamma") && params.Get("gamma").IsArray())
    {
        Napi::Array gamma = params.Get("gamma").As<Napi::Array>();
        if (gamma.Length() >= 2)
        {
            processor->imgdata.params.gamm[0] = gamma.Get(0u).As<Napi::Number>().DoubleValue();
            processor->imgdata.params.gamm[1] = gamma.Get(1u).As<Napi::Number>().DoubleValue();
        }
    }

    // 亮度
    if (params.Has("bright") && params.Get("bright").IsNumber())
    {
        processor->imgdata.params.bright = params.Get("bright").As<Napi::Number>().FloatValue();
    }

    // 输出色彩空间
    if (params.Has("output_color") && params.Get("output_color").IsNumber())
    {
        processor->imgdata.params.output_color = params.Get("output_color").As<Napi::Number>().Int32Value();
    }

    // 每样本输出位数
    if (params.Has("output_bps") && params.Get("output_bps").IsNumber())
    {
        processor->imgdata.params.output_bps = params.Get("output_bps").As<Napi::Number>().Int32Value();
    }

    // 用户乘数
    if (params.Has("user_mul") && params.Get("user_mul").IsArray())
    {
        Napi::Array userMul = params.Get("user_mul").As<Napi::Array>();
        for (uint32_t i = 0; i < 4 && i < userMul.Length(); i++)
        {
            processor->imgdata.params.user_mul[i] = userMul.Get(i).As<Napi::Number>().FloatValue();
        }
    }

    // 使用相机/自动白平衡（可选）
    if (params.Has("use_camera_wb") && params.Get("use_camera_wb").IsBoolean())
    {
        processor->imgdata.params.use_camera_wb = params.Get("use_camera_wb").As<Napi::Boolean>().Value() ? 1 : 0;
    }
    if (params.Has("use_auto_wb") && params.Get("use_auto_wb").IsBoolean())
    {
        processor->imgdata.params.use_auto_wb = params.Get("use_auto_wb").As<Napi::Boolean>().Value() ? 1 : 0;
    }

    // 互斥处理：如显式设置 use_camera_wb 或 use_auto_wb，则清零 user_mul 以避免冲突
    if (processor->imgdata.params.use_camera_wb || processor->imgdata.params.use_auto_wb)
    {
        for (int i = 0; i < 4; ++i)
        {
            processor->imgdata.params.user_mul[i] = 0.0f;
        }
    }

    // 自动亮度
    if (params.Has("no_auto_bright") && params.Get("no_auto_bright").IsBoolean())
    {
        processor->imgdata.params.no_auto_bright = params.Get("no_auto_bright").As<Napi::Boolean>().Value() ? 1 : 0;
    }

    // 高光模式
    if (params.Has("highlight") && params.Get("highlight").IsNumber())
    {
        processor->imgdata.params.highlight = params.Get("highlight").As<Napi::Number>().Int32Value();
    }

    // 输出 TIFF
    if (params.Has("output_tiff") && params.Get("output_tiff").IsBoolean())
    {
        processor->imgdata.params.output_tiff = params.Get("output_tiff").As<Napi::Boolean>().Value() ? 1 : 0;
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::GetOutputParams(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    Napi::Object params = Napi::Object::New(env);
    // Gamma
    Napi::Array gamma = Napi::Array::New(env);
    gamma.Set(0u, Napi::Number::New(env, processor->imgdata.params.gamm[0]));
    gamma.Set(1u, Napi::Number::New(env, processor->imgdata.params.gamm[1]));
    params.Set("gamma", gamma);

    // 其他参数
    params.Set("bright", Napi::Number::New(env, processor->imgdata.params.bright));
    params.Set("output_color", Napi::Number::New(env, processor->imgdata.params.output_color));
    params.Set("output_bps", Napi::Number::New(env, processor->imgdata.params.output_bps));
    params.Set("no_auto_bright", Napi::Boolean::New(env, processor->imgdata.params.no_auto_bright));
    params.Set("highlight", Napi::Number::New(env, processor->imgdata.params.highlight));
    params.Set("output_tiff", Napi::Boolean::New(env, processor->imgdata.params.output_tiff));
    params.Set("use_camera_wb", Napi::Boolean::New(env, processor->imgdata.params.use_camera_wb));
    params.Set("use_auto_wb", Napi::Boolean::New(env, processor->imgdata.params.use_auto_wb));

    // 用户乘数
    Napi::Array userMul = Napi::Array::New(env);
    for (int i = 0; i < 4; i++)
    {
        userMul.Set(i, Napi::Number::New(env, processor->imgdata.params.user_mul[i]));
    }
    params.Set("user_mul", userMul);

    return params;
}

// ============== 实用函数 ==============

Napi::Value LibRawWrapper::IsFloatingPoint(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool isFloating = processor->is_floating_point();
    return Napi::Boolean::New(env, isFloating);
}

Napi::Value LibRawWrapper::IsFujiRotated(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool isFuji = processor->is_fuji_rotated();
    return Napi::Boolean::New(env, isFuji);
}

Napi::Value LibRawWrapper::IsSRAW(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool isSraw = processor->is_sraw();
    return Napi::Boolean::New(env, isSraw);
}

Napi::Value LibRawWrapper::IsJPEGThumb(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool isJpeg = processor->is_jpeg_thumb();
    return Napi::Boolean::New(env, isJpeg);
}

Napi::Value LibRawWrapper::ErrorCount(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    int errors = processor->error_count();
    return Napi::Number::New(env, errors);
}

// ============== 静态方法 ==============

Napi::Value LibRawWrapper::GetVersion(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    const char *version = LibRaw::version();
    return Napi::String::New(env, version ? version : "Unknown");
}

Napi::Value LibRawWrapper::GetCapabilities(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    unsigned int caps = LibRaw::capabilities();
    return Napi::Number::New(env, caps);
}

Napi::Value LibRawWrapper::GetCameraList(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    const char **cameras = LibRaw::cameraList();
    Napi::Array result = Napi::Array::New(env);

    if (cameras)
    {
        uint32_t index = 0;
        while (cameras[index] != nullptr)
        {
            result.Set(index, Napi::String::New(env, cameras[index]));
            index++;
        }
    }

    return result;
}

Napi::Value LibRawWrapper::GetCameraCount(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    int count = LibRaw::cameraCount();
    return Napi::Number::New(env, count);
}

// ============== 扩展实用函数 ==============

Napi::Value LibRawWrapper::IsNikonSRAW(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool isNikonSraw = processor->is_nikon_sraw();
    return Napi::Boolean::New(env, isNikonSraw);
}

Napi::Value LibRawWrapper::IsCoolscanNEF(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool isCoolscan = processor->is_coolscan_nef();
    return Napi::Boolean::New(env, isCoolscan);
}

Napi::Value LibRawWrapper::HaveFPData(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    bool haveFP = processor->have_fpdata();
    return Napi::Boolean::New(env, haveFP);
}

Napi::Value LibRawWrapper::SrawMidpoint(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    int midpoint = processor->sraw_midpoint();
    return Napi::Number::New(env, midpoint);
}

Napi::Value LibRawWrapper::ThumbOK(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    // thumbOK 可以接受最大尺寸参数，默认为 -1 表示无限制
    INT64 maxSize = -1;
    if (info.Length() > 0 && info[0].IsNumber())
    {
        maxSize = info[0].As<Napi::Number>().Int64Value();
    }

    int result = processor->thumbOK(maxSize);
    return Napi::Number::New(env, result);
}

Napi::Value LibRawWrapper::UnpackFunctionName(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    const char *name = processor->unpack_function_name();
    return Napi::String::New(env, name ? name : "Unknown");
}

Napi::Value LibRawWrapper::GetDecoderInfo(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    libraw_decoder_info_t decoder_info;
    int ret = processor->get_decoder_info(&decoder_info);

    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to get decoder info: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object result = Napi::Object::New(env);
    result.Set("decoder_name", Napi::String::New(env, decoder_info.decoder_name ? decoder_info.decoder_name : "Unknown"));
    result.Set("decoder_flags", Napi::Number::New(env, decoder_info.decoder_flags));

    return result;
}

// ============== 高级处理 ==============

Napi::Value LibRawWrapper::Unpack(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->unpack();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to unpack: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::Raw2ImageEx(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    // 默认为减去黑色，可以被覆盖
    int do_subtract_black = 1;
    if (info.Length() > 0 && info[0].IsBoolean())
    {
        do_subtract_black = info[0].As<Napi::Boolean>().Value() ? 1 : 0;
    }

    int ret = processor->raw2image_ex(do_subtract_black);
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to convert raw to image: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::AdjustSizesInfoOnly(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int ret = processor->adjust_sizes_info_only();
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to adjust sizes: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::FreeImage(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    processor->free_image();
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::ConvertFloatToInt(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    // 来自 LibRaw 的默认值
    float dmin = 4096.0f;
    float dmax = 32767.0f;
    float dtarget = 16383.0f;

    if (info.Length() > 0 && info[0].IsNumber())
    {
        dmin = info[0].As<Napi::Number>().FloatValue();
    }
    if (info.Length() > 1 && info[1].IsNumber())
    {
        dmax = info[1].As<Napi::Number>().FloatValue();
    }
    if (info.Length() > 2 && info[2].IsNumber())
    {
        dtarget = info[2].As<Napi::Number>().FloatValue();
    }

    processor->convertFloatToInt(dmin, dmax, dtarget);
    return Napi::Boolean::New(env, true);
}

// ============== 扩展内存操作 ==============

Napi::Value LibRawWrapper::GetMemImageFormat(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();
    int width, height, colors, bps;
    processor->get_mem_image_format(&width, &height, &colors, &bps);

    Napi::Object result = Napi::Object::New(env);
    result.Set("width", Napi::Number::New(env, width));
    result.Set("height", Napi::Number::New(env, height));
    result.Set("colors", Napi::Number::New(env, colors));
    result.Set("bps", Napi::Number::New(env, bps));

    return result;
}

Napi::Value LibRawWrapper::CopyMemImage(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsNumber() || !info[2].IsBoolean())
    {
        Napi::TypeError::New(env, "Expected (buffer, stride, bgr)").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
    int stride = info[1].As<Napi::Number>().Int32Value();
    int bgr = info[2].As<Napi::Boolean>().Value() ? 1 : 0;

    int ret = processor->copy_mem_image(buffer.Data(), stride, bgr);
    if (ret != LIBRAW_SUCCESS)
    {
        std::string error = "Failed to copy memory image: ";
        error += libraw_strerror(ret);
        Napi::Error::New(env, error).ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::Boolean::New(env, true);
}

// ============== 颜色操作 ==============

Napi::Value LibRawWrapper::GetColorAt(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
    {
        Napi::TypeError::New(env, "Expected (row, col)").ThrowAsJavaScriptException();
        return env.Null();
    }
    int row = info[0].As<Napi::Number>().Int32Value();
    int col = info[1].As<Napi::Number>().Int32Value();

    int color = processor->COLOR(row, col);
    return Napi::Number::New(env, color);
}

// ============== 颜色物理白点 ==============

Napi::Value LibRawWrapper::GetWhitepointPhysics(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    if (!CheckLoaded(env))
        return env.Null();

    // 基于 cam_mul 与 cam_xyz 估算场景白点（与 tools/inspect_whitepoint 保持一致口径）
    const float *cam_mul = processor->imgdata.color.cam_mul;
    const float(*cam_xyz)[3] = processor->imgdata.color.cam_xyz;

    double mR = cam_mul[0] > 1e-6 ? cam_mul[0] : 1.0;
    double mG = cam_mul[1] > 1e-6 ? cam_mul[1] : 1.0;
    double mB = cam_mul[2] > 1e-6 ? cam_mul[2] : 1.0;
    double r = 1.0 / mR, g = 1.0 / mG, b = 1.0 / mB;
    double s = r + g + b;
    r /= s;
    g /= s;
    b /= s;

    double X = r * cam_xyz[0][0] + g * cam_xyz[1][0] + b * cam_xyz[2][0];
    double Y = r * cam_xyz[0][1] + g * cam_xyz[1][1] + b * cam_xyz[2][1];
    double Z = r * cam_xyz[0][2] + g * cam_xyz[1][2] + b * cam_xyz[2][2];
    double sum = X + Y + Z;
    double x = sum > 0 ? X / sum : 0.3127;
    double y = sum > 0 ? Y / sum : 0.3290;

    auto xyToCCT = [](double x, double y)
    {
        const double xe = 0.3320, ye = 0.1858;
        double n = (x - xe) / (y - ye);
        double cct = -449 * n * n * n + 3525 * n * n - 6823.3 * n + 5520.33;
        if (cct < 1000)
            cct = 1000;
        if (cct > 40000)
            cct = 40000;
        return cct;
    };
    auto xyToUv = [](double x, double y)
    {
        double denom = (-2 * x) + (12 * y) + 3;
        double u = (4 * x) / denom;
        double v = (6 * y) / denom;
        return std::pair<double, double>(u, v);
    };
    auto cctToXy = [](double T)
    {
        double x;
        if (T >= 1667 && T <= 4000)
            x = -0.2661239e9 / (T * T * T) - 0.2343580e6 / (T * T) + 0.8776956e3 / T + 0.179910;
        else
            x = -3.0258469e9 / (T * T * T) + 2.1070379e6 / (T * T) + 0.2226347e3 / T + 0.240390;
        double y;
        if (T >= 1667 && T <= 2222)
            y = -1.1063814 * x * x * x - 1.34811020 * x * x + 2.18555832 * x - 0.20219683;
        else if (T > 2222 && T <= 4000)
            y = -0.9549476 * x * x * x - 1.37418593 * x * x + 2.09137015 * x - 0.16748867;
        else
            y = 3.0817580 * x * x * x - 5.87338670 * x * x + 3.75112997 * x - 0.37001483;
        return std::pair<double, double>(x, y);
    };

    double cct = xyToCCT(x, y);
    auto uv = xyToUv(x, y);
    auto bbxy = cctToXy(cct);
    auto uvbb = xyToUv(bbxy.first, bbxy.second);
    double du = uv.first - uvbb.first;
    double dv = uv.second - uvbb.second;
    double duv = std::sqrt(du * du + dv * dv);
    if (uv.second < uvbb.second)
        duv = std::abs(duv);
    else
        duv = -std::abs(duv);

    Napi::Object res = Napi::Object::New(env);
    Napi::Object xyObj = Napi::Object::New(env);
    xyObj.Set("x", Napi::Number::New(env, x));
    xyObj.Set("y", Napi::Number::New(env, y));
    res.Set("xy", xyObj);
    res.Set("kelvin", Napi::Number::New(env, std::round(cct)));
    res.Set("duv", Napi::Number::New(env, duv));
    return res;
}

// ============== 取消支持 ==============

Napi::Value LibRawWrapper::SetCancelFlag(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    processor->setCancelFlag();
    return Napi::Boolean::New(env, true);
}

Napi::Value LibRawWrapper::ClearCancelFlag(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    processor->clearCancelFlag();
    return Napi::Boolean::New(env, true);
}

// ============== 版本信息（实例方法） ==============

Napi::Value LibRawWrapper::Version(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    const char *version = processor->version();
    return Napi::String::New(env, version);
}

Napi::Value LibRawWrapper::VersionNumber(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    int versionNum = processor->versionNumber();

    // LibRaw 版本号编码为 XXYYZZ，其中 XX.YY.ZZ 是版本
    int major = versionNum / 10000;
    int minor = (versionNum % 10000) / 100;
    int patch = versionNum % 100;

    Napi::Array result = Napi::Array::New(env, 3);
    result[static_cast<uint32_t>(0)] = Napi::Number::New(env, major);
    result[static_cast<uint32_t>(1)] = Napi::Number::New(env, minor);
    result[static_cast<uint32_t>(2)] = Napi::Number::New(env, patch);

    return result;
}

// ============== 错误处理 ==============

Napi::Value LibRawWrapper::GetLastError(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    // LibRaw 不存储最后一个错误，所以我们返回一个通用消息
    // In practice, errors are thrown as exceptions
    return Napi::String::New(env, "No error information available");
}

Napi::Value LibRawWrapper::Strerror(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber())
    {
        Napi::TypeError::New(env, "Expected error code as number").ThrowAsJavaScriptException();
        return env.Null();
    }

    int errorCode = info[0].As<Napi::Number>().Int32Value();
    const char *errorMsg = processor->strerror(errorCode);
    return Napi::String::New(env, errorMsg);
}
