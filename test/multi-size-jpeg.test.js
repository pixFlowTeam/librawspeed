const fs = require("fs");
const path = require("path");
const LibRaw = require("../lib/index");

/**
 * Multi-Size JPEG Generation Test Suite
 * Tests the capability to generate multiple JPEG files of different sizes from a single RAW file
 */
class MultiSizeJPEGTests {
  constructor() {
    this.testFiles = [];
    this.outputDir = path.join(__dirname, "output", "multi-size-jpeg");
    this.results = {
      generation: {
        tested: 0,
        passed: 0,
        successRate: 0,
        generationResults: [],
      },
      performance: { averageTime: 0, totalFiles: 0, sizeGenerationTimes: [] },
      quality: { compressionAnalysis: [], sizeRangeAnalysis: [] },
    };

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  log(message, type = "info") {
    const symbols = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
      test: "🧪",
      data: "📊",
    };

    console.log(`${symbols[type] || symbols.info} ${message}`);
  }

  findTestFiles() {
    const sampleDir = path.join(__dirname, "..", "raw-samples-repo");
    if (!fs.existsSync(sampleDir)) {
      return [];
    }

    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".dng",
      ".raf",
      ".rw2",
    ];
    const files = fs
      .readdirSync(sampleDir, { withFileTypes: true })
      .filter((file) =>
        rawExtensions.includes(path.extname(file).toLowerCase())
      )
      .map((file) => path.join(sampleDir, file));

    return files;
  }

  async testMultiSizeJPEGGeneration() {
    console.log("\n📐 Multi-Size JPEG Generation from RAW Files");
    console.log("============================================");

    this.testFiles = this.findTestFiles();

    if (this.testFiles.length === 0) {
      this.log("No RAW test files found in raw-samples-repo directory", "error");
      return false;
    }

    this.log(`Found ${this.testFiles.length} RAW test files`, "success");

    // Define comprehensive size configurations
    const sizeConfigs = [
      // Thumbnail sizes
      {
        name: "thumbnail_small",
        width: 150,
        height: 100,
        quality: 85,
        category: "thumbnail",
        description: "Tiny thumbnail for lists",
      },
      {
        name: "thumbnail_medium",
        width: 300,
        height: 200,
        quality: 85,
        category: "thumbnail",
        description: "Standard thumbnail",
      },

      // Web preview sizes
      {
        name: "web_small",
        width: 480,
        height: 320,
        quality: 80,
        category: "web",
        description: "Mobile web preview",
      },
      {
        name: "web_medium",
        width: 800,
        height: 600,
        quality: 85,
        category: "web",
        description: "Tablet web preview",
      },
      {
        name: "web_large",
        width: 1200,
        height: 800,
        quality: 85,
        category: "web",
        description: "Desktop web preview",
      },

      // High-definition sizes
      {
        name: "hd_720p",
        width: 1280,
        height: 720,
        quality: 85,
        category: "hd",
        description: "HD 720p format",
      },
      {
        name: "hd_1080p",
        width: 1920,
        height: 1080,
        quality: 85,
        category: "hd",
        description: "Full HD 1080p",
      },
      {
        name: "hd_1440p",
        width: 2560,
        height: 1440,
        quality: 85,
        category: "hd",
        description: "QHD 1440p",
      },

      // Ultra-high definition
      {
        name: "uhd_4k",
        width: 3840,
        height: 2160,
        quality: 80,
        category: "uhd",
        description: "4K UHD format",
      },

      // Quality variants (full size)
      {
        name: "full_standard",
        quality: 85,
        category: "full",
        description: "Full size, standard quality",
      },
      {
        name: "full_high",
        quality: 95,
        category: "full",
        description: "Full size, high quality",
      },
      {
        name: "full_maximum",
        quality: 100,
        category: "full",
        description: "Full size, maximum quality",
      },
    ];

    let totalTests = 0;
    let passedTests = 0;
    const generationResults = [];

    // Test with first 3 files for comprehensive analysis
    for (const testFile of this.testFiles.slice(0, 3)) {
      const processor = new LibRaw();

      try {
        totalTests++;
        const fileName = path.basename(testFile, path.extname(testFile));
        this.log(`\nProcessing: ${fileName}`, "test");

        const overallStartTime = Date.now();
        await processor.loadFile(testFile);

        // Get original image metadata
        const metadata = await processor.getMetadata();
        const megapixels = (
          (metadata.width * metadata.height) /
          1000000
        ).toFixed(1);
        this.log(
          `  Original: ${metadata.width}x${metadata.height} (${megapixels}MP)`,
          "data"
        );

        const sizeResults = [];
        let successfulSizes = 0;
        const categoryTimes = {};

        // Create subdirectory for this file
        const fileOutputDir = path.join(this.outputDir, fileName);
        if (!fs.existsSync(fileOutputDir)) {
          fs.mkdirSync(fileOutputDir, { recursive: true });
        }

        for (const config of sizeConfigs) {
          try {
            const outputPath = path.join(
              fileOutputDir,
              `${fileName}_${config.name}.jpg`
            );
            const sizeStartTime = Date.now();

            // Prepare conversion options
            const conversionOptions = {
              quality: config.quality,
              fastMode: true,
              effort: 3,
            };

            // Add size constraints if specified
            if (config.width && config.height) {
              conversionOptions.width = config.width;
              conversionOptions.height = config.height;
            }

            const result = await processor.convertToJPEG(
              outputPath,
              conversionOptions
            );
            const sizeTime = Date.now() - sizeStartTime;

            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath);
              const outputDimensions = result.metadata.outputDimensions;

              // Calculate efficiency metrics
              const originalPixels = metadata.width * metadata.height;
              const outputPixels =
                outputDimensions.width * outputDimensions.height;
              const pixelReduction = (
                ((originalPixels - outputPixels) / originalPixels) *
                100
              ).toFixed(1);

              sizeResults.push({
                name: config.name,
                category: config.category,
                description: config.description,
                targetSize:
                  config.width && config.height
                    ? `${config.width}x${config.height}`
                    : "Original",
                actualSize: `${outputDimensions.width}x${outputDimensions.height}`,
                fileSize: stats.size,
                fileSizeKB: (stats.size / 1024).toFixed(1),
                fileSizeMB: (stats.size / 1024 / 1024).toFixed(2),
                quality: config.quality,
                processingTime: sizeTime,
                compressionRatio: result.metadata.fileSize.compressionRatio,
                pixelReduction: config.width ? pixelReduction : 0,
                aspectRatio: (
                  outputDimensions.width / outputDimensions.height
                ).toFixed(2),
                success: true,
              });

              // Track category timing
              if (!categoryTimes[config.category])
                categoryTimes[config.category] = [];
              categoryTimes[config.category].push(sizeTime);

              this.log(
                `    ✓ ${config.name}: ${outputDimensions.width}x${
                  outputDimensions.height
                }, ${(stats.size / 1024).toFixed(1)}KB (${sizeTime}ms)`,
                "success"
              );
              successfulSizes++;
            } else {
              sizeResults.push({
                name: config.name,
                category: config.category,
                success: false,
                error: "File not created",
              });
              this.log(`    ✗ ${config.name}: File not created`, "error");
            }
          } catch (sizeError) {
            sizeResults.push({
              name: config.name,
              category: config.category,
              success: false,
              error: sizeError.message,
            });
            this.log(`    ✗ ${config.name}: ${sizeError.message}`, "error");
          }
        }

        const totalTime = Date.now() - overallStartTime;

        generationResults.push({
          file: fileName,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          originalMegapixels: megapixels,
          totalProcessingTime: totalTime,
          successfulSizes: successfulSizes,
          totalSizes: sizeConfigs.length,
          categoryTimes: categoryTimes,
          sizeResults: sizeResults,
        });

        if (successfulSizes > 0) {
          passedTests++;
          this.log(
            `  ✓ Generated ${successfulSizes}/${sizeConfigs.length} sizes in ${totalTime}ms`,
            "success"
          );

          // Generate comprehensive analysis report
          await this.generateComprehensiveReport(
            fileName,
            sizeResults,
            fileOutputDir,
            metadata
          );
        } else {
          this.log(`  ✗ Failed to generate any sizes`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ Multi-size generation failed: ${error.message}`, "error");
        try {
          await processor.close();
        } catch (e) {}
      }
    }

    // Store results
    this.results.generation = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
      generationResults: generationResults,
    };

    // Analyze results
    this.analyzePerformance(generationResults);
    this.analyzeQualityAndCompression(generationResults);

    // Print comprehensive results
    this.printDetailedResults(generationResults);

    this.log(
      `\nMulti-size JPEG generation completed: ${passedTests}/${totalTests} files processed successfully (${this.results.generation.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return passedTests > 0;
  }

  analyzePerformance(generationResults) {
    const allTimes = [];
    const categoryPerformance = {};

    generationResults.forEach((result) => {
      allTimes.push(result.totalProcessingTime);

      Object.entries(result.categoryTimes).forEach(([category, times]) => {
        if (!categoryPerformance[category]) categoryPerformance[category] = [];
        categoryPerformance[category].push(...times);
      });
    });

    this.results.performance = {
      averageTime:
        allTimes.length > 0
          ? (allTimes.reduce((a, b) => a + b, 0) / allTimes.length).toFixed(0)
          : 0,
      totalFiles: generationResults.length,
      categoryPerformance: Object.fromEntries(
        Object.entries(categoryPerformance).map(([category, times]) => [
          category,
          {
            average: (times.reduce((a, b) => a + b, 0) / times.length).toFixed(
              0
            ),
            min: Math.min(...times),
            max: Math.max(...times),
            count: times.length,
          },
        ])
      ),
    };
  }

  analyzeQualityAndCompression(generationResults) {
    const compressionAnalysis = [];
    const sizeRangeAnalysis = [];

    generationResults.forEach((result) => {
      const successful = result.sizeResults.filter((r) => r.success);

      if (successful.length >= 2) {
        const sizes = successful.sort((a, b) => a.fileSize - b.fileSize);
        const smallest = sizes[0];
        const largest = sizes[sizes.length - 1];

        compressionAnalysis.push({
          file: result.file,
          smallestSize: smallest.fileSizeKB,
          largestSize: largest.fileSizeKB,
          compressionRange: (largest.fileSize / smallest.fileSize).toFixed(1),
          sizeCount: successful.length,
        });

        // Analyze by category
        const categoryStats = {};
        successful.forEach((size) => {
          if (!categoryStats[size.category]) categoryStats[size.category] = [];
          categoryStats[size.category].push(parseFloat(size.fileSizeKB));
        });

        sizeRangeAnalysis.push({
          file: result.file,
          categoryStats: Object.fromEntries(
            Object.entries(categoryStats).map(([category, sizes]) => [
              category,
              {
                average: (
                  sizes.reduce((a, b) => a + b, 0) / sizes.length
                ).toFixed(1),
                min: Math.min(...sizes).toFixed(1),
                max: Math.max(...sizes).toFixed(1),
                count: sizes.length,
              },
            ])
          ),
        });
      }
    });

    this.results.quality = { compressionAnalysis, sizeRangeAnalysis };
  }

  async generateComprehensiveReport(
    fileName,
    sizeResults,
    outputDir,
    metadata
  ) {
    try {
      const reportPath = path.join(outputDir, `${fileName}_analysis.html`);

      const successful = sizeResults.filter((r) => r.success);
      const failed = sizeResults.filter((r) => !r.success);

      // Group by category
      const categories = {};
      successful.forEach((result) => {
        if (!categories[result.category]) categories[result.category] = [];
        categories[result.category].push(result);
      });

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Multi-Size JPEG Analysis - ${fileName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center; }
        .section { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        h1 { color: #2c3e50; margin: 0 0 10px 0; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h3 { color: #7f8c8d; margin-top: 25px; }
        .meta { color: #7f8c8d; font-size: 14px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .stat-card h4 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
        .stat-card .value { font-size: 24px; font-weight: bold; margin: 5px 0; }
        .stat-card .unit { font-size: 12px; opacity: 0.8; }
        .category-section { margin: 20px 0; }
        .category-title { background: #ecf0f1; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .size-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .size-item { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fafafa; }
        .size-item h5 { margin: 0 0 10px 0; color: #2c3e50; }
        .size-item .details { font-size: 12px; color: #7f8c8d; }
        .size-item .metrics { margin-top: 10px; }
        .metric { display: inline-block; background: #e8f4f8; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .success { color: #27ae60; }
        .error { color: #e74c3c; }
        .performance-chart { height: 200px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; display: flex; align-items: center; justify-content: center; color: #7f8c8d; }
        .footer { text-align: center; color: #7f8c8d; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Multi-Size JPEG Generation Analysis</h1>
            <p class="meta">Source: ${fileName} | Original: ${metadata.width}x${
        metadata.height
      } (${((metadata.width * metadata.height) / 1000000).toFixed(1)}MP)</p>
            <p class="meta">Generated: ${successful.length} sizes | Failed: ${
        failed.length
      } | Total Processing: ${sizeResults.reduce(
        (sum, r) => sum + (r.processingTime || 0),
        0
      )}ms</p>
        </div>

        <div class="section">
            <h2>📊 Overview Statistics</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Generated Sizes</h4>
                    <div class="value">${successful.length}</div>
                    <div class="unit">of ${sizeResults.length} total</div>
                </div>
                <div class="stat-card">
                    <h4>Size Range</h4>
                    <div class="value">${Math.min(
                      ...successful.map((s) => parseFloat(s.fileSizeKB))
                    ).toFixed(0)}-${Math.max(
        ...successful.map((s) => parseFloat(s.fileSizeKB))
      ).toFixed(0)}</div>
                    <div class="unit">KB range</div>
                </div>
                <div class="stat-card">
                    <h4>Avg Processing</h4>
                    <div class="value">${(
                      successful.reduce((sum, s) => sum + s.processingTime, 0) /
                      successful.length
                    ).toFixed(0)}</div>
                    <div class="unit">ms per size</div>
                </div>
                <div class="stat-card">
                    <h4>Compression Range</h4>
                    <div class="value">${(
                      Math.max(...successful.map((s) => s.fileSize)) /
                      Math.min(...successful.map((s) => s.fileSize))
                    ).toFixed(1)}x</div>
                    <div class="unit">difference</div>
                </div>
            </div>
        </div>

        ${Object.entries(categories)
          .map(
            ([category, sizes]) => `
        <div class="section">
            <h2>📐 ${
              category.charAt(0).toUpperCase() + category.slice(1)
            } Category</h2>
            <div class="category-title">
                <strong>${sizes.length} sizes generated</strong> | 
                Avg: ${(
                  sizes.reduce((sum, s) => sum + parseFloat(s.fileSizeKB), 0) /
                  sizes.length
                ).toFixed(1)}KB |
                Range: ${Math.min(
                  ...sizes.map((s) => parseFloat(s.fileSizeKB))
                ).toFixed(1)}-${Math.max(
              ...sizes.map((s) => parseFloat(s.fileSizeKB))
            ).toFixed(1)}KB
            </div>
            <div class="size-grid">
                ${sizes
                  .map(
                    (size) => `
                <div class="size-item">
                    <h5>${size.name}</h5>
                    <div class="details">${size.description}</div>
                    <div class="metrics">
                        <span class="metric">📏 ${size.actualSize}</span>
                        <span class="metric">💾 ${size.fileSizeKB}KB</span>
                        <span class="metric">⚡ ${size.processingTime}ms</span>
                        <span class="metric">🎯 Q${size.quality}%</span>
                        ${
                          size.pixelReduction > 0
                            ? `<span class="metric">📉 -${size.pixelReduction}% pixels</span>`
                            : ""
                        }
                    </div>
                </div>
                `
                  )
                  .join("")}
            </div>
        </div>
        `
          )
          .join("")}

        <div class="section">
            <h2>📋 Detailed Results Table</h2>
            <table>
                <thead>
                    <tr>
                        <th>Size Name</th>
                        <th>Category</th>
                        <th>Target</th>
                        <th>Actual</th>
                        <th>File Size</th>
                        <th>Quality</th>
                        <th>Processing</th>
                        <th>Compression</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${sizeResults
                      .map(
                        (result) => `
                    <tr>
                        <td><strong>${result.name || "N/A"}</strong></td>
                        <td>${result.category || "N/A"}</td>
                        <td>${result.targetSize || "N/A"}</td>
                        <td>${result.actualSize || "N/A"}</td>
                        <td><strong>${
                          result.fileSizeKB || "N/A"
                        }KB</strong></td>
                        <td>${result.quality || "N/A"}%</td>
                        <td>${result.processingTime || "N/A"}ms</td>
                        <td>${result.compressionRatio || "N/A"}</td>
                        <td class="${result.success ? "success" : "error"}">
                            ${
                              result.success
                                ? "✓ Success"
                                : "✗ " + (result.error || "Failed")
                            }
                        </td>
                    </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>

        <div class="footer">
            Generated on ${new Date().toLocaleString()} by LibRaw Multi-Size JPEG Test Suite
        </div>
    </div>
</body>
</html>`;

      fs.writeFileSync(reportPath, htmlContent);
      this.log(`    📋 Comprehensive analysis report: ${reportPath}`, "data");
    } catch (error) {
      this.log(`    ⚠️ Failed to generate report: ${error.message}`, "warning");
    }
  }

  printDetailedResults(generationResults) {
    console.log("\n📊 Multi-Size JPEG Generation Analysis");
    console.log("======================================");

    for (const result of generationResults) {
      this.log(`\n📁 File: ${result.file}`, "data");
      this.log(
        `   Original: ${result.originalDimensions} (${result.originalMegapixels}MP)`,
        "data"
      );
      this.log(`   Total time: ${result.totalProcessingTime}ms`, "data");
      this.log(
        `   Success rate: ${result.successfulSizes}/${result.totalSizes} (${(
          (result.successfulSizes / result.totalSizes) *
          100
        ).toFixed(1)}%)`,
        "data"
      );

      // Category performance breakdown
      if (Object.keys(result.categoryTimes).length > 0) {
        this.log(`   📈 Category Performance:`, "data");
        Object.entries(result.categoryTimes).forEach(([category, times]) => {
          const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(
            0
          );
          const min = Math.min(...times);
          const max = Math.max(...times);
          this.log(
            `     ${category}: ${times.length} sizes, ${avg}ms avg (${min}-${max}ms range)`,
            "data"
          );
        });
      }

      // Size efficiency analysis
      const successful = result.sizeResults.filter((r) => r.success);
      if (successful.length >= 2) {
        const sizes = successful.sort((a, b) => a.fileSize - b.fileSize);
        const smallest = sizes[0];
        const largest = sizes[sizes.length - 1];
        const compressionRange = (largest.fileSize / smallest.fileSize).toFixed(
          1
        );

        this.log(
          `   💾 Size Range: ${smallest.fileSizeKB}KB (${smallest.name}) → ${largest.fileSizeKB}KB (${largest.name})`,
          "data"
        );
        this.log(
          `   📊 Compression Range: ${compressionRange}x difference`,
          "data"
        );
      }

      // Failed generations
      const failed = result.sizeResults.filter((r) => !r.success);
      if (failed.length > 0) {
        this.log(`   ❌ Failed Generations:`, "error");
        failed.forEach((size) => {
          this.log(`     ${size.name}: ${size.error}`, "error");
        });
      }
    }

    // Overall performance summary
    if (this.results.performance.categoryPerformance) {
      this.log(`\n⚡ Performance Summary by Category:`, "data");
      Object.entries(this.results.performance.categoryPerformance).forEach(
        ([category, stats]) => {
          this.log(
            `  ${category}: ${stats.average}ms avg, ${stats.min}-${stats.max}ms range (${stats.count} sizes)`,
            "data"
          );
        }
      );
    }

    // Compression analysis summary
    if (this.results.quality.compressionAnalysis.length > 0) {
      this.log(`\n🗜️ Compression Analysis:`, "data");
      this.results.quality.compressionAnalysis.forEach((analysis) => {
        this.log(
          `  ${analysis.file}: ${analysis.compressionRange}x range (${analysis.smallestSize}KB-${analysis.largestSize}KB)`,
          "data"
        );
      });
    }
  }

  cleanupOutputFiles() {
    try {
      if (fs.existsSync(this.outputDir)) {
        const removeDir = (dirPath) => {
          const files = fs.readdirSync(dirPath);
          files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              removeDir(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          });
          fs.rmdirSync(dirPath);
        };

        removeDir(this.outputDir);
        this.log("Multi-size test output files cleaned up", "info");
      }
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, "warning");
    }
  }

  async runAllTests() {
    console.log("🧪 LibRaw Multi-Size JPEG Generation Test Suite");
    console.log("================================================");

    try {
      const success = await this.testMultiSizeJPEGGeneration();

      if (success) {
        console.log(
          "\n🎉 Multi-size JPEG generation tests completed successfully!"
        );
        console.log(`📊 Test Results:`);
        console.log(
          `   Files processed: ${this.results.generation.passed}/${this.results.generation.tested}`
        );
        console.log(`   Success rate: ${this.results.generation.successRate}%`);
        console.log(
          `   Average processing time: ${this.results.performance.averageTime}ms per file`
        );
      } else {
        console.log(
          "\n⚠️  Multi-size JPEG generation tests failed or had issues"
        );
      }

      // Clean up
      this.cleanupOutputFiles();

      return success;
    } catch (error) {
      console.error("❌ Test suite failed:", error.message);
      return false;
    }
  }
}

async function main() {
  const tester = new MultiSizeJPEGTests();

  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MultiSizeJPEGTests;
