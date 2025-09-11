const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 缓冲区方法的快速验证测试
 * 在开发过程中运行此测试以进行快速验证
 */

const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
const outputDir = path.join(__dirname, "quick-test-output");

// 确保输出目录存在
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

  throw new Error("未找到 RAW 测试文件");
}

async function quickBufferTest() {
  console.log("🚀 快速缓冲区创建测试");
  console.log("=".repeat(40));

  const processor = new LibRaw();
  const testFile = findTestFile();

  try {
    console.log(`📁 加载中: ${path.basename(testFile)}`);
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
          console.log(`❌ ${test.name}: 无效的结果结构`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }

    console.log(`\n📂 输出已保存到: ${outputDir}`);
  } catch (error) {
    console.error("测试失败:", error.message);
  } finally {
    await processor.close();
  }
}

// 如果直接调用则运行测试
if (require.main === module) {
  quickBufferTest().catch(console.error);
}

module.exports = { quickBufferTest };
