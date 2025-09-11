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

| 格式 | 扩展名 | 制造商 | 描述 |
|------|--------|--------|------|
| NEF  | .nef   | Nikon  | Nikon 电子格式 |
| CR2/CR3| .cr2/.cr3 | Canon | Canon RAW 版本 2/3 |
| ARW  | .arw   | Sony   | Sony Alpha RAW |
| RAF  | .raf   | Fujifilm | Fuji RAW 格式 |
| RW2  | .rw2   | Panasonic | Panasonic RAW 版本 2 |
| DNG  | .dng   | Adobe/各种 | 数字负片 (Adobe) |

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
    console.log(\`设置: ISO \${metadata.iso}, f/\${metadata.aperture}, 1/\${Math.round(1/metadata.shutterSpeed)}s\`);
    
    return { metadata, size };
    
  } catch (error) {
    console.error('处理文件时出错:', error.message);
    throw error;
  } finally {
    // 始终清理资源
    await processor.close();
  }
}

// 使用方法
processRAWFile('/path/to/image.nef')
  .then(result => console.log('处理完成'))
  .catch(error => console.error('失败:', error));
\`\`\`
`;

  // Write API documentation
  fs.writeFileSync(path.join(__dirname, "../docs/API.md"), apiDocs);
  console.log("✅ Generated API.md");

  // Generate usage examples
  const examples = `# 使用示例

## 基础 RAW 文件处理

\`\`\`javascript
const LibRaw = require('librawspeed');

async function basicExample() {
  const processor = new LibRaw();
  
  try {
    await processor.loadFile('photo.nef');
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();
    
    console.log(\`📷 \${metadata.make} \${metadata.model}\`);
    console.log(\`📐 \${size.width}x\${size.height} 像素\`);
    console.log(\`⚙️  ISO \${metadata.iso}, f/\${metadata.aperture}\`);
    
  } finally {
    await processor.close();
  }
}
\`\`\`

## 批量处理多个文件

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
      console.error(\`处理 \${file} 失败: \${error.message}\`);
    } finally {
      await processor.close();
    }
  }
  
  return results;
}
\`\`\`

## 照片画廊元数据提取

\`\`\`javascript
async function extractGalleryMetadata(photoPath) {
  const processor = new LibRaw();
  
  try {
    await processor.loadFile(photoPath);
    const metadata = await processor.getMetadata();
    const size = await processor.getImageSize();
    
    return {
      // 基本信息
      camera: {
        make: metadata.make,
        model: metadata.model
      },
      
      // 技术设置
      settings: {
        iso: metadata.iso,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
        focalLength: metadata.focalLength
      },
      
      // 图像规格
      image: {
        width: size.width,
        height: size.height,
        megapixels: Number((size.width * size.height / 1000000).toFixed(1)),
        aspectRatio: (size.width / size.height).toFixed(2)
      },
      
      // 拍摄信息
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

## 性能监控

\`\`\`javascript
async function monitoredProcessing(filepath) {
  const processor = new LibRaw();
  const startTime = Date.now();
  
  try {
    console.time('总处理时间');
    
    console.time('文件加载');
    await processor.loadFile(filepath);
    console.timeEnd('文件加载');
    
    console.time('元数据提取');
    const metadata = await processor.getMetadata();
    console.timeEnd('元数据提取');
    
    console.time('尺寸检测');
    const size = await processor.getImageSize();
    console.timeEnd('尺寸检测');
    
    console.timeEnd('总处理时间');
    
    const fileStats = require('fs').statSync(filepath);
    const throughput = fileStats.size / (Date.now() - startTime) * 1000 / 1024 / 1024;
    
    console.log(\`📊 吞吐量: \${throughput.toFixed(2)} MB/s\`);
    
    return { metadata, size };
    
  } finally {
    await processor.close();
  }
}
\`\`\`

## 错误处理最佳实践

\`\`\`javascript
async function robustProcessing(filepath) {
  const processor = new LibRaw();
  
  try {
    // 验证文件存在
    if (!require('fs').existsSync(filepath)) {
      throw new Error(\`文件未找到: \${filepath}\`);
    }
    
    // 检查文件扩展名
    const ext = require('path').extname(filepath).toLowerCase();
    const supported = ['.nef', '.cr2', '.cr3', '.arw', '.raf', '.rw2', '.dng'];
    if (!supported.includes(ext)) {
      throw new Error(\`不支持的格式: \${ext}\`);
    }
    
    await processor.loadFile(filepath);
    
    // 带超时的提取
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('处理超时')), 30000)
    );
    
    const processing = Promise.all([
      processor.getMetadata(),
      processor.getImageSize()
    ]);
    
    const [metadata, size] = await Promise.race([processing, timeout]);
    
    return { metadata, size, success: true };
    
  } catch (error) {
    console.error(\`处理 \${filepath} 时出错:\`, error.message);
    return { error: error.message, success: false };
  } finally {
    try {
      await processor.close();
    } catch (closeError) {
      console.warn('警告: 关闭处理器失败:', closeError.message);
    }
  }
}
\`\`\`

## 与 Express.js 集成

\`\`\`javascript
const express = require('express');
const multer = require('multer');
const LibRaw = require('librawspeed');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/analyze-raw', upload.single('rawFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
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
    // 清理上传的文件
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
  const formats = `# 支持的 RAW 格式

## 概述

本库通过 LibRaw 支持 100+ 种 RAW 图像格式。以下是最常见的格式：

## 主要相机制造商

### Canon
- **CR2** - Canon RAW 版本 2（较老型号）
- **CR3** - Canon RAW 版本 3（较新型号如 EOS R, EOS M50）
- **CRW** - Canon RAW（很老的型号）

### Nikon  
- **NEF** - Nikon 电子格式（所有 Nikon DSLR 和无反相机）

### Sony
- **ARW** - Sony Alpha RAW（α 系列相机）
- **SR2** - Sony RAW 版本 2（部分较老型号）
- **SRF** - Sony RAW 格式（很老的型号）

### Fujifilm
- **RAF** - Fuji RAW 格式（X 系列和 GFX 相机）

### Panasonic/Lumix
- **RW2** - Panasonic RAW 版本 2（GH, G, FZ 系列）
- **RAW** - Panasonic RAW（较老型号）

### Olympus
- **ORF** - Olympus RAW 格式（OM-D, PEN 系列）

### Leica
- **DNG** - 数字负片（Adobe 标准，Leica 使用）
- **RWL** - Leica RAW（部分型号）

### 其他制造商
- **DNG** - Adobe 数字负片（通用格式）
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
- **NRW** - Nikon RAW（小格式）
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

## 格式功能

| 功能 | 支持级别 |
|------|----------|
| 元数据提取 | ✅ 所有格式完全支持 |
| 图像尺寸 | ✅ 完全支持 |
| 相机设置 | ✅ ISO、光圈、快门、焦距 |
| 时间戳 | ✅ 拍摄日期/时间 |
| 色彩配置文件信息 | ✅ 色彩空间和滤镜数据 |
| 缩略图提取 | ⚠️ 尚未实现 |
| 完整图像解码 | ⚠️ 尚未实现 |

## 兼容性说明

### Windows
- 需要 Visual Studio Build Tools
- 所有格式完全支持
- 性能优化构建

### macOS  
- 需要 Xcode Command Line Tools
- 所有格式完全支持
- Apple Silicon 原生 ARM64 支持

### Linux
- 需要 build-essential 包
- 所有格式完全支持
- 在 Ubuntu、CentOS、Alpine 上测试

## 测试覆盖

我们的测试套件涵盖这些示例格式：
- ✅ Canon CR3（Canon 相机）
- ✅ Nikon NEF（Nikon D5600 等）
- ✅ Fujifilm RAF（X 系列相机）
- ✅ Adobe DNG（Leica、智能手机）
- ✅ Panasonic RW2（Lumix 相机）
- ✅ Sony ARW（Alpha 相机）

## 性能特征

| 格式 | 典型大小 | 处理速度 | 备注 |
|------|----------|----------|------|
| NEF | 15-45 MB | 快速 | 优化良好 |
| CR3 | 25-65 MB | 快速 | 高效格式 |
| ARW | 20-60 MB | 快速 | 压缩良好 |
| RAF | 30-80 MB | 中等 | 文件较大 |
| RW2 | 15-40 MB | 快速 | 紧凑格式 |
| DNG | 20-100 MB | 中等 | 因来源而异 |

## 添加新格式支持

LibRaw 定期添加对新相机的支持。要更新：

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
