const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 批量 RAW 处理示例
 *
 * 处理目录中的多个 RAW 文件，具有：
 * - 进度跟踪
 * - 每个文件的错误处理
 * - 带并发控制的并行处理
 * - 汇总统计
 */

async function processFile(inputPath, outputDir, options = {}) {
  const processor = new LibRaw();
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const startTime = Date.now();

  try {
    await processor.loadFile(inputPath);

    // 配置处理
    if (options.outputParams) {
      await processor.setOutputParams(options.outputParams);
    }

    // 处理图像
    await processor.raw2Image();
    await processor.processImage();

    // 获取元数据用于汇总
    const metadata = await processor.getMetadata();

    // 根据选项保存输出
    const outputs = [];

    if (options.outputFormats?.includes("tiff")) {
      const tiffPath = path.join(outputDir, `${baseName}.tiff`);
      await processor.writeTIFF(tiffPath);
      outputs.push(
        `TIFF: ${(fs.statSync(tiffPath).size / 1024 / 1024).toFixed(1)}MB`
      );
    }

    if (options.outputFormats?.includes("ppm")) {
      const ppmPath = path.join(outputDir, `${baseName}.ppm`);
      await processor.writePPM(ppmPath);
      outputs.push(
        `PPM: ${(fs.statSync(ppmPath).size / 1024 / 1024).toFixed(1)}MB`
      );
    }

    if (options.outputFormats?.includes("thumbnail")) {
      const thumbPath = path.join(outputDir, `${baseName}_thumb.jpg`);
      await processor.writeThumbnail(thumbPath);
      outputs.push(
        `缩略图: ${(fs.statSync(thumbPath).size / 1024).toFixed(1)}KB`
      );
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      file: inputPath,
      metadata: {
        camera: `${metadata.make || "未知"} ${metadata.model || "未知"}`,
        resolution: `${metadata.width}×${metadata.height}`,
        iso: metadata.iso,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
      },
      outputs,
      processingTime,
      fileSize: fs.statSync(inputPath).size,
    };
  } catch (error) {
    return {
      success: false,
      file: inputPath,
      error: error.message,
      processingTime: Date.now() - startTime,
    };
  } finally {
    await processor.close();
  }
}

async function processFilesInBatches(files, outputDir, options = {}) {
  const concurrency = options.concurrency || 3;
  const results = [];
  const stats = {
    total: files.length,
    processed: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    totalInputSize: 0,
    cameras: new Set(),
  };

  console.log(
    `🚀 开始批量处理: ${files.length} 个文件，并发数 ${concurrency}`
  );

  // 分批处理文件
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    console.log(
      `\n📦 处理批次 ${Math.floor(i / concurrency) + 1}/${Math.ceil(
        files.length / concurrency
      )} (${batch.length} 个文件)`
    );

    const batchPromises = batch.map((file) =>
      processFile(file, outputDir, options)
    );
    const batchResults = await Promise.all(batchPromises);

    // 更新统计信息并显示结果
    for (const result of batchResults) {
      results.push(result);
      stats.processed++;
      stats.totalTime += result.processingTime;

      if (result.success) {
        stats.successful++;
        stats.totalInputSize += result.fileSize;
        stats.cameras.add(result.metadata.camera);

        console.log(`  ✅ ${path.basename(result.file)}`);
        console.log(
          `     📷 ${result.metadata.camera} | 📐 ${result.metadata.resolution}`
        );
        if (result.metadata.iso)
          console.log(
            `     🎯 ISO ${result.metadata.iso} | 🔍 f/${
              result.metadata.aperture
            } | ⏱️ 1/${Math.round(1 / result.metadata.shutterSpeed)}s`
          );
        console.log(
          `     💾 ${result.outputs.join(", ")} | ⏱️ ${result.processingTime}ms`
        );
      } else {
        stats.failed++;
        console.log(`  ❌ ${path.basename(result.file)}: ${result.error}`);
      }
    }

    // 进度更新
    const progress = ((stats.processed / stats.total) * 100).toFixed(1);
    console.log(
      `\n📊 进度: ${stats.processed}/${stats.total} (${progress}%) | ✅ ${stats.successful} | ❌ ${stats.failed}`
    );
  }

  return { results, stats };
}

async function batchProcess(inputDir, outputDir, options = {}) {
  console.log("🎯 批量 RAW 处理");
  console.log("=======================");

  const startTime = Date.now();

  // 默认选项
  const defaultOptions = {
    outputFormats: ["tiff", "thumbnail"],
    concurrency: 3,
    outputParams: {
      bright: 1.0,
      gamma: [2.2, 4.5],
      output_bps: 16,
      no_auto_bright: false,
      highlight: 1,
      output_color: 1,
    },
    extensions: [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".raf",
      ".orf",
      ".dng",
      ".raw",
    ],
  };

  const config = { ...defaultOptions, ...options };

  console.log(`📁 输入目录: ${inputDir}`);
  console.log(`📂 输出目录: ${outputDir}`);
  console.log(`🔧 格式: ${config.outputFormats.join(", ")}`);
  console.log(`⚙️ 并发数: ${config.concurrency}`);

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 查找 RAW 文件
  const allFiles = fs.readdirSync(inputDir);
  const rawFiles = allFiles
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return config.extensions.includes(ext);
    })
    .map((file) => path.join(inputDir, file));

  if (rawFiles.length === 0) {
    console.log(`❌ 在 ${inputDir} 中未找到 RAW 文件`);
    console.log(`   支持的扩展名: ${config.extensions.join(", ")}`);
    return;
  }

  console.log(`📸 找到 ${rawFiles.length} 个 RAW 文件`);

  // 处理文件
  const { results, stats } = await processFilesInBatches(
    rawFiles,
    outputDir,
    config
  );

  // 最终汇总
  const totalTime = Date.now() - startTime;
  console.log("\n🎉 批量处理完成！");
  console.log("===============================");
  console.log(
    `📊 文件: ${stats.successful}/${stats.total} 成功 (${(
      (stats.successful / stats.total) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `⏱️ 总时间: ${(totalTime / 1000).toFixed(1)}s (平均: ${(
      stats.totalTime / stats.successful
    ).toFixed(0)}ms 每文件)`
  );
  console.log(
    `💽 总输入: ${(stats.totalInputSize / 1024 / 1024).toFixed(1)} MB`
  );
  console.log(`📷 相机: ${Array.from(stats.cameras).join(", ")}`);
  console.log(
    `🚀 吞吐量: ${(
      stats.totalInputSize /
      1024 /
      1024 /
      (totalTime / 1000)
    ).toFixed(1)} MB/s`
  );

  if (stats.failed > 0) {
    console.log("\n❌ 失败的文件:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   ${path.basename(r.file)}: ${r.error}`);
      });
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "用法: node batch-example.js <输入目录> <输出目录> [选项]"
    );
    console.log("");
    console.log("选项:");
    console.log(
      "  --formats tiff,ppm,thumbnail  输出格式 (默认: tiff,thumbnail)"
    );
    console.log(
      "  --concurrency 3               并行处理限制 (默认: 3)"
    );
    console.log(
      "  --bright 1.1                  亮度调整 (默认: 1.0)"
    );
    console.log("");
    console.log(
      "示例: node batch-example.js ./input ./output --formats tiff,thumbnail --concurrency 2"
    );
    return;
  }

  const inputDir = args[0];
  const outputDir = args[1];

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ 输入目录未找到: ${inputDir}`);
    return;
  }

  // 解析选项
  const options = {};
  for (let i = 2; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case "--formats":
        options.outputFormats = value.split(",");
        break;
      case "--concurrency":
        options.concurrency = parseInt(value);
        break;
      case "--bright":
        options.outputParams = { bright: parseFloat(value) };
        break;
    }
  }

  try {
    await batchProcess(inputDir, outputDir, options);
  } catch (error) {
    console.error(`❌ 致命错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 导出供模块使用
module.exports = {
  batchProcess,
  processFile,
};

// 如果直接调用则运行
if (require.main === module) {
  main().catch(console.error);
}
