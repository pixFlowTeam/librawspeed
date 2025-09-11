const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function batchJPEGConversion() {
  console.log("LibRaw Batch JPEG Conversion");
  console.log("============================\n");

  const processor = new LibRaw();

  try {
    // Get input directory and output directory from command line
    const inputDir = process.argv[2];
    const outputDir = process.argv[3] || path.join(inputDir, "jpeg-output");

    if (!inputDir || !fs.existsSync(inputDir)) {
      console.log("❌ Input directory not found or not specified");
      console.log(
        "\nUsage: node batch-jpeg-conversion.js <input-dir> [output-dir]"
      );
      console.log(
        "Example: node batch-jpeg-conversion.js C:\\photos\\raw C:\\photos\\jpeg"
      );
      return;
    }

    console.log(`📁 Input directory: ${inputDir}`);
    console.log(`📁 Output directory: ${outputDir}`);

    // Find all RAW files in input directory
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
      console.log("❌ No RAW files found in input directory");
      console.log("Supported formats:", rawExtensions.join(", "));
      return;
    }

    console.log(`🔍 Found ${rawFiles.length} RAW files to convert\n`);

    // Show conversion options menu
    console.log("📋 Conversion Presets:");
    console.log("1. Web Optimized (1920px, Q80, Progressive)");
    console.log("2. Print Quality (Original size, Q95, High chroma)");
    console.log("3. Archive (Original size, Q95, Maximum quality)");
    console.log("4. Thumbnails (800px, Q85)");
    console.log("5. Custom settings");

    // For this example, we'll use web optimized settings
    // In a real CLI tool, you'd prompt for user input
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
        presetName = "Web Optimized";
        break;
      case "2":
        conversionOptions = {
          quality: 95,
          chromaSubsampling: "4:2:2",
          trellisQuantisation: true,
          optimizeCoding: true,
          mozjpeg: true,
        };
        presetName = "Print Quality";
        break;
      case "3":
        conversionOptions = {
          quality: 98,
          chromaSubsampling: "4:4:4",
          trellisQuantisation: true,
          optimizeCoding: true,
          mozjpeg: true,
        };
        presetName = "Archive Quality";
        break;
      case "4":
        conversionOptions = {
          quality: 85,
          width: 800,
          chromaSubsampling: "4:2:2",
          mozjpeg: true,
        };
        presetName = "Thumbnails";
        break;
      default:
        // Custom settings - use defaults
        conversionOptions = { quality: 85 };
        presetName = "Custom";
    }

    console.log(`\n🎯 Using preset: ${presetName}`);
    console.log("Settings:", JSON.stringify(conversionOptions, null, 2));

    // Start batch conversion
    console.log("\n🔄 Starting batch conversion...\n");
    const startTime = process.hrtime.bigint();

    const result = await processor.batchConvertToJPEG(
      rawFiles,
      outputDir,
      conversionOptions
    );

    const endTime = process.hrtime.bigint();
    const totalTime = Number(endTime - startTime) / 1000000; // ms

    // Display results
    console.log("\n📊 Conversion Results:");
    console.log("======================");
    console.log(
      `✅ Successfully converted: ${result.summary.processed}/${result.summary.total} files`
    );
    console.log(`❌ Failed conversions: ${result.summary.errors}`);
    console.log(`🕐 Total processing time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(
      `⚡ Average time per file: ${result.summary.averageProcessingTimePerFile}ms`
    );
    console.log(
      `📉 Average compression ratio: ${result.summary.averageCompressionRatio}x`
    );
    console.log(
      `💾 Space saved: ${(
        (result.summary.totalOriginalSize -
          result.summary.totalCompressedSize) /
        1024 /
        1024
      ).toFixed(1)}MB`
    );

    if (result.successful.length > 0) {
      console.log("\n✅ Successfully converted files:");
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
          `      📊 Size: ${outputSize}KB (${compressionRatio}x compression)`
        );
        console.log(`      ⚡ Time: ${processingTime}ms`);

        if (
          item.result.metadata.outputDimensions.width !==
          item.result.metadata.originalDimensions.width
        ) {
          console.log(
            `      📐 Resized: ${item.result.metadata.originalDimensions.width}x${item.result.metadata.originalDimensions.height} → ${item.result.metadata.outputDimensions.width}x${item.result.metadata.outputDimensions.height}`
          );
        }
      });
    }

    if (result.failed.length > 0) {
      console.log("\n❌ Failed conversions:");
      result.failed.forEach((item, index) => {
        const fileName = path.basename(item.input);
        console.log(`   ${index + 1}. ${fileName}: ${item.error}`);
      });
    }

    // Performance analysis
    if (result.successful.length > 0) {
      const throughputs = result.successful.map((item) =>
        parseFloat(item.result.metadata.processing.throughputMBps)
      );
      const avgThroughput = (
        throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      ).toFixed(1);

      console.log("\n📈 Performance Analysis:");
      console.log(`   Average throughput: ${avgThroughput} MB/s`);
      console.log(
        `   Total data processed: ${(
          result.summary.totalOriginalSize /
          1024 /
          1024
        ).toFixed(1)}MB`
      );
      console.log(
        `   Total output size: ${(
          result.summary.totalCompressedSize /
          1024 /
          1024
        ).toFixed(1)}MB`
      );
    }

    // Create a summary HTML report
    const reportPath = path.join(outputDir, "conversion-report.html");
    await createHTMLReport(result, conversionOptions, presetName, reportPath);
    console.log(`\n📄 HTML report created: ${reportPath}`);

    console.log("\n🧹 Cleaning up...");
    await processor.close();

    console.log("\n🎉 Batch conversion completed!");
    console.log(`📁 Check output directory: ${outputDir}`);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nTroubleshooting:");
    console.error(
      "1. Ensure the input directory exists and contains RAW files"
    );
    console.error(
      "2. Check that you have write permissions to the output directory"
    );
    console.error("3. Verify that the LibRaw addon is built: npm run build");
    console.error("4. Make sure Sharp is installed: npm install sharp");
  }
}

async function createHTMLReport(result, options, presetName, outputPath) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LibRaw JPEG Conversion Report</title>
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
            <h1>📸 LibRaw JPEG Conversion Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p><strong>Preset:</strong> ${presetName}</p>
        </div>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${result.summary.processed}</div>
                <div class="stat-label">Files Converted</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(
                  (result.summary.processed / result.summary.total) *
                  100
                ).toFixed(1)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${
                  result.summary.averageProcessingTimePerFile
                }ms</div>
                <div class="stat-label">Avg Time/File</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${
                  result.summary.averageCompressionRatio
                }x</div>
                <div class="stat-label">Avg Compression</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${(
                  (result.summary.totalOriginalSize -
                    result.summary.totalCompressedSize) /
                  1024 /
                  1024
                ).toFixed(1)}MB</div>
                <div class="stat-label">Space Saved</div>
            </div>
        </div>
        
        <div class="section">
            <h3>⚙️ Conversion Settings</h3>
            <div class="settings">
                <pre>${JSON.stringify(options, null, 2)}</pre>
            </div>
        </div>
        
        <div class="section">
            <h3>✅ Successfully Converted Files (${
              result.successful.length
            })</h3>
            <table>
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Original Size</th>
                        <th>Output Size</th>
                        <th>Compression</th>
                        <th>Processing Time</th>
                        <th>Dimensions</th>
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
            <h3>❌ Failed Conversions (${result.failed.length})</h3>
            <table>
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>Error</th>
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
            <h3>📊 Performance Summary</h3>
            <ul>
                <li><strong>Total processing time:</strong> ${(
                  result.summary.totalProcessingTime / 1000
                ).toFixed(1)} seconds</li>
                <li><strong>Average time per file:</strong> ${
                  result.summary.averageProcessingTimePerFile
                }ms</li>
                <li><strong>Total original data:</strong> ${(
                  result.summary.totalOriginalSize /
                  1024 /
                  1024
                ).toFixed(1)}MB</li>
                <li><strong>Total compressed data:</strong> ${(
                  result.summary.totalCompressedSize /
                  1024 /
                  1024
                ).toFixed(1)}MB</li>
                <li><strong>Space savings:</strong> ${(
                  ((result.summary.totalOriginalSize -
                    result.summary.totalCompressedSize) /
                    result.summary.totalOriginalSize) *
                  100
                ).toFixed(1)}%</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
            <p>Generated by LibRaw Node.js JPEG Converter</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
}

// Usage instructions
if (process.argv.length < 3) {
  console.log("LibRaw Batch JPEG Conversion");
  console.log(
    "Usage: node batch-jpeg-conversion.js <input-dir> [output-dir] [preset]"
  );
  console.log("");
  console.log("Parameters:");
  console.log("  input-dir   Directory containing RAW files");
  console.log(
    "  output-dir  Directory for JPEG output (optional, default: input-dir/jpeg-output)"
  );
  console.log("  preset      Conversion preset (1-4, optional, default: 1)");
  console.log("");
  console.log("Presets:");
  console.log("  1 - Web Optimized (1920px, Q80, Progressive)");
  console.log("  2 - Print Quality (Original size, Q95, High chroma)");
  console.log("  3 - Archive (Original size, Q98, Maximum quality)");
  console.log("  4 - Thumbnails (800px, Q85)");
  console.log("");
  console.log("Examples:");
  console.log("  node batch-jpeg-conversion.js C:\\photos\\raw");
  console.log(
    "  node batch-jpeg-conversion.js C:\\photos\\raw C:\\photos\\web 1"
  );
  console.log("  node batch-jpeg-conversion.js ./raw-files ./jpeg-files 2");
  process.exit(1);
}

batchJPEGConversion();
