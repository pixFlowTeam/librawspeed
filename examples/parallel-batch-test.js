#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const fs = require("fs");

async function testParallelBatch() {
  console.log("🚀 Parallel Batch Processing Test");
  console.log("=================================\n");

  const batchFiles = [
    "sample-images/012A0459.CR3",
    "sample-images/012A0879.CR3",
    "sample-images/020A0045.CR3",
  ];

  const outputDir = "examples/parallel-batch-test";

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📁 Processing ${batchFiles.length} RAW files in parallel...`);
  console.log(`📂 Output directory: ${outputDir}\n`);

  try {
    const startTime = Date.now();

    const result = await LibRaw.batchConvertToJPEGParallel(
      batchFiles,
      outputDir,
      {
        quality: 85,
        fastMode: true,
        effort: 1,
        maxConcurrency: 3, // Process all files simultaneously
      }
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log("📊 Parallel Batch Results:");
    console.log("==========================");
    console.log(`✅ Total files: ${result.totalFiles}`);
    console.log(`✅ Successful: ${result.successCount}`);
    console.log(`❌ Errors: ${result.errorCount}`);
    console.log(`⚡ Total time: ${totalTime}ms`);
    console.log(
      `📊 Average per file: ${(totalTime / result.successCount).toFixed(0)}ms`
    );
    console.log(
      `🎯 Throughput: ${(result.successCount / (totalTime / 1000)).toFixed(
        2
      )} files/second\n`
    );

    console.log("📋 Individual Results:");
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
      console.log("\n❌ Errors encountered:");
      result.errors.forEach((error) => {
        console.log(`   - ${error.inputPath}: ${error.error}`);
      });
    }

    console.log(`\n🎉 Parallel processing completed!`);
    console.log(
      `💡 Speed comparison: ${(
        7907 /
        (totalTime / result.successCount)
      ).toFixed(1)}x faster than sequential!`
    );
  } catch (error) {
    console.error("❌ Batch processing failed:", error.message);
    process.exit(1);
  }
}

testParallelBatch();
