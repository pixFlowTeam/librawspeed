const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Complete RAW Processing Pipeline Example
 *
 * This example demonstrates the full LibRaw API including:
 * - File loading and buffer operations
 * - Comprehensive metadata extraction
 * - Image processing pipeline
 * - Memory image operations
 * - File output in multiple formats
 * - Configuration and utility functions
 */

async function completeProcessingExample(inputFile, outputDir) {
  console.log("🎯 Complete RAW Processing Pipeline");
  console.log("=====================================");
  console.log(`📁 Input: ${inputFile}`);
  console.log(`📂 Output Directory: ${outputDir}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const processor = new LibRaw();
  const startTime = Date.now();

  try {
    // ============== STEP 1: LIBRARY INFO ==============
    console.log("\n📊 Library Information:");
    console.log(`   LibRaw Version: ${LibRaw.getVersion()}`);
    console.log(`   Supported Cameras: ${LibRaw.getCameraCount()}`);
    console.log(`   Capabilities: 0x${LibRaw.getCapabilities().toString(16)}`);

    // ============== STEP 2: LOAD IMAGE ==============
    console.log("\n🔄 Loading RAW Image...");
    await processor.loadFile(inputFile);
    console.log("   ✅ Image loaded successfully");

    // ============== STEP 3: EXTRACT METADATA ==============
    console.log("\n📋 Extracting Metadata...");

    const metadata = await processor.getMetadata();
    console.log(
      `   📷 Camera: ${metadata.make || "Unknown"} ${
        metadata.model || "Unknown"
      }`
    );
    console.log(
      `   📐 Resolution: ${metadata.width}×${metadata.height} (RAW: ${metadata.rawWidth}×${metadata.rawHeight})`
    );

    if (metadata.iso) console.log(`   🎯 ISO: ${metadata.iso}`);
    if (metadata.aperture)
      console.log(`   🔍 Aperture: f/${metadata.aperture}`);
    if (metadata.shutterSpeed)
      console.log(`   ⏱️ Shutter: 1/${Math.round(1 / metadata.shutterSpeed)}s`);
    if (metadata.focalLength)
      console.log(`   📏 Focal Length: ${metadata.focalLength}mm`);

    const sizeInfo = await processor.getImageSize();
    console.log(
      `   📏 Margins: ${sizeInfo.leftMargin}px×${sizeInfo.topMargin}px`
    );

    const lensInfo = await processor.getLensInfo();
    if (lensInfo.lensName) {
      console.log(`   🔍 Lens: ${lensInfo.lensName}`);
      if (lensInfo.lensSerial)
        console.log(`   🔢 Lens Serial: ${lensInfo.lensSerial}`);
    }

    const colorInfo = await processor.getColorInfo();
    console.log(`   🎨 Color Channels: ${colorInfo.colors}`);
    console.log(`   ⚫ Black Level: ${colorInfo.blackLevel}`);
    console.log(`   ⚪ White Level: ${colorInfo.whiteLevel}`);

    // ============== STEP 4: IMAGE ANALYSIS ==============
    console.log("\n🔬 Image Analysis...");
    const [isFloating, isFuji, isSRAW, isJPEGThumb, errorCount] =
      await Promise.all([
        processor.isFloatingPoint(),
        processor.isFujiRotated(),
        processor.isSRAW(),
        processor.isJPEGThumb(),
        processor.errorCount(),
      ]);

    console.log(`   📊 Floating Point: ${isFloating ? "Yes" : "No"}`);
    console.log(`   🔄 Fuji Rotated: ${isFuji ? "Yes" : "No"}`);
    console.log(`   📦 sRAW Format: ${isSRAW ? "Yes" : "No"}`);
    console.log(`   🖼️ JPEG Thumbnail: ${isJPEGThumb ? "Yes" : "No"}`);
    console.log(`   ⚠️ Processing Errors: ${errorCount}`);

    // ============== STEP 5: CONFIGURE PROCESSING ==============
    console.log("\n⚙️ Configuring Processing...");

    // Get current parameters
    const currentParams = await processor.getOutputParams();
    console.log(
      `   📊 Current gamma: [${currentParams.gamma[0]}, ${currentParams.gamma[1]}]`
    );

    // Set custom processing parameters
    await processor.setOutputParams({
      bright: 1.1, // 10% brightness boost
      gamma: [2.2, 4.5], // Standard sRGB gamma
      output_bps: 16, // 16-bit output for maximum quality
      no_auto_bright: false, // Enable auto brightness
      highlight: 1, // Highlight recovery mode 1
      output_color: 1, // sRGB color space
    });
    console.log("   ✅ Processing parameters configured");

    // ============== STEP 6: PROCESS IMAGE ==============
    console.log("\n🖼️ Processing Image...");

    try {
      await processor.raw2Image();
      console.log("   ✅ RAW to image conversion");
    } catch (e) {
      console.log(`   ⚠️ RAW to image: ${e.message}`);
    }

    try {
      await processor.adjustMaximum();
      console.log("   ✅ Maximum adjustment");
    } catch (e) {
      console.log(`   ⚠️ Maximum adjustment: ${e.message}`);
    }

    try {
      await processor.processImage();
      console.log("   ✅ Image processing completed");
    } catch (e) {
      console.log(`   ⚠️ Image processing: ${e.message}`);
    }

    // ============== STEP 7: MEMORY OPERATIONS ==============
    console.log("\n💾 Memory Operations...");

    try {
      const imageData = await processor.createMemoryImage();
      console.log(`   📸 Memory Image: ${imageData.width}×${imageData.height}`);
      console.log(
        `   📊 Format: Type ${imageData.type}, ${imageData.colors} colors, ${imageData.bits}-bit`
      );
      console.log(
        `   💽 Size: ${(imageData.dataSize / 1024 / 1024).toFixed(1)} MB`
      );

      // Save raw image data
      const rawDataPath = path.join(outputDir, "processed_image_data.bin");
      fs.writeFileSync(rawDataPath, imageData.data);
      console.log(`   💾 Raw image data saved to: ${rawDataPath}`);
    } catch (e) {
      console.log(`   ⚠️ Memory image creation: ${e.message}`);
    }

    // ============== STEP 8: THUMBNAIL OPERATIONS ==============
    console.log("\n🖼️ Thumbnail Operations...");

    try {
      await processor.unpackThumbnail();
      console.log("   ✅ Thumbnail unpacked");

      const thumbData = await processor.createMemoryThumbnail();
      console.log(
        `   🖼️ Memory Thumbnail: ${thumbData.width}×${thumbData.height}`
      );
      console.log(
        `   📊 Format: Type ${thumbData.type}, ${thumbData.colors} colors, ${thumbData.bits}-bit`
      );
      console.log(`   💽 Size: ${(thumbData.dataSize / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.log(`   ⚠️ Thumbnail operations: ${e.message}`);
    }

    // ============== STEP 9: FILE OUTPUTS ==============
    console.log("\n💾 File Outputs...");

    const baseName = path.basename(inputFile, path.extname(inputFile));

    // PPM output
    try {
      const ppmPath = path.join(outputDir, `${baseName}.ppm`);
      await processor.writePPM(ppmPath);
      const ppmStats = fs.statSync(ppmPath);
      console.log(
        `   ✅ PPM: ${(ppmStats.size / 1024 / 1024).toFixed(
          1
        )} MB -> ${ppmPath}`
      );
    } catch (e) {
      console.log(`   ⚠️ PPM output: ${e.message}`);
    }

    // TIFF output
    try {
      const tiffPath = path.join(outputDir, `${baseName}.tiff`);
      await processor.writeTIFF(tiffPath);
      const tiffStats = fs.statSync(tiffPath);
      console.log(
        `   ✅ TIFF: ${(tiffStats.size / 1024 / 1024).toFixed(
          1
        )} MB -> ${tiffPath}`
      );
    } catch (e) {
      console.log(`   ⚠️ TIFF output: ${e.message}`);
    }

    // Thumbnail output
    try {
      const thumbPath = path.join(outputDir, `${baseName}_thumbnail.jpg`);
      await processor.writeThumbnail(thumbPath);
      const thumbStats = fs.statSync(thumbPath);
      console.log(
        `   ✅ Thumbnail: ${(thumbStats.size / 1024).toFixed(
          1
        )} KB -> ${thumbPath}`
      );
    } catch (e) {
      console.log(`   ⚠️ Thumbnail output: ${e.message}`);
    }

    // ============== STEP 10: PERFORMANCE SUMMARY ==============
    const processingTime = Date.now() - startTime;
    console.log("\n⏱️ Performance Summary:");
    console.log(`   🕐 Total Processing Time: ${processingTime}ms`);
    console.log(
      `   📊 Throughput: ${(
        fs.statSync(inputFile).size /
        1024 /
        1024 /
        (processingTime / 1000)
      ).toFixed(1)} MB/s`
    );

    const finalErrorCount = await processor.errorCount();
    console.log(`   ⚠️ Final Error Count: ${finalErrorCount}`);
  } catch (error) {
    console.error(`\n❌ Processing Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    // ============== CLEANUP ==============
    console.log("\n🧹 Cleanup...");
    await processor.close();
    console.log("   ✅ Resources freed");
  }

  console.log("\n🎉 Complete processing pipeline finished!");
  console.log("=====================================");
}

// Buffer loading example
async function bufferProcessingExample(inputFile) {
  console.log("\n🗂️ Buffer Processing Example");
  console.log("=============================");

  const processor = new LibRaw();

  try {
    // Load file into buffer
    const buffer = fs.readFileSync(inputFile);
    console.log(
      `📁 Loaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB into buffer`
    );

    // Process from buffer
    await processor.loadBuffer(buffer);
    console.log("✅ RAW loaded from buffer");

    const metadata = await processor.getMetadata();
    console.log(
      `📷 Successfully processed: ${metadata.make} ${metadata.model}`
    );
    console.log(`📐 Resolution: ${metadata.width}×${metadata.height}`);
  } catch (error) {
    console.error(`❌ Buffer processing error: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(
      "Usage: node complete-example.js <input-raw-file> [output-directory]"
    );
    console.log("Example: node complete-example.js sample.cr2 ./output");
    return;
  }

  const inputFile = args[0];
  const outputDir = args[1] || "./output";

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    return;
  }

  try {
    await completeProcessingExample(inputFile, outputDir);
    await bufferProcessingExample(inputFile);
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
  }
}

// Export for use as a module
module.exports = {
  completeProcessingExample,
  bufferProcessingExample,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
