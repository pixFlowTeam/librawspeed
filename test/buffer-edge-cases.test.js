const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Edge cases and memory management tests for buffer methods
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

  throw new Error("No RAW test file found");
}

/**
 * Test memory cleanup and multiple buffer creations
 */
async function testMemoryManagement() {
  console.log("🧠 Testing Memory Management");
  console.log("-".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();
  let errors = 0;

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    console.log("  • Creating multiple buffers rapidly...");

    // Create multiple buffers rapidly to test memory management
    for (let i = 0; i < 10; i++) {
      try {
        const jpegResult = await processor.createJPEGBuffer({
          quality: 75,
          width: 400,
        });
        const pngResult = await processor.createPNGBuffer({ width: 300 });

        if (!jpegResult.success || !pngResult.success) {
          console.log(`    ❌ Iteration ${i + 1}: Buffer creation failed`);
          errors++;
        } else if (i % 3 === 0) {
          console.log(
            `    ✅ Iteration ${i + 1}: JPEG ${
              jpegResult.buffer.length
            }B, PNG ${pngResult.buffer.length}B`
          );
        }

        // Clear references to help GC
        jpegResult.buffer = null;
        pngResult.buffer = null;
      } catch (error) {
        console.log(`    ❌ Iteration ${i + 1}: ${error.message}`);
        errors++;
      }
    }

    console.log(`  • Completed ${10 - errors}/10 iterations successfully`);
  } catch (error) {
    console.log(`  ❌ Setup failed: ${error.message}`);
    errors++;
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test extreme parameter values
 */
async function testExtremeParameters() {
  console.log("\n🔥 Testing Extreme Parameters");
  console.log("-".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();
  let errors = 0;

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    const extremeTests = [
      {
        name: "Very small image (width: 1)",
        test: () => processor.createJPEGBuffer({ width: 1 }),
      },
      {
        name: "Very small image (width: 10)",
        test: () => processor.createJPEGBuffer({ width: 10 }),
      },
      {
        name: "Minimum quality JPEG",
        test: () => processor.createJPEGBuffer({ quality: 1 }),
      },
      {
        name: "Maximum quality JPEG",
        test: () => processor.createJPEGBuffer({ quality: 100 }),
      },
      {
        name: "No compression PNG",
        test: () => processor.createPNGBuffer({ compressionLevel: 0 }),
      },
      {
        name: "Maximum compression PNG",
        test: () => processor.createPNGBuffer({ compressionLevel: 9 }),
      },
      {
        name: "Tiny thumbnail",
        test: () => processor.createThumbnailJPEGBuffer({ maxSize: 16 }),
      },
      {
        name: "Large thumbnail",
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
          console.log(`    ✅ Success: ${result.buffer.length} bytes`);
          if (result.metadata?.outputDimensions) {
            const dims = result.metadata.outputDimensions;
            console.log(`    📐 ${dims.width}x${dims.height}`);
          }
        } else {
          console.log(`    ❌ Invalid result`);
          errors++;
        }
      } catch (error) {
        console.log(`    ⚠️ Expected failure: ${error.message}`);
        // Some extreme parameters are expected to fail
      }
    }
  } catch (error) {
    console.log(`  ❌ Setup failed: ${error.message}`);
    errors++;
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test multiple processors in parallel
 */
async function testMultipleProcessors() {
  console.log("\n👥 Testing Multiple Processors");
  console.log("-".repeat(40));

  const testFile = findTestFile();
  let errors = 0;

  try {
    console.log("  • Creating 3 processors in parallel...");

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
          console.log(`    ✅ Processor ${id}: ${result.buffer.length} bytes`);
          return true;
        } else {
          console.log(`    ❌ Processor ${id}: Invalid result`);
          return false;
        }
      } catch (error) {
        console.log(`    ❌ Processor ${id}: ${error.message}`);
        return false;
      } finally {
        await processor.close();
      }
    });

    const results = await Promise.all(processorPromises);
    const successCount = results.filter((success) => success).length;

    console.log(`  📊 ${successCount}/3 processors succeeded`);

    if (successCount < 3) {
      errors += 3 - successCount;
    }
  } catch (error) {
    console.log(`  ❌ Test failed: ${error.message}`);
    errors++;
  }

  return errors;
}

/**
 * Test buffer format validation
 */
async function testBufferFormatValidation() {
  console.log("\n🔍 Testing Buffer Format Validation");
  console.log("-".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();
  let errors = 0;

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    const formatTests = [
      {
        name: "JPEG magic bytes",
        method: () => processor.createJPEGBuffer({ width: 400 }),
        validator: (buffer) => {
          const header = buffer.slice(0, 4);
          return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
        },
      },
      {
        name: "PNG magic bytes",
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
        name: "WebP magic bytes",
        method: () => processor.createWebPBuffer({ width: 400 }),
        validator: (buffer) => {
          const header = buffer.toString("ascii", 0, 4);
          const format = buffer.toString("ascii", 8, 12);
          return header === "RIFF" && format === "WEBP";
        },
      },
      {
        name: "PPM magic bytes",
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
            console.log(`    ✅ Format validated`);
          } else {
            console.log(`    ❌ Format validation failed`);
            errors++;
          }
        } else {
          console.log(`    ❌ Buffer creation failed`);
          errors++;
        }
      } catch (error) {
        console.log(`    ❌ Test failed: ${error.message}`);
        errors++;
      }
    }
  } catch (error) {
    console.log(`  ❌ Setup failed: ${error.message}`);
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
