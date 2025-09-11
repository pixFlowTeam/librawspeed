const fs = require("fs");
const path = require("path");

function generateAPIDocumentation() {
  console.log("📚 生成 API 文档...\n");

  const apiDocs = `# API 文档

## LibRaw 类

用于处理 RAW 图像文件的主类。

### 构造函数

\`\`\`javascript
const LibRaw = require('librawspeed');
const processor = new LibRaw();
\`\`\`

### 方法

#### loadFile(filepath)

加载 RAW 图像文件进行处理。

**参数:**
- \`filepath\` (string): RAW 图像文件的绝对路径

**返回:** \`Promise<void>\`

**抛出:** 如果文件无法加载或不支持则抛出错误

**示例:**
\`\`\`javascript
await processor.loadFile('/path/to/image.nef');
\`\`\`

#### getMetadata()

从已加载的 RAW 图像中提取元数据。

**返回:** \`Promise<LibRawMetadata>\`

**示例:**
\`\`\`javascript
const metadata = await processor.getMetadata();
console.log(\`相机: \${metadata.make} \${metadata.model}\`);
console.log(\`ISO: \${metadata.iso}, f/\${metadata.aperture}, 1/\${Math.round(1/metadata.shutterSpeed)}s\`);
\`\`\`

#### getImageSize()

获取已加载 RAW 图像的尺寸。

**返回:** \`Promise<LibRawImageSize>\`

**示例:**
\`\`\`javascript
const size = await processor.getImageSize();
console.log(\`分辨率: \${size.width}x\${size.height}\`);
\`\`\`

#### close()

关闭处理器并释放资源。

**返回:** \`Promise<void>\`

**示例:**
\`\`\`javascript
await processor.close();
\`\`\`

## 接口

### LibRawMetadata

\`\`\`typescript
interface LibRawMetadata {
  make: string;           // 相机制造商
  model: string;          // 相机型号  
  iso: number;            // ISO 感光度
  aperture: number;       // 光圈 f 值
  shutterSpeed: number;   // 快门速度（秒）
  focalLength: number;    // 焦距（毫米）
  timestamp: number;      // Unix 时间戳
  colors: number;         // 颜色通道数
  filters: number;        // 颜色滤镜模式
  description?: string;   // 相机描述
  artist?: string;        // 摄影师姓名
  copyright?: string;     // 版权信息
}
\`\`\`

### LibRawImageSize

\`\`\`typescript
interface LibRawImageSize {
  width: number;   // 图像宽度（像素）
  height: number;  // 图像高度（像素）
}
\`\`\`

## 支持的格式

| Format | Extension | Manufacturer | Description |
|--------|-----------|--------------|-------------|
| NEF    | .nef      | Nikon        | Nikon Electronic Format |
| CR2/CR3| .cr2/.cr3 | Canon        | Canon RAW version 2/3 |
| ARW    | .arw      | Sony         | Sony Alpha RAW |
| RAF    | .raf      | Fujifilm     | Fuji RAW Format |
| RW2    | .rw2      | Panasonic    | Panasonic RAW version 2 |
| DNG    | .dng      | Adobe/Various| Digital Negative (Adobe) |

## 错误处理

所有方法都返回 Promise 并可能抛出错误。始终使用 try-catch 或 .catch():

\`\`\`javascript
try {
  await processor.loadFile('image.nef');
  const metadata = await processor.getMetadata();
  console.log(metadata);
} catch (error) {
  console.error('处理失败:', error.message);
} finally {
  await processor.close();
}
\`\`\`

## 完整示例

\`\`\`javascript
const LibRaw = require('librawspeed');

async function processRAWFile(filepath) {
  const processor = new LibRaw();
  
  try {
    // 加载 RAW 文件
    await processor.loadFile(filepath);
    
    // 提取元数据
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();
    
    // 显示信息
    console.log(\`相机: \${metadata.make} \${metadata.model}\`);
    console.log(\`分辨率: \${size.width}x\${size.height}\`);
    console.log(\`Settings: ISO \${metadata.iso}, f/\${metadata.aperture}, 1/\${Math.round(1/metadata.shutterSpeed)}s\`);
    
    return { metadata, size };
    
  } catch (error) {
    console.error('Error processing file:', error.message);
    throw error;
  } finally {
    // Always cleanup
    await processor.close();
  }
}

// Usage
processRAWFile('/path/to/image.nef')
  .then(result => console.log('Processing complete'))
  .catch(error => console.error('Failed:', error));
\`\`\`
`;

  // Write API documentation
  fs.writeFileSync(path.join(__dirname, "../docs/API.md"), apiDocs);
  console.log("✅ Generated API.md");

  // Generate usage examples
  const examples = `# Usage Examples

## Basic RAW File Processing

\`\`\`javascript
const LibRaw = require('librawspeed');

async function basicExample() {
  const processor = new LibRaw();
  
  try {
    await processor.loadFile('photo.nef');
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();
    
    console.log(\`📷 \${metadata.make} \${metadata.model}\`);
    console.log(\`📐 \${size.width}x\${size.height} pixels\`);
    console.log(\`⚙️  ISO \${metadata.iso}, f/\${metadata.aperture}\`);
    
  } finally {
    await processor.close();
  }
}
\`\`\`

## Batch Processing Multiple Files

\`\`\`javascript
const fs = require('fs');
const path = require('path');

async function batchProcess(directory) {
  const files = fs.readdirSync(directory)
    .filter(file => ['.nef', '.cr3', '.arw'].includes(path.extname(file).toLowerCase()));
  
  const results = [];
  
  for (const file of files) {
    const processor = new LibRaw();
    try {
      await processor.loadFile(path.join(directory, file));
      const metadata = await processor.getMetadata();
      const size = await processor.getImageSize();
      
      results.push({
        filename: file,
        camera: \`\${metadata.make} \${metadata.model}\`,
        megapixels: (size.width * size.height / 1000000).toFixed(1),
        iso: metadata.iso,
        captureDate: new Date(metadata.timestamp * 1000)
      });
      
    } catch (error) {
      console.error(\`Failed to process \${file}: \${error.message}\`);
    } finally {
      await processor.close();
    }
  }
  
  return results;
}
\`\`\`

## Photo Gallery Metadata Extraction

\`\`\`javascript
async function extractGalleryMetadata(photoPath) {
  const processor = new LibRaw();
  
  try {
    await processor.loadFile(photoPath);
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();
    
    return {
      // Basic info
      camera: {
        make: metadata.make,
        model: metadata.model
      },
      
      // Technical settings
      settings: {
        iso: metadata.iso,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
        focalLength: metadata.focalLength
      },
      
      // Image specs
      image: {
        width: size.width,
        height: size.height,
        megapixels: Number((size.width * size.height / 1000000).toFixed(1)),
        aspectRatio: (size.width / size.height).toFixed(2)
      },
      
      // Capture info
      capture: {
        timestamp: metadata.timestamp,
        date: new Date(metadata.timestamp * 1000).toISOString(),
        artist: metadata.artist,
        copyright: metadata.copyright
      }
    };
    
  } finally {
    await processor.close();
  }
}
\`\`\`

## Performance Monitoring

\`\`\`javascript
async function monitoredProcessing(filepath) {
  const processor = new LibRaw();
  const startTime = Date.now();
  
  try {
    console.time('Total Processing');
    
    console.time('File Loading');
    await processor.loadFile(filepath);
    console.timeEnd('File Loading');
    
    console.time('Metadata Extraction');
    const metadata = await processor.getMetadata();
    console.timeEnd('Metadata Extraction');
    
    console.time('Size Detection');
    const size = await processor.getImageSize();
    console.timeEnd('Size Detection');
    
    console.timeEnd('Total Processing');
    
    const fileStats = require('fs').statSync(filepath);
    const throughput = fileStats.size / (Date.now() - startTime) * 1000 / 1024 / 1024;
    
    console.log(\`📊 Throughput: \${throughput.toFixed(2)} MB/s\`);
    
    return { metadata, size };
    
  } finally {
    await processor.close();
  }
}
\`\`\`

## Error Handling Best Practices

\`\`\`javascript
async function robustProcessing(filepath) {
  const processor = new LibRaw();
  
  try {
    // Validate file exists
    if (!require('fs').existsSync(filepath)) {
      throw new Error(\`File not found: \${filepath}\`);
    }
    
    // Check file extension
    const ext = require('path').extname(filepath).toLowerCase();
    const supported = ['.nef', '.cr2', '.cr3', '.arw', '.raf', '.rw2', '.dng'];
    if (!supported.includes(ext)) {
      throw new Error(\`Unsupported format: \${ext}\`);
    }
    
    await processor.loadFile(filepath);
    
    // Extract with timeout
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Processing timeout')), 30000)
    );
    
    const processing = Promise.all([
      processor.getMetadata(),
      processor.getImageSize()
    ]);
    
    const [metadata, size] = await Promise.race([processing, timeout]);
    
    return { metadata, size, success: true };
    
  } catch (error) {
    console.error(\`Processing error for \${filepath}:\`, error.message);
    return { error: error.message, success: false };
  } finally {
    try {
      await processor.close();
    } catch (closeError) {
      console.warn('Warning: Failed to close processor:', closeError.message);
    }
  }
}
\`\`\`

## Integration with Express.js

\`\`\`javascript
const express = require('express');
const multer = require('multer');
const LibRaw = require('librawspeed');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/analyze-raw', upload.single('rawFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const processor = new LibRaw();
  
  try {
    await processor.loadFile(req.file.path);
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();
    
    res.json({
      success: true,
      data: {
        camera: \`\${metadata.make} \${metadata.model}\`,
        resolution: \`\${size.width}x\${size.height}\`,
        settings: {
          iso: metadata.iso,
          aperture: metadata.aperture,
          shutterSpeed: metadata.shutterSpeed,
          focalLength: metadata.focalLength
        },
        captureDate: new Date(metadata.timestamp * 1000).toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await processor.close();
    // Clean up uploaded file
    require('fs').unlinkSync(req.file.path);
  }
});
\`\`\`
`;

  // Create docs directory if it doesn't exist
  const docsDir = path.join(__dirname, "../docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }

  fs.writeFileSync(path.join(docsDir, "EXAMPLES.md"), examples);
  console.log("✅ Generated EXAMPLES.md");

  // Generate supported formats documentation
  const formats = `# Supported RAW Formats

## Overview

This library supports 100+ RAW image formats through LibRaw. Below are the most common formats:

## Major Camera Manufacturers

### Canon
- **CR2** - Canon RAW version 2 (older models)
- **CR3** - Canon RAW version 3 (newer models like EOS R, EOS M50)
- **CRW** - Canon RAW (very old models)

### Nikon  
- **NEF** - Nikon Electronic Format (all Nikon DSLRs and mirrorless)

### Sony
- **ARW** - Sony Alpha RAW (α series cameras)
- **SR2** - Sony RAW version 2 (some older models)
- **SRF** - Sony RAW Format (very old models)

### Fujifilm
- **RAF** - Fuji RAW Format (X-series and GFX cameras)

### Panasonic/Lumix
- **RW2** - Panasonic RAW version 2 (GH, G, FZ series)
- **RAW** - Panasonic RAW (older models)

### Olympus
- **ORF** - Olympus RAW Format (OM-D, PEN series)

### Leica
- **DNG** - Digital Negative (Adobe standard, used by Leica)
- **RWL** - Leica RAW (some models)

### Other Manufacturers
- **DNG** - Adobe Digital Negative (universal format)
- **3FR** - Hasselblad RAW
- **ARI** - ARRI Alexa RAW
- **BAY** - Casio RAW
- **BMQ** - NuCore RAW
- **CAP** - Phase One RAW
- **CINE** - Phantom RAW
- **DXO** - DxO RAW
- **EIP** - Phase One RAW
- **ERF** - Epson RAW
- **FFF** - Imacon RAW
- **IIQ** - Phase One RAW
- **K25** - Kodak RAW
- **KC2** - Kodak RAW
- **KDC** - Kodak RAW
- **MDC** - Minolta RAW
- **MEF** - Mamiya RAW
- **MFW** - Mamiya RAW
- **MOS** - Leaf RAW
- **MRW** - Minolta RAW
- **NAK** - Nintendo RAW
- **NRW** - Nikon RAW (small format)
- **PEF** - Pentax RAW
- **PXN** - Logitech RAW
- **QTK** - Apple QuickTake RAW
- **R3D** - RED Digital Cinema RAW
- **RAD** - Radiometric RAW
- **RDC** - Digital Dream RAW
- **RMF** - Raw Media Format
- **RW2** - Panasonic RAW
- **RWZ** - Rawzor RAW
- **SR2** - Sony RAW
- **SRF** - Sony RAW
- **STI** - Sinar RAW
- **X3F** - Sigma RAW (Foveon)

## Format Capabilities

| Feature | Support Level |
|---------|---------------|
| Metadata Extraction | ✅ Full support for all formats |
| Image Dimensions | ✅ Full support |
| Camera Settings | ✅ ISO, Aperture, Shutter, Focal Length |
| Timestamp | ✅ Capture date/time |
| Color Profile Info | ✅ Color space and filter data |
| Thumbnail Extraction | ⚠️ Not yet implemented |
| Full Image Decode | ⚠️ Not yet implemented |

## Compatibility Notes

### Windows
- Requires Visual Studio Build Tools
- Full support for all formats
- Performance optimized builds

### macOS  
- Requires Xcode Command Line Tools
- Full support for all formats
- Native ARM64 support on Apple Silicon

### Linux
- Requires build-essential package
- Full support for all formats
- Tested on Ubuntu, CentOS, Alpine

## Testing Coverage

Our test suite covers these sample formats:
- ✅ Canon CR3 (Canon cameras)
- ✅ Nikon NEF (Nikon D5600, etc.)
- ✅ Fujifilm RAF (X-series cameras)
- ✅ Adobe DNG (Leica, smartphones)
- ✅ Panasonic RW2 (Lumix cameras)
- ✅ Sony ARW (Alpha cameras)

## Performance Characteristics

| Format | Typical Size | Processing Speed | Notes |
|--------|-------------|------------------|-------|
| NEF | 15-45 MB | Fast | Well optimized |
| CR3 | 25-65 MB | Fast | Efficient format |
| ARW | 20-60 MB | Fast | Good compression |
| RAF | 30-80 MB | Medium | Larger files |
| RW2 | 15-40 MB | Fast | Compact format |
| DNG | 20-100 MB | Medium | Varies by source |

## 添加新格式支持

LibRaw 定期添加对新相机的支持。要更新:

1. 下载更新的 LibRaw 版本
2. 替换 \`deps/\` 中的库文件
3. 重新构建原生插件
4. 使用新格式样本进行测试

有关详细说明，请参阅升级指南。
`;

  fs.writeFileSync(path.join(docsDir, "FORMATS.md"), formats);
  console.log("✅ 已生成 FORMATS.md");

  console.log("\n📚 文档生成完成!");
}

// Export the function
module.exports = generateAPIDocumentation;

// Run if executed directly
if (require.main === module) {
  generateAPIDocumentation();
}
