#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const fs = require("fs");

async function testParallelBatch() {
  console.log("🚀 并行批量处理测试");
  console.log("=================================\n");

  const batchFiles = [
    "sample-images/012A0459.CR3",
    "sample-images/012A0879.CR3",
    "sample-images/020A0045.CR3",
  ];

  const outputDir = "examples/parallel-batch-test";

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📁 并行处理 ${batchFiles.length} 个 RAW 文件...`);
  console.log(`📂 输出目录: ${outputDir}\n`);

  try {
    const startTime = Date.now();

    const result = await LibRaw.batchConvertToJPEGParallel(
      batchFiles,
      outputDir,
      {
        quality: 85,
        fastMode: true,
        effort: 1,
        maxConcurrency: 3, // 同时处理所有文件
      }
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log("📊 并行批量结果:");
    console.log("==========================");
    console.log(`✅ 总文件数: ${result.totalFiles}`);
    console.log(`✅ 成功: ${result.successCount}`);
    console.log(`❌ 错误: ${result.errorCount}`);
    console.log(`⚡ 总时间: ${totalTime}ms`);
    console.log(
      `📊 每个文件平均: ${(totalTime / result.successCount).toFixed(0)}ms`
    );
    console.log(
      `🎯 吞吐量: ${(result.successCount / (totalTime / 1000)).toFixed(
        2
      )} 文件/秒\n`
    );

    console.log("📋 个别结果:");
    result.results.forEach((fileResult, index) => {
      if (fileResult.success) {
        const fileName = require("path").basename(fileResult.inputPath);
        const sizeKB = (fileResult.fileSize / 1024).toFixed(1);
        console.log(
          `   ${index + 1}. ${fileName}: ${sizeKB}KB (${
            fileResult.processingTime
          }ms)`
        );
      } else {
        console.log(
          `   ${index + 1}. ${fileResult.inputPath}: ❌ ${fileResult.error}`
        );
      }
    });

    if (result.errorCount > 0) {
      console.log("\n❌ 遇到的错误:");
      result.errors.forEach((error) => {
        console.log(`   - ${error.inputPath}: ${error.error}`);
      });
    }

    console.log(`\n🎉 并行处理完成！`);
    console.log(
      `💡 速度比较: 比顺序处理快 ${(
        7907 /
        (totalTime / result.successCount)
      ).toFixed(1)} 倍！`
    );
  } catch (error) {
    console.error("❌ 批量处理失败:", error.message);
    process.exit(1);
  }
}

testParallelBatch();
