#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

async function quickImageTest() {
  console.log("🔍 快速图像质量测试");
  console.log("===========================\n");

  const rawFile = "sample-images/012A0459.CR3";
  const outputPath = "examples/quality-test.jpg";

  try {
    console.log(`📁 处理: ${rawFile}`);

    const libraw = new LibRaw();
    await libraw.loadFile(rawFile);

    // 转换为 JPEG
    const result = await libraw.convertToJPEG(outputPath, {
      quality: 85,
      fastMode: true,
      effort: 3,
    });

    console.log(`✅ JPEG 已创建: ${outputPath}`);
    console.log(
      `📊 文件大小: ${(result.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(`⚡ 处理时间: ${result.metadata.processing.timeMs}ms`);
    console.log(
      `📐 尺寸: ${result.metadata.outputDimensions.width}x${result.metadata.outputDimensions.height}`
    );

    // 检查文件是否存在且有合理大小
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 100000) {
        // > 100KB 表示正确的图像
        console.log(
          "✅ 图像似乎已正确处理（文件大小良好）"
        );
      } else {
        console.log(
          "⚠️  警告: 图像文件非常小，可能是黑色/损坏的"
        );
      }
    }

    await libraw.close();
  } catch (error) {
    console.error("❌ 错误:", error.message);
    process.exit(1);
  }
}

quickImageTest()
  .then(() => {
    console.log("\n✅ 质量测试完成！");
  })
  .catch((error) => {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  });
