# Supported RAW Formats

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
2. 替换 `deps/` 中的库文件
3. 重新构建原生插件
4. 使用新格式样本进行测试

有关详细说明，请参阅升级指南。
