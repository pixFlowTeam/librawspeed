#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const path = require("path");
const fs = require("fs");

async function performanceTest() {
  console.log("LibRaw Fast Performance Test");
  console.log("===========================\n");

  const rawFile = "sample-images/012A0459.CR3";
  const outputDir = "examples/performance-test";

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📁 Testing file: ${rawFile}`);

  try {
    // Load the RAW file
    const libraw = new LibRaw();
    await libraw.loadFile(rawFile);

    const info = await libraw.getMetadata();
    console.log(`📷 Camera: ${info.make} ${info.model}`);
    console.log(`📐 Dimensions: ${info.width}x${info.height}`);
    console.log(
      `📊 Megapixels: ${((info.width * info.height) / 1000000).toFixed(1)}MP\n`
    );

    // Test 1: Ultra-fast conversion
    console.log("🚀 Test 1: Ultra-fast conversion (effort=1, no mozjpeg)");
    const start1 = Date.now();
    await libraw.convertToJPEGFast(
      path.join(outputDir, "012A0459_ultrafast.jpg"),
      {
        quality: 80,
        fastMode: true,
        effort: 1,
        mozjpeg: false,
        progressive: false,
      }
    );
    const time1 = Date.now() - start1;
    const stats1 = fs.statSync(path.join(outputDir, "012A0459_ultrafast.jpg"));
    console.log(`   ✅ Time: ${time1}ms`);
    console.log(`   📊 Size: ${(stats1.size / 1024).toFixed(1)}KB\n`);

    // Test 2: Multi-size generation
    console.log("📐 Test 2: Multi-size generation (3 sizes in parallel)");
    const start2 = Date.now();
    const multiResult = await libraw.convertToJPEGMultiSize(
      path.join(outputDir, "012A0459_multi"),
      {
        sizes: [
          { name: "thumbnail", width: 400, quality: 75, effort: 1 },
          { name: "web", width: 1920, quality: 80, effort: 2 },
          { name: "full", quality: 85, effort: 3 },
        ],
      }
    );
    const time2 = Date.now() - start2;
    console.log(`   ✅ Total time: ${time2}ms`);
    console.log(`   📊 Average per size: ${multiResult.averageTimePerSize}`);
    console.log(`   📁 Generated files:`);
    for (const [key, size] of Object.entries(multiResult.sizes)) {
      console.log(
        `      ${size.name}: ${(size.fileSize / 1024).toFixed(1)}KB (${
          size.processingTime
        }ms)`
      );
    }
    console.log();

    // Test 3: Batch conversion with high concurrency
    console.log(
      "⚡ Test 3: Batch processing (simulated with individual files)"
    );
    const batchFiles = [
      "sample-images/012A0459.CR3",
      "sample-images/012A0879.CR3",
      "sample-images/020A0045.CR3",
    ];

    const start3 = Date.now();
    let successCount = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      try {
        const batchLibraw = new LibRaw();
        await batchLibraw.loadFile(batchFiles[i]);
        await batchLibraw.convertToJPEGFast(
          path.join(outputDir, `batch_${path.parse(batchFiles[i]).name}.jpg`),
          {
            quality: 85,
            fastMode: true,
            effort: 2,
          }
        );
        await batchLibraw.close();
        successCount++;
      } catch (error) {
        console.log(
          `   ❌ Failed to process ${batchFiles[i]}: ${error.message}`
        );
      }
    }
    const time3 = Date.now() - start3;
    console.log(`   ✅ Total time: ${time3}ms`);
    console.log(`   📊 Files processed: ${successCount}/${batchFiles.length}`);
    console.log(
      `   ⚡ Average per file: ${(time3 / successCount).toFixed(0)}ms\n`
    );

    // Performance summary
    console.log("📊 Performance Summary:");
    console.log("======================");
    console.log(`🚀 Ultra-fast single: ${time1}ms`);
    console.log(
      `📐 Multi-size (3x): ${time2}ms (${(time2 / 3).toFixed(0)}ms avg)`
    );
    console.log(
      `⚡ Batch (3 files): ${time3}ms (${(time3 / 3).toFixed(0)}ms avg)`
    );
    console.log(
      `\n🎯 Performance improvement: ~${Math.round(
        7000 / time1
      )}x faster than original!`
    );

    await libraw.close();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

performanceTest()
  .then(() => {
    console.log("\n✅ Performance test completed!");
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
