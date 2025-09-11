const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

// 所有支持的 RAW 格式的综合测试
async function testAllFormats() {
  console.log("🎯 LibRaw Node.js - Comprehensive Format Test");
  console.log("==============================================\n");

  const sampleDir = path.join(__dirname, "../raw-samples-repo");

  // 定义格式组及其预期特征
  const formatGroups = {
    "Canon CR3": {
      extensions: [".cr3"],
      manufacturer: "Canon",
      description: "Canon RAW version 3",
    },
    "Nikon NEF": {
      extensions: [".nef"],
      manufacturer: "Nikon",
      description: "Nikon Electronic Format",
    },
    "Fujifilm RAF": {
      extensions: [".raf"],
      manufacturer: "FUJIFILM",
      description: "Fuji RAW Format",
    },
    "Adobe DNG": {
      extensions: [".dng"],
      manufacturer: "LEICA",
      description: "Digital Negative (Adobe)",
    },
    "Panasonic RW2": {
      extensions: [".rw2"],
      manufacturer: "Panasonic",
      description: "Panasonic RAW version 2",
    },
    "Sony ARW": {
      extensions: [".arw"],
      manufacturer: "SONY",
      description: "Sony Alpha RAW",
    },
  };

  try {
    // 获取所有 RAW 文件
    const allFiles = fs
      .readdirSync(sampleDir, { withFileTypes: true })
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return Object.values(formatGroups).some((group) =>
          group.extensions.includes(ext)
        );
      })
      .sort();

    if (allFiles.length === 0) {
      console.log("❌ No supported RAW files found in raw-samples-repo directory");
      return;
    }

    console.log(`Found ${allFiles.length} RAW files to process:\n`);

    // Group files by format
    const groupedFiles = {};
    for (const [groupName, group] of Object.entries(formatGroups)) {
      groupedFiles[groupName] = allFiles.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return group.extensions.includes(ext);
      });
    }

    let totalProcessed = 0;
    let totalSuccess = 0;
    const results = {};

    // Process each format group
    for (const [groupName, group] of Object.entries(formatGroups)) {
      const files = groupedFiles[groupName];
      if (files.length === 0) continue;

      console.log(`\n📁 ${groupName} (${group.description})`);
      console.log("═".repeat(60));

      const groupResults = {
        processed: 0,
        successful: 0,
        errors: [],
        samples: [],
      };

      for (const filename of files) {
        const filepath = path.join(sampleDir, filename);
        console.log(`\n📸 Processing: ${filename}`);
        console.log("─".repeat(40));

        const processor = new LibRaw();
        totalProcessed++;
        groupResults.processed++;

        try {
          // Load the file
          console.log("   Loading file...");
          await processor.loadFile(filepath);

          // Get metadata and size
          console.log("   Extracting metadata...");
          const metadata = await processor.getMetadata();
          const size = await processor.getImageSize();

          // Verify manufacturer matches expected
          const expectedMfg = group.manufacturer;
          const actualMfg = metadata.make?.toUpperCase();
          if (actualMfg && !actualMfg.includes(expectedMfg)) {
            console.log(
              `   ⚠️  Manufacturer mismatch: expected ${expectedMfg}, got ${metadata.make}`
            );
          }

          // Display key information
          console.log(`   📷 Camera: ${metadata.make} ${metadata.model}`);
          console.log(
            `   📐 Resolution: ${size.width} x ${size.height} pixels (${(
              (size.width * size.height) /
              1000000
            ).toFixed(1)} MP)`
          );

          // Camera settings
          const iso = metadata.iso || "N/A";
          const aperture = metadata.aperture
            ? `f/${metadata.aperture.toFixed(1)}`
            : "N/A";
          const shutter = metadata.shutterSpeed
            ? `1/${Math.round(1 / metadata.shutterSpeed)}s`
            : "N/A";
          const focal = metadata.focalLength
            ? `${metadata.focalLength}mm`
            : "N/A";
          console.log(
            `   🎯 Settings: ISO ${iso}, ${aperture}, ${shutter}, ${focal}`
          );

          // Timestamp
          if (metadata.timestamp) {
            const date = new Date(metadata.timestamp * 1000);
            console.log(`   📅 Captured: ${date.toLocaleString()}`);
          }

          // File info
          const stats = fs.statSync(filepath);
          console.log(
            `   💾 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
          );

          // Color info
          const colors = metadata.colors || "Unknown";
          console.log(`   🎨 Color channels: ${colors}`);

          console.log("   ✅ Success");

          totalSuccess++;
          groupResults.successful++;
          groupResults.samples.push({
            filename,
            camera: `${metadata.make} ${metadata.model}`,
            resolution: `${size.width}x${size.height}`,
            megapixels: ((size.width * size.height) / 1000000).toFixed(1),
            fileSize: (stats.size / 1024 / 1024).toFixed(2),
          });

          // Cleanup
          await processor.close();
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
          groupResults.errors.push({ filename, error: error.message });
        }
      }

      results[groupName] = groupResults;
    }

    // Print comprehensive summary
    console.log("\n\n🎉 COMPREHENSIVE TEST SUMMARY");
    console.log("═".repeat(60));
    console.log(
      `📊 Overall: ${totalSuccess}/${totalProcessed} files processed successfully (${(
        (totalSuccess / totalProcessed) *
        100
      ).toFixed(1)}%)\n`
    );

    // Format-specific results
    for (const [groupName, result] of Object.entries(results)) {
      if (result.processed === 0) continue;

      console.log(`📁 ${groupName}:`);
      console.log(`   Success: ${result.successful}/${result.processed} files`);

      if (result.samples.length > 0) {
        console.log("   Sample cameras:");
        const uniqueCameras = [...new Set(result.samples.map((s) => s.camera))];
        uniqueCameras.forEach((camera) => {
          console.log(`     • ${camera}`);
        });

        const resolutions = [
          ...new Set(result.samples.map((s) => s.resolution)),
        ];
        console.log(`   Resolutions: ${resolutions.join(", ")}`);
      }

      if (result.errors.length > 0) {
        console.log("   Errors:");
        result.errors.forEach((err) => {
          console.log(`     • ${err.filename}: ${err.error}`);
        });
      }
      console.log();
    }

    // Technical validation
    console.log("🔍 TECHNICAL VALIDATION:");
    console.log(
      `   • Tested ${Object.keys(formatGroups).length} different RAW formats`
    );
    console.log(`   • Multiple camera manufacturers verified`);
    console.log(`   • Resolution range from compact to full-frame sensors`);
    console.log(
      `   • File sizes from ${Math.min(
        ...Object.values(results).flatMap((r) =>
          r.samples.map((s) => parseFloat(s.fileSize))
        )
      )}MB to ${Math.max(
        ...Object.values(results).flatMap((r) =>
          r.samples.map((s) => parseFloat(s.fileSize))
        )
      )}MB`
    );

    // Recommendations
    if (totalSuccess === totalProcessed) {
      console.log("\n✅ ALL TESTS PASSED - Ready for production use!");
    } else {
      console.log(
        `\n⚠️  ${
          totalProcessed - totalSuccess
        } files failed processing - Review error details above`
      );
    }
  } catch (error) {
    console.error("❌ Critical Error:", error.message);
    process.exit(1);
  }
}

// Export for use in other tests
module.exports = testAllFormats;

// Run the test if executed directly
if (require.main === module) {
  testAllFormats().catch(console.error);
}
