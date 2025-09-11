#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const path = require("path");

async function speedTest() {
  console.log("⚡ Performance Speed Test - Caching Benefits");
  console.log("============================================\n");

  const rawFile = "sample-images/012A0459.CR3";
  const outputDir = "examples/speed-test";

  // Ensure output directory exists
  const fs = require("fs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const libraw = new LibRaw();
    await libraw.loadFile(rawFile);

    console.log("📁 Loaded RAW file:", rawFile);
    console.log("📷 Testing conversion speed with caching benefits...\n");

    // Test 1: First conversion (includes RAW processing)
    console.log("🔄 Test 1: First conversion (with RAW processing)");
    const start1 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test1.jpg"), {
      quality: 80,
      fastMode: true,
    });
    const time1 = Date.now() - start1;
    console.log(`   ⚡ Time: ${time1}ms\n`);

    // Test 2: Second conversion (uses cached data)
    console.log("🔄 Test 2: Second conversion (cached data)");
    const start2 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test2.jpg"), {
      quality: 85,
      fastMode: true,
    });
    const time2 = Date.now() - start2;
    console.log(`   ⚡ Time: ${time2}ms\n`);

    // Test 3: Different size (cached data)
    console.log("🔄 Test 3: Resize conversion (cached data)");
    const start3 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test3_web.jpg"), {
      quality: 80,
      width: 1920,
      fastMode: true,
    });
    const time3 = Date.now() - start3;
    console.log(`   ⚡ Time: ${time3}ms\n`);

    // Test 4: Thumbnail (cached data)
    console.log("🔄 Test 4: Thumbnail conversion (cached data)");
    const start4 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test4_thumb.jpg"), {
      quality: 75,
      width: 400,
      fastMode: true,
    });
    const time4 = Date.now() - start4;
    console.log(`   ⚡ Time: ${time4}ms\n`);

    await libraw.close();

    console.log("📊 Performance Summary:");
    console.log("======================");
    console.log(`🔄 First conversion (with processing): ${time1}ms`);
    console.log(
      `⚡ Second conversion (cached): ${time2}ms - ${(time1 / time2).toFixed(
        1
      )}x faster`
    );
    console.log(
      `📐 Resize conversion (cached): ${time3}ms - ${(time1 / time3).toFixed(
        1
      )}x faster`
    );
    console.log(
      `📱 Thumbnail conversion (cached): ${time4}ms - ${(time1 / time4).toFixed(
        1
      )}x faster`
    );

    const avgCachedTime = (time2 + time3 + time4) / 3;
    console.log(
      `\n🎯 Average cached performance: ${avgCachedTime.toFixed(0)}ms`
    );
    console.log(
      `🚀 Caching provides: ${(time1 / avgCachedTime).toFixed(
        1
      )}x speed improvement!`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

speedTest();
