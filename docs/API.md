# API 文档

## LibRaw 类

用于处理 RAW 图像文件的主要类。支持传统的基于文件的操作和现代的基于缓冲区的流式操作。

### 构造函数

```javascript
const LibRaw = require("librawspeed");
const processor = new LibRaw();
```

## 文件操作

#### loadFile(filepath)

加载 RAW 图像文件进行处理。

**参数：**

- `filepath` (string): RAW 图像文件的绝对路径

**返回：** `Promise<void>`

**抛出：** 如果文件无法加载或不支持则抛出错误

**示例：**

```javascript
await processor.loadFile("/path/to/image.nef");
```

#### loadBuffer(buffer)

从内存缓冲区加载 RAW 图像。

**参数：**

- `buffer` (Buffer): 包含 RAW 图像数据的缓冲区

**返回：** `Promise<void>`

**示例：**

```javascript
const rawData = fs.readFileSync("/path/to/image.nef");
await processor.loadBuffer(rawData);
```

#### close()

关闭当前图像并释放资源。

**返回：** `Promise<void>`

**示例：**

```javascript
await processor.close();
```

## 元数据操作

#### getMetadata()

从加载的 RAW 图像中提取基本元数据。

**返回：** `Promise<LibRawMetadata>`

**示例：**

```javascript
const metadata = await processor.getMetadata();
console.log(`相机：${metadata.make} ${metadata.model}`);
console.log(
  `ISO：${metadata.iso}，f/${metadata.aperture}，1/${Math.round(
    1 / metadata.shutterSpeed
  )}s`
);
```

#### getImageSize()

获取图像尺寸和边距信息。

**返回：** `Promise<LibRawImageSize>`

#### getAdvancedMetadata()

获取高级元数据，包括色彩矩阵和校准数据。

**返回：** `Promise<LibRawAdvancedMetadata>`

#### getLensInfo()

从 EXIF 数据中获取镜头信息。

**返回：** `Promise<LibRawLensInfo>`

#### getColorInfo()

获取色彩空间和传感器信息。

**返回：** `Promise<LibRawColorInfo>`

## 图像处理

#### processImage()

使用当前设置处理 RAW 图像。

**返回：** `Promise<void>`

**示例：**

```javascript
await processor.processImage();
```

#### unpackThumbnail()

从 RAW 文件中解包缩略图数据。

**返回：** `Promise<void>`

#### setOutputParams(params)

设置输出处理参数。

**参数：**

- `params` (Object): 处理参数

**示例：**

```javascript
await processor.setOutputParams({
  bright: 1.1,
  gamma: [2.2, 4.5],
  output_bps: 16,
  output_color: 1,
});
```

## 内存操作

#### createMemoryImage()

在内存中创建处理后的图像。

**返回：** `Promise<LibRawImageData>`

#### createMemoryThumbnail()

在内存中创建缩略图图像。

**返回：** `Promise<LibRawImageData>`

## 缓冲区/流操作（新功能）

缓冲区 API 提供现代的、基于内存的图像处理，非常适合 Web 服务、云应用程序和实时处理。

#### createJPEGBuffer(options)

创建具有高级压缩选项的 JPEG 缓冲区。

**参数：**

- `options` (Object, 可选): JPEG 转换选项
  - `quality` (number): JPEG 质量 1-100（默认：85）
  - `width` (number): 目标宽度（保持宽高比）
  - `height` (number): 目标高度
  - `progressive` (boolean): 使用渐进式 JPEG（默认：false）
  - `mozjpeg` (boolean): 使用 mozjpeg 编码器（默认：true）
  - `chromaSubsampling` (string): '4:4:4', '4:2:2', 或 '4:2:0'（默认：'4:2:0'）
  - `colorSpace` (string): 'srgb', 'rec2020', 'p3', 'cmyk'（默认：'srgb'）
  - `fastMode` (boolean): 优化速度（默认：false）
  - `effort` (number): 编码努力程度 1-9（默认：4）

**返回：** `Promise<LibRawBufferResult>`

**示例：**

```javascript
const result = await processor.createJPEGBuffer({
  quality: 85,
  width: 1920,
  progressive: true,
});

// 直接使用缓冲区
res.set("Content-Type", "image/jpeg");
res.send(result.buffer);
```

#### createPNGBuffer(options)

创建无损 PNG 缓冲区。

**参数：**

- `options` (Object, 可选): PNG 转换选项
  - `width` (number): 目标宽度
  - `height` (number): 目标高度
  - `compressionLevel` (number): 压缩级别 0-9（默认：6）
  - `progressive` (boolean): 使用渐进式 PNG（默认：false）
  - `colorSpace` (string): 输出色彩空间（默认：'srgb'）

**返回：** `Promise<LibRawBufferResult>`

#### createWebPBuffer(options)

创建具有优秀压缩的现代 WebP 缓冲区。

**参数：**

- `options` (Object, 可选): WebP 转换选项
  - `quality` (number): 质量 1-100（默认：80）
  - `width` (number): 目标宽度
  - `height` (number): 目标高度
  - `lossless` (boolean): 使用无损压缩（默认：false）
  - `effort` (number): 编码努力程度 0-6（默认：4）
  - `colorSpace` (string): 输出色彩空间（默认：'srgb'）

**返回：** `Promise<LibRawBufferResult>`

#### createAVIFBuffer(options)

创建具有卓越压缩的下一代 AVIF 缓冲区。

**参数：**

- `options` (Object, 可选): AVIF 转换选项
  - `quality` (number): 质量 1-100（默认：50）
  - `width` (number): 目标宽度
  - `height` (number): 目标高度
  - `lossless` (boolean): 使用无损压缩（默认：false）
  - `effort` (number): 编码努力程度 0-9（默认：4）
  - `colorSpace` (string): 输出色彩空间（默认：'srgb'）

**返回：** `Promise<LibRawBufferResult>`

#### createTIFFBuffer(options)

为专业工作流程创建高质量 TIFF 缓冲区。

**参数：**

- `options` (Object, 可选): TIFF 转换选项
  - `width` (number): 目标宽度
  - `height` (number): 目标高度
  - `compression` (string): 'none', 'lzw', 'jpeg', 'zip'（默认：'lzw'）
  - `quality` (number): 使用 JPEG 压缩时的 JPEG 质量（默认：90）
  - `pyramid` (boolean): 创建金字塔 TIFF（默认：false）
  - `colorSpace` (string): 输出色彩空间（默认：'srgb'）

**返回：** `Promise<LibRawBufferResult>`

#### createPPMBuffer()

创建原始 PPM 缓冲区用于进一步处理。

**返回：** `Promise<LibRawBufferResult>`

#### createThumbnailJPEGBuffer(options)

创建优化的缩略图 JPEG 缓冲区。

**参数：**

- `options` (Object, 可选): 缩略图选项
  - `quality` (number): JPEG 质量 1-100（默认：85）
  - `maxSize` (number): 最大尺寸（宽度或高度）

**返回：** `Promise<LibRawBufferResult>`

## 文件输出操作

#### writePPM(filename)

将处理后的图像写入为 PPM 文件。

**参数：**

- `filename` (string): 输出文件路径

**返回：** `Promise<void>`

#### writeTIFF(filename)

将处理后的图像写入为 TIFF 文件。

**参数：**

- `filename` (string): 输出文件路径

**返回：** `Promise<void>`

#### writeThumbnail(filename)

将缩略图写入为 JPEG 文件。

**参数：**

- `filename` (string): 输出文件路径

**返回：** `Promise<void>`

## JPEG 转换

#### convertToJPEG(outputPath, options)

使用高级选项将 RAW 转换为 JPEG 文件。

**参数：**

- `outputPath` (string): 输出文件路径
- `options` (Object, 可选): 与 `createJPEGBuffer` 选项相同

**返回：** `Promise<LibRawJPEGResult>`

**示例：**

```javascript
const result = await processor.convertToJPEG("./output.jpg", {
  quality: 90,
  width: 2400,
});
console.log(`已保存：${result.outputPath}`);
```

## 实用工具函数

#### isFloatingPoint()

检查图像是否使用浮点数据。

**返回：** `Promise<boolean>`

#### isFujiRotated()

检查图像是否来自富士相机并已旋转。

**返回：** `Promise<boolean>`

#### isSRAW()

检查图像是否为 sRAW 格式。

**返回：** `Promise<boolean>`

#### isJPEGThumb()

检查文件是否包含 JPEG 缩略图。

**返回：** `Promise<boolean>`

#### errorCount()

获取当前错误计数。

**返回：** `Promise<number>`

## 静态方法

#### LibRaw.getVersion()

获取 LibRaw 库版本。

**返回：** `string`

#### LibRaw.getCapabilities()

获取 LibRaw 库功能位掩码。

**返回：** `number`

#### LibRaw.getCameraList()

获取支持的相机型号列表。

**返回：** `string[]`

#### LibRaw.getCameraCount()

获取支持的相机型号数量。

**返回：** `number`

## 缓冲区结果格式

所有缓冲区方法都返回一个 `LibRawBufferResult` 对象：

```javascript
{
    success: true,
    buffer: Buffer,         // 实际的图像数据
    metadata: {
        originalDimensions: { width: 8192, height: 5464 },
        outputDimensions: { width: 1920, height: 1280 },
        fileSize: {
            original: 134217728,
            compressed: 1048576,
            compressionRatio: "128.0"
        },
        processing: {
            timeMs: "450.25",
            throughputMBps: "297.3"
        },
        jpegOptions: { /* 应用的选项 */ }
    }
}
```

## 使用模式

### 传统的基于文件的处理

```javascript
const processor = new LibRaw();
await processor.loadFile("input.cr2");
await processor.processImage();
await processor.writeTIFF("output.tiff");
await processor.close();
```

### 现代的基于缓冲区的处理

```javascript
const processor = new LibRaw();
await processor.loadFile("input.cr2");

// 并行创建多种格式
const [jpeg, webp, thumbnail] = await Promise.all([
  processor.createJPEGBuffer({ quality: 85, width: 1920 }),
  processor.createWebPBuffer({ quality: 80, width: 1920 }),
  processor.createThumbnailJPEGBuffer({ maxSize: 300 }),
]);

// 直接使用缓冲区（无文件 I/O）
await uploadToCloud("image.jpg", jpeg.buffer);
await uploadToCloud("image.webp", webp.buffer);
await uploadToCloud("thumb.jpg", thumbnail.buffer);

await processor.close();
```

### Web API 集成

```javascript
app.post("/convert", async (req, res) => {
  const processor = new LibRaw();

  try {
    await processor.loadBuffer(req.body);
    const result = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920,
    });

    res.set("Content-Type", "image/jpeg");
    res.send(result.buffer);
  } finally {
    await processor.close();
  }
});
```

## 错误处理

始终将 LibRaw 操作包装在 try/catch 块中并确保适当的清理：

```javascript
const processor = new LibRaw();

try {
  await processor.loadFile("input.cr2");
  const result = await processor.createJPEGBuffer({ quality: 85 });
  return result;
} catch (error) {
  console.error("处理失败：", error.message);
  throw error;
} finally {
  await processor.close(); // 始终清理
}
```

#### getImageSize()

获取加载的 RAW 图像的尺寸。

**返回：** `Promise<LibRawImageSize>`

**示例：**

```javascript
const size = await processor.getImageSize();
console.log(`分辨率：${size.width}x${size.height}`);
```

#### close()

关闭处理器并释放资源。

**返回：** `Promise<void>`

**示例：**

```javascript
await processor.close();
```

## 接口

### LibRawMetadata

```typescript
interface LibRawMetadata {
  make: string; // 相机制造商
  model: string; // 相机型号
  iso: number; // ISO 感光度
  aperture: number; // 光圈 f 值
  shutterSpeed: number; // 快门速度（秒）
  focalLength: number; // 焦距（毫米）
  timestamp: number; // Unix 时间戳
  colors: number; // 颜色通道数
  filters: number; // 颜色滤镜模式
  description?: string; // 相机描述
  artist?: string; // 摄影师姓名
  copyright?: string; // 版权信息
}
```

### LibRawImageSize

```typescript
interface LibRawImageSize {
  width: number; // 图像宽度（像素）
  height: number; // 图像高度（像素）
}
```

## 支持的格式

| 格式  | 扩展名 | 制造商  | 描述              |
| ------- | --------- | ------------- | ------------------------ |
| NEF     | .nef      | 尼康         | 尼康电子格式  |
| CR2/CR3 | .cr2/.cr3 | 佳能         | 佳能 RAW 版本 2/3    |
| ARW     | .arw      | 索尼          | 索尼 Alpha RAW           |
| RAF     | .raf      | 富士      | 富士 RAW 格式          |
| RW2     | .rw2      | 松下     | 松下 RAW 版本 2  |
| DNG     | .dng      | Adobe/各种 | 数字负片 (Adobe) |

## 错误处理

所有方法都返回 Promise 并可能抛出错误。始终使用 try-catch 或 .catch()：

```javascript
try {
  await processor.loadFile("image.nef");
  const metadata = await processor.getMetadata();
  console.log(metadata);
} catch (error) {
  console.error("处理失败：", error.message);
} finally {
  await processor.close();
}
```

## 完整示例

```javascript
const LibRaw = require("librawspeed");

async function processRAWFile(filepath) {
  const processor = new LibRaw();

  try {
    // 加载 RAW 文件
    await processor.loadFile(filepath);

    // 提取元数据
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();

    // 显示信息
    console.log(`相机：${metadata.make} ${metadata.model}`);
    console.log(`分辨率：${size.width}x${size.height}`);
    console.log(
      `设置：ISO ${metadata.iso}，f/${metadata.aperture}，1/${Math.round(
        1 / metadata.shutterSpeed
      )}s`
    );

    return { metadata, size };
  } catch (error) {
    console.error("处理文件时出错：", error.message);
    throw error;
  } finally {
    // 始终清理
    await processor.close();
  }
}

// 使用
processRAWFile("/path/to/image.nef")
  .then((result) => console.log("处理完成"))
  .catch((error) => console.error("失败：", error));
```
