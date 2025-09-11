const LibRaw = require("../lib/index.js");
const path = require("path");

async function advancedExample() {
  console.log("🔬 Advanced LibRaw Features Demo");
  console.log("=".repeat(40));

  const processor = new LibRaw();

  try {
    // Example using the first available sample image
    const sampleFile = path.join(
      __dirname,
      "..",
      "sample-images",
      "ILCE-7RM2_01.ARW"
    );

    console.log("\n1️⃣ Loading RAW file...");
    await processor.loadFile(sampleFile);

    console.log("\n2️⃣ Advanced Metadata Extraction...");
    const [metadata, advanced, lens, color] = await Promise.all([
      processor.getMetadata(),
      processor.getAdvancedMetadata(),
      processor.getLensInfo(),
      processor.getColorInfo(),
    ]);

    console.log(`📷 Camera: ${metadata.make} ${metadata.model}`);
    console.log(`🔍 Lens: ${lens.lensName || "Unknown"}`);
    console.log(
      `📊 Color Matrix Available: ${
        advanced.colorMatrix.length > 0 ? "Yes" : "No"
      }`
    );

    console.log("\n3️⃣ Configuring Processing...");
    await processor.setOutputParams({
      bright: 1.1, // Slight brightness boost
      gamma: [2.2, 4.5], // Standard sRGB gamma
      output_bps: 16, // 16-bit output
      no_auto_bright: false, // Enable auto brightness
      highlight: 1, // Highlight recovery mode
    });

    console.log("\n4️⃣ Processing Pipeline...");
    await processor.subtractBlack();
    console.log("   ✅ Black level subtracted");

    await processor.raw2Image();
    console.log("   ✅ RAW data converted to image");

    await processor.adjustMaximum();
    console.log("   ✅ Maximum values adjusted");

    await processor.processImage();
    console.log("   ✅ Image processing completed");

    console.log("\n5️⃣ Creating Memory Images...");
    const imageData = await processor.createMemoryImage();
    console.log(
      `   📸 Main Image: ${imageData.width}x${imageData.height} (${(
        imageData.dataSize /
        1024 /
        1024
      ).toFixed(1)}MB)`
    );

    await processor.unpackThumbnail();
    const thumbData = await processor.createMemoryThumbnail();
    console.log(
      `   🖼️ Thumbnail: ${thumbData.width}x${thumbData.height} (${(
        thumbData.dataSize / 1024
      ).toFixed(1)}KB)`
    );

    console.log("\n6️⃣ Exporting Files...");
    const outputDir = path.join(__dirname, "..", "output");
    require("fs").mkdirSync(outputDir, { recursive: true });

    await processor.writeTIFF(path.join(outputDir, "processed.tiff"));
    console.log("   💾 TIFF saved");

    await processor.writeThumbnail(path.join(outputDir, "thumbnail.jpg"));
    console.log("   💾 Thumbnail saved");

    console.log("\n7️⃣ Image Analysis...");
    const [isFloating, isFuji, isSRAW, errors] = await Promise.all([
      processor.isFloatingPoint(),
      processor.isFujiRotated(),
      processor.isSRAW(),
      processor.errorCount(),
    ]);

    console.log(`   🔢 Floating Point: ${isFloating}`);
    console.log(`   🔄 Fuji Rotated: ${isFuji}`);
    console.log(`   📦 sRAW: ${isSRAW}`);
    console.log(`   ⚠️ Processing Errors: ${errors}`);

    console.log("\n✨ Complete! All advanced features demonstrated.");
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// Buffer loading example
async function bufferExample() {
  console.log("\n🗂️ Buffer Loading Example");
  console.log("-".repeat(30));

  const fs = require("fs");
  const sampleFile = path.join(
    __dirname,
    "..",
    "sample-images",
    "ILCE-7RM2_01.ARW"
  );

  if (!fs.existsSync(sampleFile)) {
    console.log("❌ Sample file not found for buffer demo");
    return;
  }

  const processor = new LibRaw();

  try {
    // Load file into buffer
    const buffer = fs.readFileSync(sampleFile);
    console.log(
      `📁 Loaded ${(buffer.length / 1024 / 1024).toFixed(1)}MB into buffer`
    );

    // Process from buffer
    await processor.loadBuffer(buffer);
    console.log("✅ RAW loaded from buffer");

    const metadata = await processor.getMetadata();
    console.log(`📷 ${metadata.make} ${metadata.model} loaded successfully`);
  } catch (error) {
    console.error(`❌ Buffer loading error: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// Static information example
function staticInfoExample() {
  console.log("\n📊 Static Library Information");
  console.log("-".repeat(35));

  console.log(`📋 LibRaw Version: ${LibRaw.getVersion()}`);
  console.log(`🎯 Capabilities: 0x${LibRaw.getCapabilities().toString(16)}`);
  console.log(`📷 Supported Cameras: ${LibRaw.getCameraCount()}`);

  const cameras = LibRaw.getCameraList();
  console.log(`🏷️ Sample Camera Models:`);
  cameras.slice(0, 10).forEach((camera) => console.log(`   • ${camera}`));
  if (cameras.length > 10) {
    console.log(`   ... and ${cameras.length - 10} more`);
  }
}

// Run all examples
async function runExamples() {
  staticInfoExample();
  await advancedExample();
  await bufferExample();

  console.log("\n🎉 All examples completed!");
}

runExamples().catch(console.error);
