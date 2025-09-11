#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

async function quickImageTest() {
  console.log("🔍 Quick Image Quality Test");
  console.log("===========================\n");

  const rawFile = "sample-images/012A0459.CR3";
  const outputPath = "examples/quality-test.jpg";

  try {
    console.log(`📁 Processing: ${rawFile}`);

    const libraw = new LibRaw();
    await libraw.loadFile(rawFile);

    // Convert to JPEG
    const result = await libraw.convertToJPEG(outputPath, {
      quality: 85,
      fastMode: true,
      effort: 3,
    });

    console.log(`✅ JPEG created: ${outputPath}`);
    console.log(
      `📊 File size: ${(result.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(`⚡ Processing time: ${result.metadata.processing.timeMs}ms`);
    console.log(
      `📐 Dimensions: ${result.metadata.outputDimensions.width}x${result.metadata.outputDimensions.height}`
    );

    // Check if file exists and has reasonable size
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 100000) {
        // > 100KB indicates proper image
        console.log(
          "✅ Image appears to be properly processed (good file size)"
        );
      } else {
        console.log(
          "⚠️  Warning: Image file is very small, might be black/corrupted"
        );
      }
    }

    await libraw.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

quickImageTest()
  .then(() => {
    console.log("\n✅ Quality test completed!");
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
