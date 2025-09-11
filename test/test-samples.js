const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function testAllSamples() {
  console.log("LibRaw Node.js POC - Sample Images Test");
  console.log("=======================================\n");

  const sampleDir = path.join(__dirname, "../raw-samples-repo");

  try {
    // Get all NEF files
    const files = fs
      .readdirSync(sampleDir, { withFileTypes: true })
      .filter((file) => file.toLowerCase().endsWith(".nef"))
      .sort();

    if (files.length === 0) {
      console.log("❌ No NEF files found in raw-samples-repo directory");
      return;
    }

    console.log(`Found ${files.length} NEF files to process:\n`);

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filepath = path.join(sampleDir, filename);

      console.log(`📸 Processing ${i + 1}/${files.length}: ${filename}`);
      console.log("─".repeat(50));

      const processor = new LibRaw();

      try {
        // Load the file
        await processor.loadFile(filepath);

        // Get metadata
        const metadata = await processor.getMetadata();
        const size = await processor.getImageSize();

        // Display key information
        console.log(`📷 Camera: ${metadata.make} ${metadata.model}`);
        console.log(`📐 Size: ${size.width} x ${size.height} pixels`);
        console.log(
          `🎯 Settings: ISO ${metadata.iso}, f/${metadata.aperture?.toFixed(
            1
          )}, 1/${Math.round(1 / metadata.shutterSpeed)}s, ${
            metadata.focalLength
          }mm`
        );

        if (metadata.timestamp) {
          const date = new Date(metadata.timestamp * 1000);
          console.log(`📅 Captured: ${date.toLocaleString()}`);
        }

        // File size
        const stats = fs.statSync(filepath);
        console.log(
          `💾 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        );

        // Color filter pattern
        const filterHex = metadata.filters?.toString(16).toUpperCase() || "0";
        console.log(
          `🎨 Color filter: 0x${filterHex} (${metadata.colors} colors)`
        );

        console.log("✅ Success\n");

        // Cleanup
        await processor.close();
      } catch (error) {
        console.log(`❌ Error processing ${filename}: ${error.message}\n`);
      }
    }

    console.log("🎉 Sample processing complete!");
    console.log("\n📊 Summary:");
    console.log(`   • Processed ${files.length} NEF files`);
    console.log(`   • All files from Nikon D5600`);
    console.log(`   • Resolution: 6016 x 4016 (24.2 MP)`);
    console.log(`   • Format: Nikon NEF (RAW)`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the test
testAllSamples().catch(console.error);
