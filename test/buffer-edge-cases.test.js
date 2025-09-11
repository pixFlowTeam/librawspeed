const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 缓冲区方法的边缘情况和内存管理测试
 */

const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");

function findTestFile() {
  const rawExtensions = [
    ".cr2",
    ".cr3",
    ".nef",
    ".arw",
    ".raf",
    ".rw2",
    ".dng",
  ];
  const files = fs.readdirSync(sampleImagesDir);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (rawExtensions.includes(ext)) {
      return path.join(sampleImagesDir, file);
    }
  }

  throw new Error("未找到 RAW 测试文件");
}

/**
 * 测试内存清理和多个缓冲区创建
 */
async function testMemoryManagement() {
  console.log("🧠 测试内存管理");
  console.log("-".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();
  let errors = 0;

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    console.log("  • 快速创建多个缓冲区...");

    // 快速创建多个缓冲区以测试内存管理
    for (let i = 0; i < 10; i++) {
      try {
        const jpegResult = await processor.createJPEGBuffer({
          quality: 75,
          width: 400,
        });
        const pngResult = await processor.createPNGBuffer({ width: 300 });

        if (!jpegResult.success || !pngResult.success) {
          console.log(`    ❌ 迭代 ${i + 1}: 缓冲区创建失败`);
          errors++;
        } else if (i % 3 === 0) {
          console.log(
            `    ✅ 迭代 ${i + 1}: JPEG ${
              jpegResult.buffer.length
            }B, PNG ${pngResult.buffer.length}B`
          );
        }

        // 清除引用以帮助垃圾回收
        jpegResult.buffer = null;
        pngResult.buffer = null;
      } catch (error) {
        console.log(`    ❌ 迭代 ${i + 1}: ${error.message}`);
        errors++;
      }
    }

    console.log(`  • 成功完成 ${10 - errors}/10 次迭代`);
  } catch (error) {
    console.log(`  ❌ 设置失败: ${error.message}`);
    errors++;
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * 测试极端参数值
 */
async function testExtremeParameters() {
  console.log("\n🔥 测试极端参数");
  console.log("-".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();
  let errors = 0;

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    const extremeTests = [
      {
        name: "极小图像 (宽度: 1)",
        test: () => processor.createJPEGBuffer({ width: 1 }),
      },
      {
        name: "极小图像 (宽度: 10)",
        test: () => processor.createJPEGBuffer({ width: 10 }),
      },
      {
        name: "最低质量 JPEG",
        test: () => processor.createJPEGBuffer({ quality: 1 }),
      },
      {
        name: "最高质量 JPEG",
        test: () => processor.createJPEGBuffer({ quality: 100 }),
      },
      {
        name: "无压缩 PNG",
        test: () => processor.createPNGBuffer({ compressionLevel: 0 }),
      },
      {
        name: "最大压缩 PNG",
        test: () => processor.createPNGBuffer({ compressionLevel: 9 }),
      },
      {
        name: "极小缩略图",
        test: () => processor.createThumbnailJPEGBuffer({ maxSize: 16 }),
      },
      {
        name: "大缩略图",
        test: () => processor.createThumbnailJPEGBuffer({ maxSize: 2000 }),
      },
    ];

    for (const extremeTest of extremeTests) {
      try {
        console.log(`  • ${extremeTest.name}...`);
        const result = await extremeTest.test();

        if (
          result.success &&
          Buffer.isBuffer(result.buffer) &&
          result.buffer.length > 0
        ) {
          console.log(`    ✅ 成功: ${result.buffer.length} 字节`);
          if (result.metadata?.outputDimensions) {
            const dims = result.metadata.outputDimensions;
            console.log(`    📐 ${dims.width}x${dims.height}`);
          }
        } else {
          console.log(`    ❌ 无效结果`);
          errors++;
        }
      } catch (error) {
        console.log(`    ⚠️ 预期失败: ${error.message}`);
        // 一些极端参数预期会失败
      }
    }
  } catch (error) {
    console.log(`  ❌ 设置失败: ${error.message}`);
    errors++;
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * 测试多个处理器并行运行
 */
async function testMultipleProcessors() {
  console.log("\n👥 测试多个处理器");
  console.log("-".repeat(40));

  const testFile = findTestFile();
  let errors = 0;

  try {
    console.log("  • 并行创建 3 个处理器...");

    const processorPromises = [1, 2, 3].map(async (id) => {
      const processor = new LibRaw();
      try {
        await processor.loadFile(testFile);
        await processor.processImage();

        const result = await processor.createJPEGBuffer({
          quality: 80,
          width: 600,
        });

        if (result.success && result.buffer.length > 0) {
          console.log(`    ✅ 处理器 ${id}: ${result.buffer.length} 字节`);
          return true;
        } else {
          console.log(`    ❌ 处理器 ${id}: 无效结果`);
          return false;
        }
      } catch (error) {
        console.log(`    ❌ 处理器 ${id}: ${error.message}`);
        return false;
      } finally {
        await processor.close();
      }
    });

    const results = await Promise.all(processorPromises);
    const successCount = results.filter((success) => success).length;

    console.log(`  📊 ${successCount}/3 个处理器成功`);

    if (successCount < 3) {
      errors += 3 - successCount;
    }
  } catch (error) {
    console.log(`  ❌ 测试失败: ${error.message}`);
    errors++;
  }

  return errors;
}

/**
 * 测试缓冲区格式验证
 */
async function testBufferFormatValidation() {
  console.log("\n🔍 测试缓冲区格式验证");
  console.log("-".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();
  let errors = 0;

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    const formatTests = [
      {
        name: "JPEG 魔数",
        method: () => processor.createJPEGBuffer({ width: 400 }),
        validator: (buffer) => {
          const header = buffer.slice(0, 4);
          return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
        },
      },
      {
        name: "PNG 魔数",
        method: () => processor.createPNGBuffer({ width: 400 }),
        validator: (buffer) => {
          const header = buffer.slice(0, 8);
          return (
            header[0] === 0x89 &&
            header[1] === 0x50 &&
            header[2] === 0x4e &&
            header[3] === 0x47
          );
        },
      },
      {
        name: "WebP 魔数",
        method: () => processor.createWebPBuffer({ width: 400 }),
        validator: (buffer) => {
          const header = buffer.toString("ascii", 0, 4);
          const format = buffer.toString("ascii", 8, 12);
          return header === "RIFF" && format === "WEBP";
        },
      },
      {
        name: "PPM 魔数",
        method: () => processor.createPPMBuffer(),
        validator: (buffer) => {
          const header = buffer.toString("ascii", 0, 2);
          return header === "P6";
        },
      },
    ];

    for (const test of formatTests) {
      try {
        console.log(`  • ${test.name}...`);
        const result = await test.method();

        if (result.success && Buffer.isBuffer(result.buffer)) {
          if (test.validator(result.buffer)) {
            console.log(`    ✅ 格式验证通过`);
          } else {
            console.log(`    ❌ 格式验证失败`);
            errors++;
          }
        } else {
          console.log(`    ❌ 缓冲区创建失败`);
          errors++;
        }
      } catch (error) {
        console.log(`    ❌ 测试失败: ${error.message}`);
        errors++;
      }
    }
  } catch (error) {
    console.log(`  ❌ 设置失败: ${error.message}`);
    errors++;
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Main edge case test runner
 */
async function runEdgeCaseTests() {
  console.log("🧪 LibRaw Buffer Edge Case Tests");
  console.log("=".repeat(50));

  const tests = [
    { name: "Memory Management", fn: testMemoryManagement },
    { name: "Extreme Parameters", fn: testExtremeParameters },
    { name: "Multiple Processors", fn: testMultipleProcessors },
    { name: "Format Validation", fn: testBufferFormatValidation },
  ];

  let totalErrors = 0;
  let passedTests = 0;

  for (const test of tests) {
    try {
      const errors = await test.fn();
      if (errors === 0) {
        console.log(`✅ ${test.name} - PASSED`);
        passedTests++;
      } else {
        console.log(`⚠️ ${test.name} - ${errors} errors`);
      }
      totalErrors += errors;
    } catch (error) {
      console.log(`💥 ${test.name} - CRASHED: ${error.message}`);
      totalErrors++;
    }
  }

  console.log("\n📊 Edge Case Test Summary");
  console.log("=".repeat(50));
  console.log(`Tests passed: ${passedTests}/${tests.length}`);
  console.log(`Total errors: ${totalErrors}`);

  if (totalErrors === 0) {
    console.log("\n🎉 All edge case tests passed!");
    return true;
  } else {
    console.log(`\n⚠️ ${totalErrors} issues found in edge case testing`);
    return false;
  }
}

// Export functions
module.exports = {
  runEdgeCaseTests,
  testMemoryManagement,
  testExtremeParameters,
  testMultipleProcessors,
  testBufferFormatValidation,
};

// Run if called directly
if (require.main === module) {
  runEdgeCaseTests()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error("Edge case tests crashed:", error);
      process.exit(1);
    });
}
