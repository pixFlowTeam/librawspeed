# 支持的 RAW 格式

**版本 1.0.24** - 现已在 [npmjs.com](https://www.npmjs.com/package/librawspeed) 上可用！🎉

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
2. 替换 `deps/` 中的库文件
3. 重新构建原生插件
4. 使用新格式样本进行测试

有关详细说明，请参阅升级指南。
