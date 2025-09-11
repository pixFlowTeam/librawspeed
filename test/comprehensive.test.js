const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

// 导入新的综合测试套件
const { ImageProcessingTests } = require("./image-processing.test");
const { FormatConversionTests } = require("./format-conversion.test");
const { ThumbnailExtractionTests } = require("./thumbnail-extraction.test");

async function comprehensiveTest() {
  console.log("🚀 LibRaw Comprehensive API Test");
  console.log("=".repeat(50));

  // 首先测试静态方法
  console.log("\n📊 Library Information:");
  console.log(`   Version: ${LibRaw.getVersion()}`);
  console.log(`   Capabilities: 0x${LibRaw.getCapabilities().toString(16)}`);
  console.log(`   Supported Cameras: ${LibRaw.getCameraCount()}`);

  const cameras = LibRaw.getCameraList();
  console.log(`   Sample Cameras: ${cameras.slice(0, 5).join(", ")}...`);

  // 查找用于测试的示例图像
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  if (!fs.existsSync(sampleImagesDir)) {
    console.log("\n❌ 未找到示例图像目录");
    return;
  }

  const sampleFiles = fs
    .readdirSync(sampleImagesDir)
    .filter((f) => f.toLowerCase().match(/\.(cr2|cr3|nef|arw|raf|rw2|dng)$/));

  if (sampleFiles.length === 0) {
    console.log("\nℹ️ 未找到 RAW 示例文件");
    return;
  }

  const testFile = path.join(sampleImagesDir, sampleFiles[0]);
  console.log(`\n📁 Testing with: ${sampleFiles[0]}`);

  const processor = new LibRaw();

  try {
    // ============== FILE OPERATIONS ==============
    console.log("\n🔄 File Operations:");
    const loadResult = await processor.loadFile(testFile);
    console.log(`   ✅ Load File: ${loadResult}`);

    // ============== METADATA & INFORMATION ==============
    console.log("\n📋 Basic Metadata:");
    const metadata = await processor.getMetadata();
    console.log(
      `   📷 Camera: ${metadata.make || "Unknown"} ${
        metadata.model || "Unknown"
      }`
    );
    console.log(
      `   📐 Dimensions: ${metadata.width}x${metadata.height} (RAW: ${metadata.rawWidth}x${metadata.rawHeight})`
    );
    console.log(
      `   🎯 Settings: ISO ${metadata.iso || "N/A"}, f/${
        metadata.aperture || "N/A"
      }, ${
        metadata.shutterSpeed ? (1 / metadata.shutterSpeed).toFixed(0) : "N/A"
      }s`
    );
    if (metadata.focalLength)
      console.log(`   📏 Focal Length: ${metadata.focalLength}mm`);
    console.log(
      `   🎨 Colors: ${metadata.colors}, Filters: 0x${metadata.filters.toString(
        16
      )}`
    );

    console.log("\n📏 Detailed Size Information:");
    const sizeInfo = await processor.getImageSize();
    console.log(`   Processing Size: ${sizeInfo.width}x${sizeInfo.height}`);
    console.log(
      `   Raw Sensor Size: ${sizeInfo.rawWidth}x${sizeInfo.rawHeight}`
    );
    console.log(
      `   Margins: ${sizeInfo.leftMargin}px left, ${sizeInfo.topMargin}px top`
    );
    console.log(`   Internal Size: ${sizeInfo.iWidth}x${sizeInfo.iHeight}`);

    console.log("\n🔬 Advanced Metadata:");
    const advancedMetadata = await processor.getAdvancedMetadata();
    console.log(
      `   Normalized: ${advancedMetadata.normalizedMake || "N/A"} ${
        advancedMetadata.normalizedModel || "N/A"
      }`
    );
    console.log(`   RAW Count: ${advancedMetadata.rawCount}`);
    console.log(`   DNG Version: ${advancedMetadata.dngVersion || "N/A"}`);
    console.log(
      `   Foveon Sensor: ${advancedMetadata.is_foveon ? "Yes" : "No"}`
    );
    console.log(`   Black Level: ${advancedMetadata.blackLevel}`);
    console.log(`   Data Maximum: ${advancedMetadata.dataMaximum}`);
    console.log(`   White Level: ${advancedMetadata.whiteLevel}`);

    console.log("\n🔍 Lens Information:");
    const lensInfo = await processor.getLensInfo();
    if (lensInfo.lensName) console.log(`   📱 Lens: ${lensInfo.lensName}`);
    if (lensInfo.lensMake) console.log(`   🏭 Lens Make: ${lensInfo.lensMake}`);
    if (lensInfo.lensSerial)
      console.log(`   🔢 Serial: ${lensInfo.lensSerial}`);
    if (lensInfo.minFocal && lensInfo.maxFocal) {
      console.log(
        `   📏 Focal Range: ${lensInfo.minFocal}-${lensInfo.maxFocal}mm`
      );
    }
    if (lensInfo.focalLengthIn35mmFormat) {
      console.log(
        `   📐 35mm Equivalent: ${lensInfo.focalLengthIn35mmFormat}mm`
      );
    }

    console.log("\n🎨 Color Information:");
    const colorInfo = await processor.getColorInfo();
    console.log(`   Color Channels: ${colorInfo.colors}`);
    console.log(`   Filter Pattern: 0x${colorInfo.filters.toString(16)}`);
    console.log(`   Black Level: ${colorInfo.blackLevel}`);
    console.log(`   White Level: ${colorInfo.whiteLevel}`);
    if (colorInfo.profileLength) {
      console.log(`   Color Profile Length: ${colorInfo.profileLength} bytes`);
    }

    // ============== UTILITY FUNCTIONS ==============
    console.log("\n🔧 Image Properties:");
    const isFloating = await processor.isFloatingPoint();
    const isFuji = await processor.isFujiRotated();
    const isSRAW = await processor.isSRAW();
    const isJPEGThumb = await processor.isJPEGThumb();
    const errorCount = await processor.errorCount();

    console.log(`   Floating Point: ${isFloating ? "Yes" : "No"}`);
    console.log(`   Fuji Rotated: ${isFuji ? "Yes" : "No"}`);
    console.log(`   sRAW Format: ${isSRAW ? "Yes" : "No"}`);
    console.log(`   JPEG Thumbnail: ${isJPEGThumb ? "Yes" : "No"}`);
    console.log(`   Processing Errors: ${errorCount}`);

    // ============== CONFIGURATION ==============
    console.log("\n⚙️ Output Configuration:");
    const currentParams = await processor.getOutputParams();
    console.log(
      `   Gamma: [${currentParams.gamma[0]}, ${currentParams.gamma[1]}]`
    );
    console.log(`   Brightness: ${currentParams.bright}`);
    console.log(`   Output Color Space: ${currentParams.output_color}`);
    console.log(`   Output BPS: ${currentParams.output_bps}`);
    console.log(`   Auto Brightness: ${!currentParams.no_auto_bright}`);

    // Test setting new parameters
    console.log("\n🔧 Setting Custom Parameters:");
    await processor.setOutputParams({
      bright: 1.2,
      gamma: [2.2, 4.5],
      output_bps: 16,
      no_auto_bright: false,
    });
    console.log("   ✅ Parameters updated");

    // ============== IMAGE PROCESSING ==============
    console.log("\n🖼️ Image Processing:");

    try {
      const subtractResult = await processor.subtractBlack();
      console.log(`   ✅ Subtract Black: ${subtractResult}`);
    } catch (e) {
      console.log(`   ⚠️ Subtract Black: ${e.message}`);
    }

    try {
      const raw2ImageResult = await processor.raw2Image();
      console.log(`   ✅ RAW to Image: ${raw2ImageResult}`);
    } catch (e) {
      console.log(`   ⚠️ RAW to Image: ${e.message}`);
    }

    try {
      const adjustResult = await processor.adjustMaximum();
      console.log(`   ✅ Adjust Maximum: ${adjustResult}`);
    } catch (e) {
      console.log(`   ⚠️ Adjust Maximum: ${e.message}`);
    }

    try {
      const processResult = await processor.processImage();
      console.log(`   ✅ Process Image: ${processResult}`);
    } catch (e) {
      console.log(`   ⚠️ Process Image: ${e.message}`);
    }

    // ============== THUMBNAIL OPERATIONS ==============
    console.log("\n🖼️ Thumbnail Operations:");

    try {
      const thumbUnpack = await processor.unpackThumbnail();
      console.log(`   ✅ Unpack Thumbnail: ${thumbUnpack}`);

      const thumbData = await processor.createMemoryThumbnail();
      console.log(
        `   ✅ Memory Thumbnail: ${thumbData.width}x${thumbData.height}, ${thumbData.dataSize} bytes`
      );
      console.log(
        `   📊 Type: ${thumbData.type}, Colors: ${thumbData.colors}, Bits: ${thumbData.bits}`
      );
    } catch (e) {
      console.log(`   ⚠️ Thumbnail operations: ${e.message}`);
    }

    // ============== MEMORY IMAGE ==============
    console.log("\n💾 Memory Image Creation:");

    try {
      const imageData = await processor.createMemoryImage();
      console.log(
        `   ✅ Memory Image: ${imageData.width}x${imageData.height}, ${imageData.dataSize} bytes`
      );
      console.log(
        `   📊 Type: ${imageData.type}, Colors: ${imageData.colors}, Bits: ${imageData.bits}`
      );
    } catch (e) {
      console.log(`   ⚠️ Memory Image: ${e.message}`);
    }

    // ============== FILE WRITERS ==============
    console.log("\n💾 File Writing Test:");
    const outputDir = path.join(__dirname, "..", "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(testFile, path.extname(testFile));

    try {
      const ppmFile = path.join(outputDir, `${baseName}.ppm`);
      const ppmResult = await processor.writePPM(ppmFile);
      console.log(`   ✅ PPM Write: ${ppmResult} -> ${ppmFile}`);
    } catch (e) {
      console.log(`   ⚠️ PPM Write: ${e.message}`);
    }

    try {
      const tiffFile = path.join(outputDir, `${baseName}.tiff`);
      const tiffResult = await processor.writeTIFF(tiffFile);
      console.log(`   ✅ TIFF Write: ${tiffResult} -> ${tiffFile}`);
    } catch (e) {
      console.log(`   ⚠️ TIFF Write: ${e.message}`);
    }

    try {
      const thumbFile = path.join(outputDir, `${baseName}_thumb.jpg`);
      const thumbResult = await processor.writeThumbnail(thumbFile);
      console.log(`   ✅ Thumbnail Write: ${thumbResult} -> ${thumbFile}`);
    } catch (e) {
      console.log(`   ⚠️ Thumbnail Write: ${e.message}`);
    }
  } catch (error) {
    console.error(`\n❌ Error during processing: ${error.message}`);
  } finally {
    // ============== CLEANUP ==============
    console.log("\n🧹 Cleanup:");
    const closeResult = await processor.close();
    console.log(`   ✅ Close: ${closeResult}`);
  }

  console.log("\n🎉 Basic comprehensive test completed!");

  // ============== NEW COMPREHENSIVE TEST SUITES ==============
  console.log("\n🚀 Running Advanced Test Suites");
  console.log("=".repeat(50));

  const testSuites = [
    { name: "Image Processing", class: ImageProcessingTests },
    { name: "Format Conversion", class: FormatConversionTests },
    { name: "Thumbnail Extraction", class: ThumbnailExtractionTests },
  ];

  let suiteResults = [];

  for (const suite of testSuites) {
    console.log(`\n🔬 Running ${suite.name} Test Suite`);
    console.log("=".repeat(suite.name.length + 25));

    try {
      const tester = new suite.class();
      const result = await tester.runAllTests();

      if (result) {
        console.log(`✅ ${suite.name} test suite: PASSED`);
        suiteResults.push({ name: suite.name, result: true });
      } else {
        console.log(`⚠️  ${suite.name} test suite: COMPLETED WITH WARNINGS`);
        suiteResults.push({ name: suite.name, result: false });
      }
    } catch (error) {
      console.log(`❌ ${suite.name} test suite: FAILED - ${error.message}`);
      suiteResults.push({
        name: suite.name,
        result: false,
        error: error.message,
      });
    }
  }

  // ============== FINAL SUMMARY ==============
  console.log("\n📊 Advanced Test Suite Summary");
  console.log("=".repeat(50));

  const passedSuites = suiteResults.filter((r) => r.result).length;
  const totalSuites = suiteResults.length;

  suiteResults.forEach((result) => {
    const status = result.result ? "PASSED" : "FAILED/WARNING";
    const icon = result.result ? "✅" : "⚠️";
    console.log(`${icon} ${result.name}: ${status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(
    `\nAdvanced Test Results: ${passedSuites}/${totalSuites} suites passed`
  );

  if (passedSuites === totalSuites) {
    console.log("🎉 All advanced test suites completed successfully!");
  } else {
    console.log("⚠️  Some advanced test suites had failures or warnings.");
    console.log("💡 This may be normal if sample RAW files are not available.");
  }

  console.log("=".repeat(50));
}

// Run the test
comprehensiveTest().catch(console.error);
