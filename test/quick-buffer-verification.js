const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Quick verification tests for buffer methods
 * Run this for fast validation during development
 */

const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
const outputDir = path.join(__dirname, "quick-test-output");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

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

async function quickBufferTest() {
  console.log("🚀 Quick Buffer Creation Test");
  console.log("=".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();

  try {
    console.log(`📁 Loading: ${path.basename(testFile)}`);
    await processor.loadFile(testFile);
    await processor.processImage();

    const tests = [
      {
        name: "JPEG",
        method: () => processor.createJPEGBuffer({ quality: 85, width: 800 }),
        ext: "jpg",
      },
      {
        name: "PNG",
        method: () => processor.createPNGBuffer({ width: 600 }),
        ext: "png",
      },
      {
        name: "WebP",
        method: () => processor.createWebPBuffer({ quality: 80, width: 800 }),
        ext: "webp",
      },
      {
        name: "Thumbnail",
        method: () => processor.createThumbnailJPEGBuffer({ maxSize: 200 }),
        ext: "jpg",
        suffix: "_thumb",
      },
    ];

    for (const test of tests) {
      try {
        const startTime = Date.now();
        const result = await test.method();
        const endTime = Date.now();

        if (result.success && Buffer.isBuffer(result.buffer)) {
          const filename = `quick_test${test.suffix || ""}.${test.ext}`;
          fs.writeFileSync(path.join(outputDir, filename), result.buffer);

          console.log(
            `✅ ${test.name}: ${result.buffer.length} bytes (${
              endTime - startTime
            }ms)`
          );

          if (result.metadata && result.metadata.outputDimensions) {
            console.log(
              `   📐 ${result.metadata.outputDimensions.width}x${result.metadata.outputDimensions.height}`
            );
          }
        } else {
          console.log(`❌ ${test.name}: Invalid result structure`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    console.log(`\n📂 Output saved to: ${outputDir}`);
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await processor.close();
  }
}

// Run test if called directly
if (require.main === module) {
  quickBufferTest().catch(console.error);
}

module.exports = { quickBufferTest };
