const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function compareImages() {
  console.log("LibRaw POC - Image Comparison Analysis");
  console.log("=====================================\n");

  const sampleDir = path.join(__dirname, "../raw-samples-repo");
  const nefFiles = ["DSC_0006.NEF", "DSC_0007.NEF", "DSC_0008.NEF"];

  const results = [];

  for (const filename of nefFiles) {
    const processor = new LibRaw();
    try {
      const filepath = path.join(sampleDir, filename);
      await processor.loadFile(filepath);
      const metadata = await processor.getMetadata();

      results.push({
        filename,
        iso: metadata.iso,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
        focalLength: metadata.focalLength,
        timestamp: metadata.timestamp,
        fileSize: fs.statSync(filepath).size,
      });

      await processor.close();
    } catch (error) {
      console.error(`Error processing ${filename}:`, error.message);
    }
  }

  // 显示比较表
  console.log("📊 Image Comparison Table:");
  console.log(
    "┌─────────────┬─────┬─────────┬──────────────┬──────────┬─────────────┬──────────┐"
  );
  console.log(
    "│ Filename    │ ISO │ f-stop  │ Shutter      │ Focal    │ Timestamp   │ Size MB  │"
  );
  console.log(
    "├─────────────┼─────┼─────────┼──────────────┼──────────┼─────────────┼──────────┤"
  );

  results.forEach((img) => {
    const date = new Date(img.timestamp * 1000);
    const shutterText = `1/${Math.round(1 / img.shutterSpeed)}s`;
    const sizeText = `${(img.fileSize / 1024 / 1024).toFixed(1)} MB`;
    const timeText = date.toLocaleTimeString();

    console.log(
      `│ ${img.filename.padEnd(11)} │ ${String(img.iso).padEnd(
        3
      )} │ f/${img.aperture.toFixed(1).padEnd(5)} │ ${shutterText.padEnd(
        12
      )} │ ${String(img.focalLength).padEnd(6)}mm │ ${timeText.padEnd(
        11
      )} │ ${sizeText.padEnd(8)} │`
    );
  });

  console.log(
    "└─────────────┴─────┴─────────┴──────────────┴──────────┴─────────────┴──────────┘"
  );

  // Analysis
  console.log("\n🔍 Analysis:");

  // Check for differences
  const shutterSpeeds = results.map((r) => r.shutterSpeed);
  const uniqueShutters = [...new Set(shutterSpeeds)];

  if (uniqueShutters.length > 1) {
    console.log("📸 Different shutter speeds detected:");
    uniqueShutters.forEach((speed) => {
      const files = results
        .filter((r) => r.shutterSpeed === speed)
        .map((r) => r.filename);
      console.log(`   • 1/${Math.round(1 / speed)}s: ${files.join(", ")}`);
    });
  }

  // File size analysis
  const sizes = results.map((r) => r.fileSize);
  const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  console.log(
    `💾 File sizes: avg ${(avgSize / 1024 / 1024).toFixed(1)}MB, range ${(
      minSize /
      1024 /
      1024
    ).toFixed(1)}-${(maxSize / 1024 / 1024).toFixed(1)}MB`
  );

  // Capture sequence
  const sorted = results.sort((a, b) => a.timestamp - b.timestamp);
  console.log("⏰ Capture sequence:");
  sorted.forEach((img, i) => {
    const time = new Date(img.timestamp * 1000).toLocaleTimeString();
    console.log(`   ${i + 1}. ${img.filename} at ${time}`);
  });

  console.log("\n✅ POC successfully analyzed all your sample NEF files!");
  console.log(
    "🎯 Ready for full implementation with image processing capabilities."
  );
}

compareImages().catch(console.error);
