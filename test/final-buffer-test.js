const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 所有缓冲区创建方法的最终验证测试
 * 此测试验证所有方法正常工作并创建输出文件
 */

async function finalBufferTest() {
  console.log("🏁 Final Buffer Creation Test");
  console.log("=".repeat(45));

  const processor = new LibRaw();
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  const outputDir = path.join(__dirname, "final-test-output");

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // 查找测试文件
    const files = fs.readdirSync(sampleImagesDir);
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".raf",
      ".rw2",
      ".dng",
    ];
    const testFile = files.find((file) => {
      const ext = path.extname(file).toLowerCase();
      return rawExtensions.includes(ext);
    });

    if (!testFile) {
      throw new Error("未找到 RAW 测试文件");
    }

    const fullPath = path.join(sampleImagesDir, testFile);
    console.log(`📁 Testing with: ${testFile}`);

    // 加载并处理 RAW 文件
    await processor.loadFile(fullPath);
    await processor.processImage();

    const tests = [
      {
        name: "JPEG Buffer",
        method: () => processor.createJPEGBuffer({ quality: 85, width: 600 }),
        filename: "final_test.jpg",
        expectedMinSize: 10000,
      },
      {
        name: "PNG Buffer",
        method: () =>
          processor.createPNGBuffer({ width: 500, compressionLevel: 6 }),
        filename: "final_test.png",
        expectedMinSize: 20000,
      },
      {
        name: "WebP Buffer",
        method: () => processor.createWebPBuffer({ quality: 80, width: 600 }),
        filename: "final_test.webp",
        expectedMinSize: 5000,
      },
      {
        name: "AVIF Buffer",
        method: () => processor.createAVIFBuffer({ quality: 50, width: 500 }),
        filename: "final_test.avif",
        expectedMinSize: 3000,
      },
      {
        name: "TIFF Buffer",
        method: () =>
          processor.createTIFFBuffer({ compression: "lzw", width: 400 }),
        filename: "final_test.tiff",
        expectedMinSize: 15000,
      },
    ];

    // Test thumbnail separately (doesn't need full processing)
    const thumbnailProcessor = new LibRaw();
    await thumbnailProcessor.loadFile(fullPath);
    tests.push({
      name: "Thumbnail Buffer",
      method: () =>
        thumbnailProcessor.createThumbnailJPEGBuffer({
          maxSize: 200,
          quality: 85,
        }),
      filename: "final_test_thumb.jpg",
      expectedMinSize: 2000,
      processor: thumbnailProcessor,
    });

    let passedTests = 0;
    const totalTests = tests.length;

    console.log("\n🧪 Running buffer creation tests...");

    for (const test of tests) {
      try {
        console.log(`  • ${test.name}...`);
        const startTime = Date.now();
        const result = await test.method();
        const endTime = Date.now();

        // Validate result structure
        if (!result || !result.success || !Buffer.isBuffer(result.buffer)) {
          console.log(`    ❌ Invalid result structure`);
          continue;
        }

        // Validate buffer size
        if (result.buffer.length < test.expectedMinSize) {
          console.log(
            `    ❌ Buffer too small: ${result.buffer.length} bytes (expected min: ${test.expectedMinSize})`
          );
          continue;
        }

        // Validate metadata
        if (!result.metadata) {
          console.log(`    ❌ Missing metadata`);
          continue;
        }

        // Check dimensions
        const dimensions =
          result.metadata.outputDimensions || result.metadata.dimensions;
        if (!dimensions || !dimensions.width || !dimensions.height) {
          console.log(`    ❌ Missing or invalid dimensions`);
          continue;
        }

        // Save file
        fs.writeFileSync(path.join(outputDir, test.filename), result.buffer);

        // Success
        console.log(
          `    ✅ Success: ${(result.buffer.length / 1024).toFixed(1)}KB, ${
            dimensions.width
          }x${dimensions.height} (${endTime - startTime}ms)`
        );
        passedTests++;
      } catch (error) {
        console.log(`    ❌ Failed: ${error.message}`);
      }
    }

    // Close additional processor
    await thumbnailProcessor.close();

    // Test parallel creation
    console.log("\n🔄 Testing parallel creation...");
    try {
      const parallelStart = Date.now();
      const [jpeg, png, webp] = await Promise.all([
        processor.createJPEGBuffer({ quality: 75, width: 300 }),
        processor.createPNGBuffer({ width: 300, compressionLevel: 3 }),
        processor.createWebPBuffer({ quality: 70, width: 300 }),
      ]);
      const parallelEnd = Date.now();

      if (jpeg.success && png.success && webp.success) {
        fs.writeFileSync(
          path.join(outputDir, "parallel_jpeg.jpg"),
          jpeg.buffer
        );
        fs.writeFileSync(path.join(outputDir, "parallel_png.png"), png.buffer);
        fs.writeFileSync(
          path.join(outputDir, "parallel_webp.webp"),
          webp.buffer
        );

        console.log(
          `  ✅ Parallel creation successful (${parallelEnd - parallelStart}ms)`
        );
        console.log(`     JPEG: ${(jpeg.buffer.length / 1024).toFixed(1)}KB`);
        console.log(`     PNG: ${(png.buffer.length / 1024).toFixed(1)}KB`);
        console.log(`     WebP: ${(webp.buffer.length / 1024).toFixed(1)}KB`);
        passedTests++; // Count parallel as one extra test
      } else {
        console.log(`  ❌ Parallel creation failed`);
      }
    } catch (error) {
      console.log(`  ❌ Parallel test failed: ${error.message}`);
    }

    // Summary
    console.log("\n📊 Final Test Results");
    console.log("=".repeat(45));
    console.log(`✅ Passed: ${passedTests}/${totalTests + 1} tests`);
    console.log(`📂 Output directory: ${outputDir}`);

    // List output files with sizes
    const outputFiles = fs.readdirSync(outputDir);
    console.log(`📋 Generated ${outputFiles.length} files:`);
    outputFiles.forEach((file) => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`   ${file.padEnd(25)} ${sizeKB.padStart(8)}KB`);
    });

    if (passedTests === totalTests + 1) {
      console.log("\n🎉 ALL BUFFER TESTS PASSED!");
      console.log("   Your buffer creation API is working perfectly.");
      return true;
    } else {
      console.log(`\n⚠️ ${totalTests + 1 - passedTests} test(s) failed.`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Test setup failed: ${error.message}`);
    return false;
  } finally {
    await processor.close();
  }
}

// Run test if called directly
if (require.main === module) {
  finalBufferTest()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Final test crashed:", error);
      process.exit(1);
    });
}

module.exports = { finalBufferTest };
