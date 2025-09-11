# API 文档

## LibRaw 类

用于处理 RAW 图像文件的主类。

### 构造函数

```javascript
const LibRaw = require('librawspeed');
const processor = new LibRaw();
```

### 方法

#### loadFile(filepath)

加载 RAW 图像文件进行处理。

**参数:**
- `filepath` (string): RAW 图像文件的绝对路径

**返回:** `Promise<void>`

**抛出:** 如果文件无法加载或不支持则抛出错误

**示例:**
```javascript
await processor.loadFile('/path/to/image.nef');
```

#### getMetadata()

从已加载的 RAW 图像中提取元数据。

**返回:** `Promise<LibRawMetadata>`

**示例:**
```javascript
const metadata = await processor.getMetadata();
console.log(`相机: ${metadata.make} ${metadata.model}`);
console.log(`ISO: ${metadata.iso}, f/${metadata.aperture}, 1/${Math.round(1/metadata.shutterSpeed)}s`);
```

#### getImageSize()

获取已加载 RAW 图像的尺寸。

**返回:** `Promise<LibRawImageSize>`

**示例:**
```javascript
const size = await processor.getImageSize();
console.log(`分辨率: ${size.width}x${size.height}`);
```

#### close()

关闭处理器并释放资源。

**返回:** `Promise<void>`

**示例:**
```javascript
await processor.close();
```

## 接口

### LibRawMetadata

```typescript
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
```

### LibRawImageSize

```typescript
interface LibRawImageSize {
  width: number;   // 图像宽度（像素）
  height: number;  // 图像高度（像素）
}
```

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

```javascript
try {
  await processor.loadFile('image.nef');
  const metadata = await processor.getMetadata();
  console.log(metadata);
} catch (error) {
  console.error('处理失败:', error.message);
} finally {
  await processor.close();
}
```

## 完整示例

```javascript
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
    console.log(`相机: ${metadata.make} ${metadata.model}`);
    console.log(`分辨率: ${size.width}x${size.height}`);
    console.log(`Settings: ISO ${metadata.iso}, f/${metadata.aperture}, 1/${Math.round(1/metadata.shutterSpeed)}s`);
    
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
```
