# 支持的 RAW 格式

## 概述

该库通过 LibRaw 支持 100+ 种 RAW 图像格式。以下是最常见的格式：

## 主要相机制造商

### Canon
- **CR2** - Canon RAW 版本 2（较旧型号）
- **CR3** - Canon RAW 版本 3（较新型号如 EOS R、EOS M50）
- **CRW** - Canon RAW（非常旧的型号）

### Nikon  
- **NEF** - Nikon 电子格式（所有 Nikon 单反和无反相机）

### Sony
- **ARW** - Sony Alpha RAW（α 系列相机）
- **SR2** - Sony RAW 版本 2（一些较旧型号）
- **SRF** - Sony RAW 格式（非常旧的型号）

### Fujifilm
- **RAF** - Fuji RAW 格式（X 系列和 GFX 相机）

### Panasonic/Lumix
- **RW2** - Panasonic RAW 版本 2（GH、G、FZ 系列）
- **RAW** - Panasonic RAW（较旧型号）

### Olympus
- **ORF** - Olympus RAW 格式（OM-D、PEN 系列）

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

## Adding New Format Support

LibRaw regularly adds support for new cameras. To update:

1. Download newer LibRaw version
2. Replace library files in `deps/`
3. Rebuild the native addon
4. Test with new format samples

See the upgrade guide for detailed instructions.
