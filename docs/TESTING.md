# LibRaw Test Suites Documentation

## Overview

This document describes the comprehensive test suites for the LibRaw Node.js wrapper, specifically covering image conversion, thumbnail extraction, and format conversion capabilities.

## Test Suites

### 1. Image Processing Test Suite (`image-processing.test.js`)

Tests comprehensive image conversion and processing workflows.

**Features Tested:**

- ✅ Thumbnail Extraction (unpackThumbnail, createMemoryThumbnail, writeThumbnail)
- ✅ Image Conversion (raw2Image, processImage, createMemoryImage)
- ✅ Advanced Processing (subtractBlack, adjustMaximum, memory operations)
- ✅ Parameter Configuration (output params, color spaces, bit depths)
- ✅ Memory Operations (buffer management, memory copying)

**Usage:**

```bash
npm run test:image-processing
```

**Sample Output:**

```
🧪 LibRaw Image Processing Test Suite
=====================================
Found 3 test files

🖼️  Testing Thumbnail Extraction
================================
Testing thumbnail extraction: sample.cr2
  ✓ File loaded successfully
  ✓ Thumbnail unpacked in 45ms
  ✓ Memory thumbnail: 160x120, 19200 bytes
  ✓ Thumbnail file written: output/thumb_sample.jpg (8456 bytes)

🔄 Testing Image Conversion
===========================
Testing image conversion: sample.cr2
  ✓ File loaded successfully
  ✓ Image dimensions: 6000x4000
  ✓ Black subtraction: Success
  ✓ RAW to image conversion: Success
  ✓ Image processing: Success
  ✓ Memory image created: 6000x4000, 16-bit, 144000000 bytes
```

### 2. Format Conversion Test Suite (`format-conversion.test.js`)

Tests various output formats, color spaces, and quality settings.

**Features Tested:**

- ✅ Output Formats (PPM, TIFF format validation)
- ✅ Color Spaces (sRGB, Adobe RGB, Wide Gamut, ProPhoto, XYZ)
- ✅ Bit Depths (8-bit, 16-bit with utilization analysis)
- ✅ Quality Settings (Fast Preview, Standard, High Quality)

**Usage:**

```bash
npm run test:format-conversion
```

**Sample Output:**

```
🧪 LibRaw Format Conversion Test Suite
======================================
Found 2 test files

📄 Testing Output Formats
=========================
Processing file: sample.cr2
  Testing PPM (Portable Pixmap)...
    ✓ Created: 144000054 bytes in 1250ms
    ✓ Format validated: Binary PPM format detected
  Testing TIFF (Tagged Image File)...
    ✓ Created: 144012344 bytes in 1180ms
    ✓ Format validated: TIFF format (little-endian)

🎨 Testing Color Spaces
=======================
Testing color space: sRGB
  ✓ Processed: 6000x4000, 3 channels
  ✓ Output file: 144000054 bytes
Testing color space: Adobe RGB
  ✓ Processed: 6000x4000, 3 channels
  ✓ Output file: 144000054 bytes
```

### 3. Thumbnail Extraction Test Suite (`thumbnail-extraction.test.js`)

Comprehensive testing of thumbnail operations and format analysis.

**Features Tested:**

- ✅ Thumbnail Detection (thumbOK, getThumbnailList)
- ✅ Extraction Methods (unpackThumbnail, createMemoryThumbnail)
- ✅ Format Analysis (JPEG, TIFF, PNG, Raw RGB detection)
- ✅ Performance Metrics (extraction speed, throughput)
- ✅ Data Validation (header verification, size checks)

**Usage:**

```bash
npm run test:thumbnail-extraction
```

**Sample Output:**

```
🧪 LibRaw Thumbnail Extraction Test Suite
==========================================
Found 5 test files

🔍 Testing Thumbnail Detection
==============================
Detecting thumbnails in: sample.cr2
  ✓ Thumbnail available: Yes
  ✓ Found 1 thumbnail(s):
    [0] 160x120, format: JPEG, size: 19200 bytes

📤 Testing Thumbnail Extraction
===============================
Extracting thumbnail from: sample.cr2
  ✓ Thumbnail unpacked in 23ms
  ✓ Memory thumbnail: 160x120, 19200 bytes
  ✓ Validation: Passed - JPEG thumbnail 160x120
  ✓ Thumbnail file written: output/sample_thumb.jpg (8456 bytes)
  ✓ File format: JPEG with metadata (Valid)

🎨 Testing Thumbnail Format Variations
======================================
Analyzing thumbnail format: sample.cr2
  ✓ Format: JPEG (100% confidence)
    JPEG quality: ~75%, subsampling: 4:2:0

⚡ Testing Thumbnail Performance
===============================
Performance test: sample.cr2
  ✓ Total: 45ms (load: 12ms, unpack: 23ms, memory: 10ms)
    Thumbnail: 160x120, 19200 bytes

Performance Summary:
  Average processing time: 45ms
  Thumbnail throughput: 426.67 KB/s
  Successful extractions: 5/5
```

## Comprehensive Test Runner

The updated `comprehensive.test.js` now includes all new test suites:

```bash
npm run test:comprehensive
```

This runs:

1. **Basic LibRaw functionality tests** - Core API validation
2. **Image Processing Test Suite** - Advanced conversion workflows
3. **Format Conversion Test Suite** - Output format validation
4. **Thumbnail Extraction Test Suite** - Thumbnail operations

## Test Data Requirements

### Sample Images Directory

Tests expect sample RAW files in `sample-images/` directory:

```
sample-images/
├── sample.cr2        # Canon RAW
├── sample.nef        # Nikon RAW
├── sample.arw        # Sony RAW
├── sample.dng        # Adobe DNG
└── sample.raf        # Fujifilm RAW
```

**Supported formats:**

- Canon: `.cr2`, `.cr3`
- Nikon: `.nef`
- Sony: `.arw`
- Adobe: `.dng`
- Fujifilm: `.raf`
- Panasonic: `.rw2`

### Output Directory

Tests create temporary output files in `test/output/` and `test/format-output/` which are automatically cleaned up.

## Performance Metrics

### Typical Performance Results

| Operation             | File Size        | Processing Time | Throughput |
| --------------------- | ---------------- | --------------- | ---------- |
| File Loading          | 25MB RAW         | 15-30ms         | 800MB/s+   |
| Thumbnail Extraction  | 160x120 JPEG     | 20-50ms         | 400KB/s+   |
| Full Image Conversion | 6000x4000 16-bit | 1000-2000ms     | 70-140MB/s |
| Format Writing (PPM)  | 144MB output     | 200-500ms       | 300MB/s+   |
| Format Writing (TIFF) | 144MB output     | 800-1200ms      | 120MB/s+   |

### Memory Usage

| Operation        | Peak Memory | Buffer Size        |
| ---------------- | ----------- | ------------------ |
| RAW Loading      | ~50MB       | 25MB file buffer   |
| Image Processing | ~200MB      | 144MB image buffer |
| Thumbnail        | ~1MB        | 20KB thumb buffer  |

## Error Handling

Tests validate proper error handling for:

- ✅ Invalid file paths
- ✅ Unsupported formats
- ✅ Corrupted data
- ✅ Memory allocation failures
- ✅ Processing parameter errors

## Integration with CI/CD

Tests support different environments:

```bash
# Full test suite (requires sample files)
npm run test:comprehensive

# Individual test suites
npm run test:image-processing
npm run test:format-conversion
npm run test:thumbnail-extraction

# Legacy basic tests (no sample files required)
npm run test:basic
```

## Troubleshooting

### Common Issues

1. **No sample files found**

   ```
   ❌ No RAW test files found in sample-images directory
   💡 Please add some RAW files (CR2, CR3, NEF, ARW, DNG, RAF, RW2) to test/
   ```

   **Solution:** Add sample RAW files to `sample-images/` directory

2. **LibRaw library not found**

   ```
   ❌ Error loading native module
   ```

   **Solution:** Run `npm run build` or `npm install`

3. **Memory allocation errors**

   ```
   ❌ Memory operations test failed: Cannot allocate memory
   ```

   **Solution:** Use smaller test files or increase available memory

4. **Format validation failures**
   ```
   ⚠️ Format validation failed: Invalid PPM header
   ```
   **Solution:** Check LibRaw version compatibility and output parameters

### Debug Mode

Enable verbose logging:

```bash
DEBUG=libraw:* npm run test:comprehensive
```

## Extending Tests

### Adding New Test Categories

1. Create new test file: `test/my-feature.test.js`
2. Export test class: `module.exports = { MyFeatureTests }`
3. Add to `comprehensive.test.js`:
   ```javascript
   const { MyFeatureTests } = require("./my-feature.test");
   // Add to testSuites array
   ```
4. Add npm script to `package.json`:
   ```json
   "test:my-feature": "node test/my-feature.test.js"
   ```

### Test File Template

```javascript
class MyFeatureTests {
  constructor() {
    this.results = {};
  }

  log(message, type = "info") {
    const icons = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌" };
    console.log(`${icons[type]} ${message}`);
  }

  async testFeature() {
    // Test implementation
    return true;
  }

  async runAllTests() {
    console.log("🧪 My Feature Test Suite");
    const result = await this.testFeature();
    return result;
  }
}

module.exports = { MyFeatureTests };
```

This comprehensive test suite ensures the LibRaw wrapper functionality is thoroughly validated across all major use cases and workflows.
