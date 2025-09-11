# LibRaw Node.js 示例

此目录包含全面的示例，演示 LibRaw Node.js 包装器的完整功能，包括传统的基于文件的操作和现代的基于缓冲区的流式操作。

## 示例概述

### 📚 基本示例（`basic-example.js`）

**目的**：LibRaw 使用的简单介绍

```bash
node basic-example.js sample.cr2
```

**功能**：

- 加载 RAW 文件
- 提取基本元数据
- 获取图像尺寸
- 基本错误处理

### 🔬 高级功能（`advanced-features.js`）

**目的**：演示特定的 LibRaw 功能

```bash
node advanced-features.js sample.cr2
```

**功能**：

- 全面的元数据提取
- 镜头信息
- 色彩信息和矩阵
- 图像分析函数
- 处理配置

### 🎯 完整示例（`complete-example.js`）

**目的**：完整的处理管道演示

```bash
node complete-example.js sample.cr2 ./output
```

**功能**：

- 完整的 10 步处理管道
- 所有元数据类型（基本、高级、镜头、色彩）
- 使用自定义参数的图像处理
- 内存操作（图像和缩略图）
- 多种输出格式（PPM、TIFF、缩略图）
- 缓冲区处理示例
- 性能指标
- 全面的错误处理

### 📦 批量处理（`batch-example.js`）

**目的**：高效处理多个文件

```bash
node batch-example.js ./input-folder ./output-folder --formats tiff,thumbnail --concurrency 3
```

**功能**：

- 具有并发控制的多文件处理
- 进度跟踪和统计
- 可配置的输出格式
- 每个文件的错误处理
- 性能指标和吞吐量分析
- 相机和处理摘要

### 🚀 **新功能**：流/缓冲区操作（`stream-buffer-example.js`）

**目的**：用于 Web 服务和云应用程序的现代基于缓冲区的 API

```bash
node stream-buffer-example.js sample.cr2 ./buffer-output
```

**功能**：

- 直接在内存中创建图像缓冲区（无文件 I/O）
- 多种格式支持：JPEG、PNG、WebP、AVIF、TIFF、PPM
- 非常适合 Web API 和云存储
- 性能优化的处理
- HTTP 响应、云上传的实用使用示例
- 格式效率比较

### 📸 **新功能**：简单缓冲区 API（`simple-buffer-example.js`）

**目的**：最常见缓冲区操作的快速开始指南

```bash
node simple-buffer-example.js sample.cr2
```

**功能**：

- 网络优化的 JPEG 缓冲区创建
- 内存中的缩略图生成
- 高质量图像缓冲区
- Web 开发的实用代码示例
- 性能优势演示

### 🔄 **新功能**：API 比较（`api-comparison-example.js`）

**目的**：基于文件与基于缓冲区方法的并排比较

```bash
node api-comparison-example.js sample.cr2 ./comparison-output
```

**功能**：

- 文件 API 和缓冲区 API 之间的性能比较
- 用例推荐
- 格式效率分析
- 不同场景的代码示例
- 每种方法的最佳实践

## 缓冲区/流 API 亮点

新的基于缓冲区的 API 为现代应用程序提供了几个优势：

### 🌐 Web 服务集成

```javascript
// Express.js 端点
app.get("/convert/:id", async (req, res) => {
  const processor = new LibRaw();
  await processor.loadFile(`photos/${req.params.id}.raw`);
  const result = await processor.createJPEGBuffer({ quality: 85, width: 1920 });
  res.set("Content-Type", "image/jpeg");
  res.send(result.buffer);
});
```

### ☁️ 云存储上传

```javascript
// 直接上传到云存储
const result = await processor.createJPEGBuffer({ quality: 90 });
await bucket.file("processed.jpg").save(result.buffer, {
  metadata: { contentType: "image/jpeg" },
});
```

### 🔄 多格式生成

```javascript
// 并行创建多种格式
const [jpeg, webp, avif] = await Promise.all([
  processor.createJPEGBuffer({ quality: 85 }),
  processor.createWebPBuffer({ quality: 80 }),
  processor.createAVIFBuffer({ quality: 50 }),
]);
```

### 🚀 可用的缓冲区方法

- `createJPEGBuffer(options)` - 具有质量、调整大小、渐进式选项的 JPEG
- `createPNGBuffer(options)` - 具有压缩控制的无损 PNG
- `createWebPBuffer(options)` - 现代 WebP 格式（比 JPEG 更小）
- `createAVIFBuffer(options)` - 下一代 AVIF 格式（文件大小最小）
- `createTIFFBuffer(options)` - 具有各种压缩选项的高质量 TIFF
- `createPPMBuffer()` - 用于进一步处理的原始 PPM 格式
- `createThumbnailJPEGBuffer(options)` - 优化的缩略图生成

## 快速开始

1. **安装依赖**（如果尚未完成）：

   ```bash
   npm install
   ```

2. **运行基础示例**：

   ```bash
   node examples/basic-example.js path/to/your/image.cr2
   ```

3. **尝试缓冲区 API（推荐用于 Web 应用）**：

   ```bash
   node examples/simple-buffer-example.js path/to/your/image.cr2
   ```

4. **比较 API**：

   ```bash
   node examples/api-comparison-example.js path/to/your/image.cr2
   ```

5. **处理多个文件**：
   ```bash
   node examples/batch-example.js ./raw-photos ./processed-output
   ```

## 支持的文件格式

示例适用于 LibRaw 支持的所有 RAW 格式，包括：

- **佳能**: `.cr2`, `.cr3`, `.crw`
- **尼康**: `.nef`, `.nrw`
- **索尼**: `.arw`, `.srf`, `.sr2`
- **富士**: `.raf`
- **奥林巴斯**: `.orf`
- **松下**: `.raw`, `.rw2`
- **Adobe**: `.dng`
- **柯达**: `.dcr`, `.kdc`
- **以及更多**（支持 1000+ 相机型号）

## 示例输出

### 缓冲区 API 示例

````
📸 简单缓冲区 API 示例
============================
📁 处理中: sample.cr2

🔄 加载 RAW 文件...
⚙️ 处理图像...

📸 创建网络优化的 JPEG 缓冲区...
✅ Web JPEG 已创建: 1,234,567 字节
   尺寸: 1920x1280
   压缩: 15.2:1

🔍 创建缩略图缓冲区...
✅ 缩略图已创建: 45,123 字节
   尺寸: 300x200

🎨 创建高质量缓冲区...
✅ 高质量 JPEG 已创建: 8,765,432 字节
   尺寸: 8192x5464

💡 实用使用示例:

1️⃣ 保存缓冲区到文件:
```javascript
fs.writeFileSync("output.jpg", webJpeg.buffer);
````

2️⃣ 通过 HTTP 响应发送:

```javascript
app.get("/image", async (req, res) => {
  const result = await processor.createJPEGBuffer({ quality: 85 });
  res.set("Content-Type", "image/jpeg");
  res.send(result.buffer);
});
```

⚡ 性能优势:
• 无文件系统 I/O - 更快处理
• 直接内存操作
• 完美适用于无服务器/云函数
• 减少磁盘空间使用
• 更好的并发处理

✅ 完成！您的图像已准备好在内存中使用。

```

### 格式效率比较

```

# 🎨 格式效率比较

📊 按文件大小排序的格式（从小到大）：
🏆 AVIF: 0.89 MB
🥈 WebP: 1.23 MB
🥉 JPEG: 1.85 MB
📊 PNG: 12.4 MB
📊 TIFF: 45.2 MB

````

## 高级配置

### 缓冲区创建选项

```javascript
// 具有调整大小和质量控制的 JPEG
const jpegResult = await processor.createJPEGBuffer({
    quality: 85,           // 1-100
    width: 1920,          // 调整到宽度
    progressive: true,     // 渐进式加载
    colorSpace: 'srgb'    // 色彩空间
});

// 具有无损选项的 WebP
const webpResult = await processor.createWebPBuffer({
    quality: 80,           // 1-100
    lossless: false,      // 有损压缩
    effort: 4             // 编码努力程度 0-6
});

// 最大压缩的 AVIF
const avifResult = await processor.createAVIFBuffer({
    quality: 50,          // 较低质量以获得更小文件
    effort: 6             // 最大努力以获得最佳压缩
});
````

### 性能优化

```javascript
// 实时处理的快速模式
const fastResult = await processor.createJPEGBuffer({
  quality: 80,
  fastMode: true, // 优化速度而非质量
  effort: 1, // 最小编码努力
});

// 归档的高质量模式
const archiveResult = await processor.createTIFFBuffer({
  compression: "lzw", // 无损压缩
  pyramid: true, // 多分辨率 TIFF
});
```

## 何时使用哪种 API

### 📁 在以下情况使用基于文件的 API：

- 构建传统桌面应用程序
- 需要永久文件存储
- 处理非常大的图像（内存限制）
- 与基于文件的工作流集成
- 创建归档或备份

### 🚀 在以下情况使用基于缓冲区的 API：

- 构建 Web 服务和 REST API
- 上传到云存储（AWS S3、Google Cloud 等）
- 创建实时图像处理管道
- 开发无服务器/lambda 函数
- 通过网络流式传输图像数据
- 构建移动应用后端
- 内存到内存处理工作流

## 故障排除

### 常见问题

1. **文件未找到错误**：

   - 确保 RAW 文件路径正确
   - 检查文件权限

2. **大文件的内存错误**：

   - 使用较低并发性的批量处理
   - 对非常大的 RAW 文件进行顺序处理
   - 对极大的图像考虑使用基于文件的 API

3. **缓冲区大小错误**：

   - 创建多个大缓冲区时监控内存使用
   - 如果内存有限，一次处理一个图像

4. **Sharp 安装问题**：
   - 确保 Sharp 正确安装：`npm install sharp`
   - 在某些系统上可能需要原生编译

### 性能提示

1. **缓冲区处理**：

   - 处理多个图像时重用 LibRaw 实例
   - 为您的用例使用适当的质量设置
   - 考虑调整图像大小以减少缓冲区大小

2. **格式选择**：

   - AVIF：最佳压缩，编码较慢
   - WebP：良好压缩，快速编码
   - JPEG：通用兼容性，快速编码
   - PNG：无损，文件大小较大
   - TIFF：专业工作流，各种压缩选项

3. **内存管理**：
   - 完成后始终调用 `processor.close()`
   - 顺序处理大批量以避免内存问题
   - 监控云函数的缓冲区大小限制

## 贡献

欢迎添加更多示例或改进现有示例！每个示例应该：

1. 包含全面的错误处理
2. 提供清晰的控制台输出
3. 演示特定的 LibRaw 功能
4. 包含性能指标
5. 显示适当的资源清理
6. 在适用时记录文件和缓冲区方法

## 许可证

这些示例在主要项目的相同许可证下提供。
