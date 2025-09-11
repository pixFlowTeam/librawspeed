const LibRaw = require("../lib/index");
const fs = require("fs");

/**
 * Quick Test for Buffer API
 *
 * This test verifies that the new buffer methods work correctly
 * and can create image data in memory.
 */

async function quickBufferTest() {
  console.log("🧪 Quick Buffer API Test");
  console.log("========================\n");

  // Check for sample images
  const sampleDir = "../raw-samples-repo";
  const testFiles = [
    "D5600_0276.NEF",
    "012A0459.CR3",
    "DSCF4035.RAF",
    "_DSC0406.ARW",
  ];

  let testFile = null;

  // Find the first available test file
  for (const file of testFiles) {
    const fullPath = `${sampleDir}/${file}`;
    if (fs.existsSync(fullPath)) {
      testFile = fullPath;
      console.log(`📁 Found test file: ${file}`);
      break;
    }
  }

  if (!testFile) {
    console.log("❌ No sample images found in ../raw-samples-repo/");
    console.log("Please place a RAW file there and try again.");
    return;
  }

  const processor = new LibRaw();

  try {
    console.log("\n🔄 Loading RAW file...");
    await processor.loadFile(testFile);
    console.log("✅ RAW file loaded successfully");

    console.log("\n⚙️ Processing image...");
    await processor.processImage();
    console.log("✅ Image processed");

    // Test basic buffer creation
    console.log("\n📸 Testing buffer creation...");

    // Test JPEG buffer (most common)
    console.log("  • JPEG buffer...");
    const jpegResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 800,
    });

    if (jpegResult.success && jpegResult.buffer.length > 0) {
      console.log(`    ✅ Success: ${jpegResult.buffer.length} bytes`);
      console.log(
        `    📐 ${jpegResult.metadata.outputDimensions.width}x${jpegResult.metadata.outputDimensions.height}`
      );
    } else {
      throw new Error("JPEG buffer creation failed");
    }

    // Test thumbnail
    console.log("  • Thumbnail buffer...");
    const thumbResult = await processor.createThumbnailJPEGBuffer({
      maxSize: 200,
    });

    if (thumbResult.success && thumbResult.buffer.length > 0) {
      console.log(`    ✅ Success: ${thumbResult.buffer.length} bytes`);
      console.log(
        `    📐 ${thumbResult.metadata.outputDimensions.width}x${thumbResult.metadata.outputDimensions.height}`
      );
    } else {
      throw new Error("Thumbnail buffer creation failed");
    }

    // Test PNG buffer
    console.log("  • PNG buffer...");
    const pngResult = await processor.createPNGBuffer({
      width: 400,
    });

    if (pngResult.success && pngResult.buffer.length > 0) {
      console.log(`    ✅ Success: ${pngResult.buffer.length} bytes`);
      console.log(
        `    📐 ${pngResult.metadata.outputDimensions.width}x${pngResult.metadata.outputDimensions.height}`
      );
    } else {
      throw new Error("PNG buffer creation failed");
    }

    // Save buffers for visual verification (optional)
    console.log("\n💾 Saving test outputs...");
    fs.writeFileSync("test_jpeg.jpg", jpegResult.buffer);
    fs.writeFileSync("test_thumb.jpg", thumbResult.buffer);
    fs.writeFileSync("test_png.png", pngResult.buffer);
    console.log("✅ Test files saved");

    // Performance summary
    console.log("\n📊 Performance Summary:");
    console.log(`  JPEG: ${jpegResult.metadata.processing.timeMs}ms`);
    console.log(`  Thumbnail: ${thumbResult.metadata.processing.timeMs}ms`);
    console.log(`  PNG: ${pngResult.metadata.processing.timeMs}ms`);

    console.log("\n✅ All buffer tests passed!");
    console.log("\n💡 The buffer API is working correctly.");
    console.log("   You can now use these methods in your applications:");
    console.log("   • createJPEGBuffer() - for web images");
    console.log("   • createThumbnailJPEGBuffer() - for thumbnails");
    console.log("   • createPNGBuffer() - for lossless images");
    console.log("   • createWebPBuffer() - for modern web");
    console.log("   • createAVIFBuffer() - for next-gen compression");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nPossible issues:");
    console.error("1. Sharp not installed: npm install sharp");
    console.error("2. LibRaw addon not built: npm run build");
    console.error("3. Incompatible RAW file format");
    console.error("4. Insufficient memory for processing");
  } finally {
    await processor.close();
  }
}

// Run if called directly
if (require.main === module) {
  quickBufferTest().catch(console.error);
}

module.exports = quickBufferTest;
