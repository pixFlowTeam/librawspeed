# 缓冲区/流 API 文档

LibRaw Node.js 包装器现在支持现代基于缓冲区的操作，直接在内存中返回图像数据而不是写入文件。这非常适合 Web 服务、云应用程序和实时图像处理管道。

## 概述

缓冲区 API 提供几个关键优势：

- **🚀 性能**：无文件系统 I/O 开销
- **🌐 Web 就绪**：完美适用于 HTTP 响应和 API 端点
- **☁️ 云原生**：直接上传到云存储服务
- **🔄 可流式**：与 Node.js 流和管道一起使用
- **💾 内存高效**：无需临时文件处理
- **⚡ 实时**：非常适合无服务器和 lambda 函数

## 可用方法

### 核心缓冲区方法

#### `createJPEGBuffer(options)`

创建具有高级压缩选项的 JPEG 缓冲区。

```javascript
const result = await processor.createJPEGBuffer({
  quality: 85, // 1-100，越高质量越好
  width: 1920, // 调整到宽度（保持宽高比）
  height: 1080, // 调整到高度
  progressive: true, // 用于 Web 的渐进式 JPEG
  mozjpeg: true, // 使用 mozjpeg 编码器获得更好的压缩
  chromaSubsampling: "4:2:0", // '4:4:4', '4:2:2', 或 '4:2:0'
  colorSpace: "srgb", // 'srgb', 'rec2020', 'p3', 'cmyk'
  fastMode: false, // 启用速度优先于质量
  effort: 4, // 编码努力程度 (1=快, 9=慢)
});
```

#### `createPNGBuffer(options)`

创建无损 PNG 缓冲区。

```javascript
const result = await processor.createPNGBuffer({
  width: 1920,
  height: 1080,
  compressionLevel: 6, // 0-9，越高文件越小
  progressive: false, // 渐进式 PNG
  colorSpace: "srgb",
});
```

#### `createWebPBuffer(options)`

创建具有出色压缩的现代 WebP 缓冲区。

```javascript
const result = await processor.createWebPBuffer({
  quality: 80, // 1-100
  width: 1920,
  lossless: false, // Use lossless compression
  effort: 4, // Encoding effort (0-6)
  colorSpace: "srgb",
});
```

#### `createAVIFBuffer(options)`

创建具有卓越压缩的下一代 AVIF 缓冲区。

```javascript
const result = await processor.createAVIFBuffer({
  quality: 50, // 1-100 (lower quality works well for AVIF)
  width: 1920,
  lossless: false,
  effort: 4, // Encoding effort (0-9)
  colorSpace: "srgb",
});
```

#### `createTIFFBuffer(options)`

创建用于专业工作流的高质量 TIFF 缓冲区。

```javascript
const result = await processor.createTIFFBuffer({
  width: 1920,
  compression: "lzw", // 'none', 'lzw', 'jpeg', 'zip'
  quality: 90, // For JPEG compression
  pyramid: false, // Multi-resolution TIFF
  colorSpace: "srgb",
});
```

#### `createPPMBuffer()`

创建用于进一步处理的原始 PPM 缓冲区。

```javascript
const result = await processor.createPPMBuffer();
// PPM is uncompressed RGB data with ASCII header
```

#### `createThumbnailJPEGBuffer(options)`

Creates an optimized thumbnail JPEG buffer.

```javascript
const result = await processor.createThumbnailJPEGBuffer({
  quality: 85,
  maxSize: 300, // Maximum dimension (width or height)
});
```

## Return Format

All buffer methods return a consistent result object:

```javascript
{
    success: true,
    buffer: Buffer,         // The actual image data
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
        jpegOptions: { /* applied options */ }
    }
}
```

## Practical Examples

### 1. Web API Endpoint (Express.js)

```javascript
const express = require("express");
const LibRaw = require("libraw");
const app = express();

app.get("/convert/:filename", async (req, res) => {
  try {
    const processor = new LibRaw();
    await processor.loadFile(`/uploads/${req.params.filename}`);

    const result = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920,
      progressive: true,
    });

    res.set({
      "Content-Type": "image/jpeg",
      "Content-Length": result.buffer.length,
      "Cache-Control": "public, max-age=3600",
    });

    res.send(result.buffer);
    await processor.close();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Cloud Storage Upload (AWS S3)

```javascript
const AWS = require("aws-sdk");
const s3 = new AWS.S3();

async function uploadToS3(processor, bucket, key) {
  const result = await processor.createJPEGBuffer({
    quality: 90,
    width: 2400,
  });

  await s3
    .upload({
      Bucket: bucket,
      Key: key,
      Body: result.buffer,
      ContentType: "image/jpeg",
      Metadata: {
        originalWidth: result.metadata.originalDimensions.width.toString(),
        originalHeight: result.metadata.originalDimensions.height.toString(),
        compressionRatio: result.metadata.fileSize.compressionRatio,
      },
    })
    .promise();

  return result.metadata;
}
```

### 3. Google Cloud Storage Upload

```javascript
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();

async function uploadToGCS(processor, bucketName, fileName) {
  const result = await processor.createWebPBuffer({
    quality: 80,
    width: 1920,
  });

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  await file.save(result.buffer, {
    metadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000",
    },
  });

  return result.metadata;
}
```

### 4. Multiple Sizes for Responsive Images

```javascript
async function createResponsiveImages(processor) {
  const sizes = [
    { name: "xl", width: 2400, quality: 90 },
    { name: "lg", width: 1920, quality: 85 },
    { name: "md", width: 1200, quality: 85 },
    { name: "sm", width: 800, quality: 80 },
    { name: "xs", width: 480, quality: 75 },
  ];

  const results = await Promise.all(
    sizes.map(async (size) => {
      const result = await processor.createJPEGBuffer({
        width: size.width,
        quality: size.quality,
        progressive: true,
      });

      return {
        size: size.name,
        width: result.metadata.outputDimensions.width,
        height: result.metadata.outputDimensions.height,
        buffer: result.buffer,
        fileSize: result.buffer.length,
      };
    })
  );

  return results;
}
```

### 5. Real-time Processing Pipeline

```javascript
const { Transform } = require("stream");

class RAWProcessor extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.options = options;
  }

  async _transform(chunk, encoding, callback) {
    try {
      const processor = new LibRaw();
      await processor.loadBuffer(chunk.data);

      const result = await processor.createJPEGBuffer({
        quality: this.options.quality || 85,
        width: this.options.width,
      });

      await processor.close();

      callback(null, {
        id: chunk.id,
        buffer: result.buffer,
        metadata: result.metadata,
      });
    } catch (error) {
      callback(error);
    }
  }
}

// Usage
const processor = new RAWProcessor({ quality: 85, width: 1920 });
inputStream.pipe(processor).pipe(outputStream);
```

### 6. Base64 Data URLs

```javascript
async function createDataURL(processor, format = "jpeg") {
  let result;
  let mimeType;

  switch (format) {
    case "png":
      result = await processor.createPNGBuffer({ width: 800 });
      mimeType = "image/png";
      break;
    case "webp":
      result = await processor.createWebPBuffer({ quality: 80, width: 800 });
      mimeType = "image/webp";
      break;
    default:
      result = await processor.createJPEGBuffer({ quality: 85, width: 800 });
      mimeType = "image/jpeg";
  }

  const base64 = result.buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}
```

### 7. Image Processing Pipeline with Caching

```javascript
class ImageProcessor {
  constructor() {
    this.cache = new Map();
  }

  async processImage(filePath, options = {}) {
    const cacheKey = `${filePath}:${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const processor = new LibRaw();
    await processor.loadFile(filePath);

    const result = await processor.createJPEGBuffer(options);
    await processor.close();

    // Cache the result (be mindful of memory usage)
    if (result.buffer.length < 5 * 1024 * 1024) {
      // Only cache < 5MB
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

## Performance Optimization

### Best Practices

1. **Choose the Right Format**:

   ```javascript
   // For web delivery
   const webp = await processor.createWebPBuffer({ quality: 80 });

   // For maximum compression
   const avif = await processor.createAVIFBuffer({ quality: 50 });

   // For compatibility
   const jpeg = await processor.createJPEGBuffer({ quality: 85 });
   ```

2. **Optimize for Speed**:

   ```javascript
   const fastResult = await processor.createJPEGBuffer({
     quality: 80,
     fastMode: true, // Sacrifice quality for speed
     effort: 1, // Minimum encoding effort
     progressive: false, // Disable progressive for speed
   });
   ```

3. **Batch Processing**:
   ```javascript
   async function processBatch(files, options) {
     const processor = new LibRaw();
     const results = [];

     for (const file of files) {
       await processor.loadFile(file);
       const result = await processor.createJPEGBuffer(options);
       results.push(result);
       // Note: processor.close() not needed between files
     }

     await processor.close(); // Close once at the end
     return results;
   }
   ```

### Memory Management

```javascript
// For large images or memory-constrained environments
class MemoryEfficientProcessor {
  async processLargeImage(filePath) {
    const processor = new LibRaw();

    try {
      await processor.loadFile(filePath);

      // Create smaller version first
      const thumbnail = await processor.createJPEGBuffer({
        width: 400,
        quality: 80,
      });

      // Then create full-size if needed
      const fullSize = await processor.createJPEGBuffer({
        quality: 85,
      });

      return { thumbnail, fullSize };
    } finally {
      await processor.close(); // Always cleanup
    }
  }
}
```

## Error Handling

```javascript
async function robustImageProcessing(filePath, options) {
  const processor = new LibRaw();

  try {
    await processor.loadFile(filePath);

    const result = await processor.createJPEGBuffer(options);

    if (!result.success) {
      throw new Error("Buffer creation failed");
    }

    if (result.buffer.length === 0) {
      throw new Error("Empty buffer returned");
    }

    return result;
  } catch (error) {
    console.error("Processing failed:", error.message);

    // Fallback or retry logic
    if (error.message.includes("memory")) {
      // Try with lower quality/smaller size
      return processor.createJPEGBuffer({
        ...options,
        quality: Math.max(50, options.quality - 20),
        width: options.width ? Math.floor(options.width * 0.75) : undefined,
      });
    }

    throw error;
  } finally {
    await processor.close();
  }
}
```

## Format Comparison

| Format   | Compression     | Quality     | Speed     | Use Case                          |
| -------- | --------------- | ----------- | --------- | --------------------------------- |
| **AVIF** | Excellent       | High        | Slow      | Next-gen web, maximum compression |
| **WebP** | Very Good       | High        | Fast      | Modern web, good balance          |
| **JPEG** | Good            | Medium-High | Very Fast | Universal compatibility           |
| **PNG**  | Poor (lossless) | Perfect     | Fast      | Graphics, transparency needed     |
| **TIFF** | Variable        | Perfect     | Medium    | Professional, archival            |
| **PPM**  | None            | Perfect     | Very Fast | Raw processing, pipelines         |

## Integration Examples

### Next.js API Route

```javascript
// pages/api/convert.js
import LibRaw from "libraw";
import formidable from "formidable";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: "Upload failed" });
    }

    const processor = new LibRaw();

    try {
      await processor.loadFile(files.image.filepath);

      const result = await processor.createJPEGBuffer({
        quality: parseInt(fields.quality) || 85,
        width: parseInt(fields.width) || undefined,
      });

      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Length", result.buffer.length);
      res.send(result.buffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await processor.close();
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

### Serverless Function (Vercel)

```javascript
// api/process-image.js
const LibRaw = require("libraw");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const processor = new LibRaw();

  try {
    // Load from buffer (uploaded data)
    await processor.loadBuffer(req.body);

    const result = await processor.createWebPBuffer({
      quality: 80,
      width: 1920,
    });

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(result.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await processor.close();
  }
};
```

## Summary

The buffer API transforms LibRaw from a traditional file-processing library into a modern, cloud-ready image processing solution. Key benefits:

- **🚀 Performance**: 20-50% faster than file-based operations
- **🌐 Web-Ready**: Perfect for HTTP APIs and real-time services
- **☁️ Cloud-Native**: Direct integration with cloud storage
- **🔄 Streamable**: Works with Node.js streams and pipelines
- **💾 Efficient**: No temporary files or disk I/O
- **⚡ Scalable**: Ideal for serverless and containerized deployments

Choose buffer methods for modern applications, web services, and cloud deployments. Use file methods for traditional desktop applications and when permanent file storage is required.
