const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function batchJPEGConversion() {
  console.log("LibRaw 批量 JPEG 转换");
  console.log("============================\n");

  const processor = new LibRaw();

  try {
    // 从命令行获取输入目录和输出目录
    const inputDir = process.argv[2];
    const outputDir = process.argv[3] || path.join(inputDir, "jpeg-output");

    if (!inputDir || !fs.existsSync(inputDir)) {
      console.log("❌ 未找到输入目录或未指定");
      console.log(
        "\n用法: node batch-jpeg-conversion.js <输入目录> [输出目录]"
      );
      console.log(
        "示例: node batch-jpeg-conversion.js C:\\photos\\raw C:\\photos\\jpeg"
      );
      return;
    }

    console.log(`📁 输入目录: ${inputDir}`);
    console.log(`📁 输出目录: ${outputDir}`);

    // 在输入目录中查找所有 RAW 文件
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".dng",
      ".raf",
      ".rw2",
      ".pef",
      ".orf",
    ];
    const files = fs.readdirSync(inputDir);
    const rawFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return rawExtensions.includes(ext);
      })
      .map((file) => path.join(inputDir, file));

    if (rawFiles.length === 0) {
      console.log("❌ 在输入目录中未找到 RAW 文件");
      console.log("支持的格式:", rawExtensions.join(", "));
      return;
    }

    console.log(`🔍 找到 ${rawFiles.length} 个 RAW 文件需要转换\n`);

    // 显示转换选项菜单
    console.log("📋 转换预设:");
    console.log("1. 网络优化 (1920px, Q80, 渐进式)");
    console.log("2. 打印质量 (原始尺寸, Q95, 高色度)");
    console.log("3. 存档 (原始尺寸, Q95, 最高质量)");
    console.log("4. 缩略图 (800px, Q85)");
    console.log("5. 自定义设置");

    // 在此示例中，我们将使用网络优化设置
    // 在真实的 CLI 工具中，您会提示用户输入
    const preset = process.argv[4] || "1";

    let conversionOptions = {};
    let presetName = "";

    switch (preset) {
      case "1":
        conversionOptions = {
          quality: 80,
          width: 1920,
          progressive: true,
          mozjpeg: true,
          optimizeScans: true,
          chromaSubsampling: "4:2:0",
        };
        presetName = "网络优化";
        break;
      case "2":
        conversionOptions = {
          quality: 95,
          chromaSubsampling: "4:2:2",
          trellisQuantisation: true,
          optimizeCoding: true,
          mozjpeg: true,
        };
        presetName = "打印质量";
        break;
      case "3":
        conversionOptions = {
          quality: 98,
          chromaSubsampling: "4:4:4",
          trellisQuantisation: true,
          optimizeCoding: true,
          mozjpeg: true,
        };
        presetName = "存档质量";
        break;
      case "4":
        conversionOptions = {
          quality: 85,
          width: 800,
          chromaSubsampling: "4:2:2",
          mozjpeg: true,
        };
        presetName = "缩略图";
        break;
      default:
        // Custom settings - use defaults
        conversionOptions = { quality: 85 };
        presetName = "自定义";
    }

    console.log(`\n🎯 使用预设: ${presetName}`);
    console.log("设置:", JSON.stringify(conversionOptions, null, 2));

    // 开始批量转换
    console.log("\n🔄 开始批量转换...\n");
    const startTime = process.hrtime.bigint();

    const result = await processor.batchConvertToJPEG(
      rawFiles,
      outputDir,
      conversionOptions
    );

    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1000000; // ms

    // 显示结果
    console.log("\n📊 转换结果:");
    console.log("======================");
    console.log(
      `✅ 成功转换: ${result.summary.processed}/${result.summary.total} 个文件`
    );
    console.log(`❌ 转换失败: ${result.summary.errors}`);
    console.log(`🕐 总处理时间: ${(totalTime / 1000).toFixed(1)}秒`);
    console.log(
      `⚡ 平均每文件时间: ${result.summary.averageProcessingTimePerFile}毫秒`
    );
    console.log(
      `📉 平均压缩比: ${result.summary.averageCompressionRatio}倍`
    );
    console.log(
      `💾 节省空间: ${(
        (result.summary.totalOriginalSize -
          result.summary.totalCompressedSize) /
        1024 /
        1024
      ).toFixed(1)}MB`
    );

    if (result.successful.length > 0) {
      console.log("\n✅ 成功转换的文件:");
      result.successful.forEach((item, index) => {
        const fileName = path.basename(item.input);
        const outputSize = (
          item.result.metadata.fileSize.compressed / 1024
        ).toFixed(1);
        const compressionRatio = item.result.metadata.fileSize.compressionRatio;
        const processingTime = parseFloat(
          item.result.metadata.processing.timeMs
        ).toFixed(1);

        console.log(`   ${index + 1}. ${fileName}`);
        console.log(
          `      📊 大小: ${outputSize}KB (${compressionRatio}倍压缩)`
        );
        console.log(`      ⚡ 时间: ${processingTime}毫秒`);

        if (
          item.result.metadata.outputDimensions.width !==
          item.result.metadata.originalDimensions.width
        ) {
          console.log(
            `      📐 调整尺寸: ${item.result.metadata.originalDimensions.width}x${item.result.metadata.originalDimensions.height} → ${item.result.metadata.outputDimensions.width}x${item.result.metadata.outputDimensions.height}`
          );
        }
      });
    }

    if (result.failed.length > 0) {
      console.log("\n❌ 转换失败:");
      result.failed.forEach((item, index) => {
        const fileName = path.basename(item.input);
        console.log(`   ${index + 1}. ${fileName}: ${item.error}`);
      });
    }

    // 性能分析
    if (result.successful.length > 0) {
      const throughputs = result.successful.map((item) =>
        parseFloat(item.result.metadata.processing.throughputMBps)
      );
      const avgThroughput = (
        throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      ).toFixed(1);

      console.log("\n📈 性能分析:");
      console.log(`   平均吞吐量: ${avgThroughput} MB/s`);
      console.log(
        `   总处理数据: ${(
          result.summary.totalOriginalSize /
          1024 /
          1024
        ).toFixed(1)}MB`
      );
      console.log(
        `   总输出大小: ${(
          result.summary.totalCompressedSize /
          1024 /
          1024
        ).toFixed(1)}MB`
      );
    }

    // 创建摘要 HTML 报告
    const reportPath = path.join(outputDir, "conversion-report.html");
    await createHTMLReport(result, conversionOptions, presetName, reportPath);
    console.log(`\n📄 HTML 报告已创建: ${reportPath}`);

    console.log("\n🧹 清理中...");
    await processor.close();

    console.log("\n🎉 批量转换完成!");
    console.log(`📁 检查输出目录: ${outputDir}`);
  } catch (error) {
    console.error("\n❌ 错误:", error.message);
    console.error("\n故障排除:");
    console.error(
      "1. 确保输入目录存在且包含 RAW 文件"
    );
    console.error(
      "2. 检查您对输出目录有写入权限"
    );
    console.error("3. 验证 LibRaw 插件已构建: npm run build");
    console.error("4. 确保 Sharp 已安装: npm install sharp");
  }
}

async function createHTMLReport(result, options, presetName, outputPath) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LibRaw JPEG 转换报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #007acc; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007acc; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h3 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .settings { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; }
        .settings pre { margin: 0; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📸 LibRaw JPEG 转换报告</h1>
            <p>生成时间: ${new Date().toLocaleString()}</p>
            <p><strong>预设:</strong> ${presetName}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${result.summary.processed}</div>
                <div class="stat-label">已转换文件</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(
                  (result.summary.processed / result.summary.total) *
                  100
                ).toFixed(1)}%</div>
                <div class="stat-label">成功率</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${
                  result.summary.averageProcessingTimePerFile
                }ms</div>
                <div class="stat-label">平均时间/文件</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${
                  result.summary.averageCompressionRatio
                }x</div>
                <div class="stat-label">平均压缩比</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(
                  (result.summary.totalOriginalSize -
                    result.summary.totalCompressedSize) /
                  1024 /
                  1024
                ).toFixed(1)}MB</div>
                <div class="stat-label">节省空间</div>
            </div>
        </div>
        
        <div class="section">
            <h3>⚙️ 转换设置</h3>
            <div class="settings">
                <pre>${JSON.stringify(options, null, 2)}</pre>
            </div>
        </div>
        
        <div class="section">
            <h3>✅ 成功转换的文件 (${
              result.successful.length
            })</h3>
            <table>
                <thead>
                    <tr>
                        <th>文件名</th>
                        <th>原始大小</th>
                        <th>输出大小</th>
                        <th>压缩比</th>
                        <th>处理时间</th>
                        <th>尺寸</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.successful
                      .map((item) => {
                        const fileName = item.input.split(/[/\\]/).pop();
                        const originalSize = (
                          item.result.metadata.fileSize.original /
                          1024 /
                          1024
                        ).toFixed(1);
                        const outputSize = (
                          item.result.metadata.fileSize.compressed / 1024
                        ).toFixed(1);
                        const compression =
                          item.result.metadata.fileSize.compressionRatio;
                        const time = parseFloat(
                          item.result.metadata.processing.timeMs
                        ).toFixed(1);
                        const dims = `${item.result.metadata.outputDimensions.width}×${item.result.metadata.outputDimensions.height}`;

                        return `
                        <tr>
                            <td>${fileName}</td>
                            <td>${originalSize}MB</td>
                            <td>${outputSize}KB</td>
                            <td>${compression}x</td>
                            <td>${time}ms</td>
                            <td>${dims}</td>
                        </tr>`;
                      })
                      .join("")}
                </tbody>
            </table>
        </div>
        
        ${
          result.failed.length > 0
            ? `
        <div class="section">
            <h3>❌ 转换失败 (${result.failed.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>错误</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.failed
                      .map((item) => {
                        const fileName = item.input.split(/[/\\]/).pop();
                        return `
                        <tr>
                            <td>${fileName}</td>
                            <td class="error">${item.error}</td>
                        </tr>`;
                      })
                      .join("")}
                </tbody>
            </table>
        </div>
        `
            : ""
        }
        
        <div class="section">
            <h3>📊 性能摘要</h3>
            <ul>
                <li><strong>总处理时间:</strong> ${(
                  result.summary.totalProcessingTime / 1000
                ).toFixed(1)} 秒</li>
                <li><strong>平均每文件时间:</strong> ${
                  result.summary.averageProcessingTimePerFile
                }毫秒</li>
                <li><strong>总原始数据:</strong> ${(
                  result.summary.totalOriginalSize /
                  1024 /
                  1024
                ).toFixed(1)}MB</li>
                <li><strong>总压缩数据:</strong> ${(
                  result.summary.totalCompressedSize /
                  1024 /
                  1024
                ).toFixed(1)}MB</li>
                <li><strong>空间节省:</strong> ${(
                  ((result.summary.totalOriginalSize -
                    result.summary.totalCompressedSize) /
                    result.summary.totalOriginalSize) *
                  100
                ).toFixed(1)}%</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
            <p>由 LibRaw Node.js JPEG 转换器生成</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
}

// 使用说明
if (process.argv.length < 3) {
  console.log("LibRaw 批量 JPEG 转换");
  console.log(
    "用法: node batch-jpeg-conversion.js <输入目录> [输出目录] [预设]"
  );
  console.log("");
  console.log("参数:");
  console.log("  输入目录   包含 RAW 文件的目录");
  console.log(
    "  输出目录   JPEG 输出目录 (可选，默认: 输入目录/jpeg-output)"
  );
  console.log("  预设        转换预设 (1-4，可选，默认: 1)");
  console.log("");
  console.log("预设:");
  console.log("  1 - 网络优化 (1920px, Q80, 渐进式)");
  console.log("  2 - 打印质量 (原始尺寸, Q95, 高色度)");
  console.log("  3 - 存档 (原始尺寸, Q98, 最高质量)");
  console.log("  4 - 缩略图 (800px, Q85)");
  console.log("");
  console.log("示例:");
  console.log("  node batch-jpeg-conversion.js C:\\photos\\raw");
  console.log(
    "  node batch-jpeg-conversion.js C:\\photos\\raw C:\\photos\\web 1"
  );
  console.log("  node batch-jpeg-conversion.js ./raw-files ./jpeg-files 2");
  process.exit(1);
}

batchJPEGConversion();
