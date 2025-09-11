/**
 * JPEG Conversion Test Suite
 * Tests RAW to JPEG conversion with various quality settings, sizes, and optimizations
 */

const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

class JPEGConversionTests {
  constructor() {
    this.results = {
      qualityTests: {},
      sizeTests: {},
      batchTests: {},
      optimizationTests: {},
      performanceTests: {},
    };
    this.testFiles = [];
    this.outputDir = path.join(__dirname, "jpeg-output");
  }

  log(message, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      test: "🧪",
      data: "📊",
      jpeg: "🖼️",
      perf: "⚡",
    };
    console.log(`${icons[type]} ${message}`);
  }

  findTestFiles() {
    const sampleDir = path.join(__dirname, "..", "raw-samples-repo");
    if (!fs.existsSync(sampleDir)) {
      this.log("Sample images directory not found", "warning");
      return [];
    }

    const files = fs.readdirSync(sampleDir, { withFileTypes: true });
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".dng",
      ".raf",
      ".rw2",
    ];

    const rawFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return rawExtensions.includes(ext);
      })
      .map((file) => path.join(sampleDir, file))
      .filter((file) => fs.existsSync(file));

    this.log(`Found ${rawFiles.length} RAW test files`, "data");
    return rawFiles.slice(0, 5); // Limit to 5 files for testing performance
  }

  async setupOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      this.log(`Created output directory: ${this.outputDir}`, "info");
    }

    // Create subdirectories for different test types
    const subdirs = ["quality", "size", "batch", "optimization", "performance"];
    subdirs.forEach((dir) => {
      const dirPath = path.join(this.outputDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  async testQualitySettings() {
    this.log("Testing JPEG quality settings...", "test");

    const qualityLevels = [60, 70, 80, 85, 90, 95];
    const processor = new LibRaw();
    const testFile = this.testFiles[0];

    if (!testFile) {
      this.log("No test files available for quality testing", "warning");
      return;
    }

    try {
      await processor.loadFile(testFile);
      const metadata = await processor.getMetadata();

      this.log(
        `Testing quality levels on ${path.basename(testFile)} (${
          metadata.width
        }x${metadata.height})`,
        "jpeg"
      );

      for (const quality of qualityLevels) {
        try {
          const outputPath = path.join(
            this.outputDir,
            "quality",
            `quality_${quality}.jpg`
          );
          const startTime = process.hrtime.bigint();

          const result = await processor.convertToJPEG(outputPath, { quality });

          const endTime = process.hrtime.bigint();
          const processingTime = Number(endTime - startTime) / 1000000;

          // Verify output file
          const stats = fs.statSync(outputPath);
          const sharpInfo = await sharp(outputPath).metadata();

          this.results.qualityTests[quality] = {
            success: true,
            fileSize: stats.size,
            processingTime: processingTime,
            compressionRatio: result.metadata.fileSize.compressionRatio,
            dimensions: sharpInfo,
            throughput: result.metadata.processing.throughputMBps,
          };

          this.log(
            `Quality ${quality}: ${(stats.size / 1024).toFixed(
              1
            )}KB, ${processingTime.toFixed(1)}ms, ${
              result.metadata.fileSize.compressionRatio
            }x compression`,
            "data"
          );
        } catch (error) {
          this.results.qualityTests[quality] = {
            success: false,
            error: error.message,
          };
          this.log(`Quality ${quality} failed: ${error.message}`, "error");
        }
      }
    } finally {
      await processor.close();
    }
  }

  async testSizeOptions() {
    this.log("Testing size/resize options...", "test");

    const sizeTests = [
      { name: "original", options: {} },
      { name: "width_1920", options: { width: 1920 } },
      { name: "height_1080", options: { height: 1080 } },
      { name: "both_1600x1200", options: { width: 1600, height: 1200 } },
      { name: "small_800x600", options: { width: 800, height: 600 } },
    ];

    const processor = new LibRaw();
    const testFile = this.testFiles[0];

    if (!testFile) {
      this.log("No test files available for size testing", "warning");
      return;
    }

    try {
      await processor.loadFile(testFile);
      const metadata = await processor.getMetadata();

      this.log(
        `Testing resize options on ${path.basename(testFile)} (${
          metadata.width
        }x${metadata.height})`,
        "jpeg"
      );

      for (const test of sizeTests) {
        try {
          const outputPath = path.join(
            this.outputDir,
            "size",
            `${test.name}.jpg`
          );
          const startTime = process.hrtime.bigint();

          const result = await processor.convertToJPEG(outputPath, {
            quality: 85,
            ...test.options,
          });

          const endTime = process.hrtime.bigint();
          const processingTime = Number(endTime - startTime) / 1000000;

          // Verify output dimensions
          const sharpInfo = await sharp(outputPath).metadata();
          const stats = fs.statSync(outputPath);

          this.results.sizeTests[test.name] = {
            success: true,
            requestedSize: test.options,
            actualSize: { width: sharpInfo.width, height: sharpInfo.height },
            fileSize: stats.size,
            processingTime: processingTime,
            compressionRatio: result.metadata.fileSize.compressionRatio,
          };

          this.log(
            `${test.name}: ${sharpInfo.width}x${sharpInfo.height}, ${(
              stats.size / 1024
            ).toFixed(1)}KB`,
            "data"
          );
        } catch (error) {
          this.results.sizeTests[test.name] = {
            success: false,
            error: error.message,
          };
          this.log(`${test.name} failed: ${error.message}`, "error");
        }
      }
    } finally {
      await processor.close();
    }
  }

  async testBatchConversion() {
    this.log("Testing batch conversion...", "test");

    if (this.testFiles.length < 2) {
      this.log("Need at least 2 test files for batch testing", "warning");
      return;
    }

    const processor = new LibRaw();
    const batchOutputDir = path.join(this.outputDir, "batch");

    try {
      const startTime = process.hrtime.bigint();

      const result = await processor.batchConvertToJPEG(
        this.testFiles,
        batchOutputDir,
        {
          quality: 80,
          width: 1920, // Resize for web
          progressive: true,
          mozjpeg: true,
        }
      );

      const endTime = process.hrtime.bigint();
      const totalTime = Number(endTime - startTime) / 1000000;

      this.results.batchTests = {
        filesProcessed: result.summary.processed,
        totalFiles: result.summary.total,
        errors: result.summary.errors,
        successRate: (
          (result.summary.processed / result.summary.total) *
          100
        ).toFixed(1),
        totalProcessingTime: totalTime,
        averageTimePerFile: result.summary.averageProcessingTimePerFile,
        averageCompressionRatio: result.summary.averageCompressionRatio,
        totalSavedSpace: (
          (result.summary.totalOriginalSize -
            result.summary.totalCompressedSize) /
          1024 /
          1024
        ).toFixed(1),
      };

      this.log(
        `Batch: ${result.summary.processed}/${
          result.summary.total
        } files, ${totalTime.toFixed(1)}ms total`,
        "data"
      );
      this.log(
        `Average: ${result.summary.averageProcessingTimePerFile}ms/file, ${result.summary.averageCompressionRatio}x compression`,
        "data"
      );
      this.log(
        `Space saved: ${this.results.batchTests.totalSavedSpace}MB`,
        "data"
      );

      // List successful conversions
      result.successful.forEach((item) => {
        const fileName = path.basename(item.input);
        const outputSize = (
          item.result.metadata.fileSize.compressed / 1024
        ).toFixed(1);
        this.log(`  ✓ ${fileName} → ${outputSize}KB`, "success");
      });

      // List failed conversions
      result.failed.forEach((item) => {
        const fileName = path.basename(item.input);
        this.log(`  ✗ ${fileName}: ${item.error}`, "error");
      });
    } catch (error) {
      this.results.batchTests = {
        success: false,
        error: error.message,
      };
      this.log(`Batch conversion failed: ${error.message}`, "error");
    }
  }

  async testOptimizationOptions() {
    this.log("Testing optimization options...", "test");

    const optimizationTests = [
      { name: "default", options: { quality: 85 } },
      { name: "mozjpeg", options: { quality: 85, mozjpeg: true } },
      { name: "progressive", options: { quality: 85, progressive: true } },
      { name: "trellis", options: { quality: 85, trellisQuantisation: true } },
      { name: "optimize_scans", options: { quality: 85, optimizeScans: true } },
      {
        name: "chroma_444",
        options: { quality: 85, chromaSubsampling: "4:4:4" },
      },
      {
        name: "chroma_422",
        options: { quality: 85, chromaSubsampling: "4:2:2" },
      },
      {
        name: "all_optimizations",
        options: {
          quality: 85,
          mozjpeg: true,
          progressive: true,
          trellisQuantisation: true,
          optimizeScans: true,
          optimizeCoding: true,
        },
      },
    ];

    const processor = new LibRaw();
    const testFile = this.testFiles[0];

    if (!testFile) {
      this.log("No test files available for optimization testing", "warning");
      return;
    }

    try {
      await processor.loadFile(testFile);

      this.log(
        `Testing optimization options on ${path.basename(testFile)}`,
        "jpeg"
      );

      for (const test of optimizationTests) {
        try {
          const outputPath = path.join(
            this.outputDir,
            "optimization",
            `${test.name}.jpg`
          );
          const startTime = process.hrtime.bigint();

          const result = await processor.convertToJPEG(
            outputPath,
            test.options
          );

          const endTime = process.hrtime.bigint();
          const processingTime = Number(endTime - startTime) / 1000000;

          const stats = fs.statSync(outputPath);

          this.results.optimizationTests[test.name] = {
            success: true,
            fileSize: stats.size,
            processingTime: processingTime,
            compressionRatio: result.metadata.fileSize.compressionRatio,
            options: test.options,
          };

          this.log(
            `${test.name}: ${(stats.size / 1024).toFixed(
              1
            )}KB, ${processingTime.toFixed(1)}ms`,
            "data"
          );
        } catch (error) {
          this.results.optimizationTests[test.name] = {
            success: false,
            error: error.message,
          };
          this.log(`${test.name} failed: ${error.message}`, "error");
        }
      }
    } finally {
      await processor.close();
    }
  }

  async testOptimalSettings() {
    this.log("Testing optimal settings analysis...", "test");

    const processor = new LibRaw();
    const testFile = this.testFiles[0];

    if (!testFile) {
      this.log(
        "No test files available for optimal settings testing",
        "warning"
      );
      return;
    }

    try {
      await processor.loadFile(testFile);

      const usageTypes = ["web", "print", "archive"];

      for (const usage of usageTypes) {
        try {
          const analysis = await processor.getOptimalJPEGSettings({ usage });

          this.log(`Optimal settings for ${usage}:`, "jpeg");
          this.log(`  Quality: ${analysis.recommended.quality}`, "data");
          this.log(
            `  Progressive: ${analysis.recommended.progressive}`,
            "data"
          );
          this.log(
            `  Chroma: ${analysis.recommended.chromaSubsampling}`,
            "data"
          );
          this.log(`  Category: ${analysis.imageAnalysis.category}`, "data");

          analysis.recommended.reasoning.forEach((reason) => {
            this.log(`  - ${reason}`, "info");
          });

          // Test the recommended settings
          const outputPath = path.join(
            this.outputDir,
            "optimization",
            `optimal_${usage}.jpg`
          );
          const result = await processor.convertToJPEG(
            outputPath,
            analysis.recommended
          );

          this.log(
            `Applied optimal ${usage} settings: ${(
              result.metadata.fileSize.compressed / 1024
            ).toFixed(1)}KB`,
            "success"
          );
        } catch (error) {
          this.log(
            `Optimal settings for ${usage} failed: ${error.message}`,
            "error"
          );
        }
      }
    } finally {
      await processor.close();
    }
  }

  async testPerformanceBenchmarks() {
    this.log("Running performance benchmarks...", "perf");

    const processor = new LibRaw();
    const testFile = this.testFiles[0];

    if (!testFile) {
      this.log("No test files available for performance testing", "warning");
      return;
    }

    try {
      await processor.loadFile(testFile);
      const metadata = await processor.getMetadata();
      const imageArea = metadata.width * metadata.height;

      // Test different quality settings for performance
      const qualityLevels = [60, 80, 95];
      const performanceResults = {};

      this.log(
        `Performance testing on ${metadata.width}x${metadata.height} image (${(
          imageArea / 1000000
        ).toFixed(1)}MP)`,
        "perf"
      );

      for (const quality of qualityLevels) {
        const times = [];
        const fileSizes = [];

        // Run 3 iterations for average
        for (let i = 0; i < 3; i++) {
          const outputPath = path.join(
            this.outputDir,
            "performance",
            `perf_q${quality}_${i}.jpg`
          );
          const startTime = process.hrtime.bigint();

          const result = await processor.convertToJPEG(outputPath, { quality });

          const endTime = process.hrtime.bigint();
          const processingTime = Number(endTime - startTime) / 1000000;

          times.push(processingTime);
          fileSizes.push(result.metadata.fileSize.compressed);

          // Clean up iteration files
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const avgSize = fileSizes.reduce((a, b) => a + b, 0) / fileSizes.length;
        const megapixelsPerSecond = imageArea / 1000000 / (avgTime / 1000);

        performanceResults[quality] = {
          averageTime: avgTime,
          averageSize: avgSize,
          megapixelsPerSecond: megapixelsPerSecond,
          timesMs: times,
        };

        this.log(
          `Quality ${quality}: ${avgTime.toFixed(
            1
          )}ms avg, ${megapixelsPerSecond.toFixed(1)} MP/s`,
          "perf"
        );
      }

      this.results.performanceTests = {
        imageInfo: {
          width: metadata.width,
          height: metadata.height,
          megapixels: (imageArea / 1000000).toFixed(1),
        },
        results: performanceResults,
      };
    } finally {
      await processor.close();
    }
  }

  generateReport() {
    this.log("Generating JPEG Conversion Test Report", "data");
    this.log("=====================================", "data");

    // Quality tests summary
    if (Object.keys(this.results.qualityTests).length > 0) {
      this.log("\n📊 Quality Settings Performance:", "data");
      Object.entries(this.results.qualityTests).forEach(([quality, result]) => {
        if (result.success) {
          this.log(
            `  Q${quality}: ${(result.fileSize / 1024).toFixed(
              1
            )}KB, ${result.processingTime.toFixed(1)}ms, ${
              result.compressionRatio
            }x`,
            "data"
          );
        }
      });
    }

    // Size tests summary
    if (Object.keys(this.results.sizeTests).length > 0) {
      this.log("\n📐 Size/Resize Options:", "data");
      Object.entries(this.results.sizeTests).forEach(([name, result]) => {
        if (result.success) {
          this.log(
            `  ${name}: ${result.actualSize.width}x${
              result.actualSize.height
            }, ${(result.fileSize / 1024).toFixed(1)}KB`,
            "data"
          );
        }
      });
    }

    // Batch processing summary
    if (this.results.batchTests && this.results.batchTests.successRate) {
      this.log("\n🔄 Batch Processing:", "data");
      this.log(
        `  Success Rate: ${this.results.batchTests.successRate}%`,
        "data"
      );
      this.log(
        `  Average Time: ${this.results.batchTests.averageTimePerFile}ms/file`,
        "data"
      );
      this.log(
        `  Space Saved: ${this.results.batchTests.totalSavedSpace}MB`,
        "data"
      );
    }

    // Performance benchmarks
    if (
      this.results.performanceTests &&
      this.results.performanceTests.results
    ) {
      this.log("\n⚡ Performance Benchmarks:", "data");
      this.log(
        `  Image: ${this.results.performanceTests.imageInfo.megapixels}MP`,
        "data"
      );
      Object.entries(this.results.performanceTests.results).forEach(
        ([quality, result]) => {
          this.log(
            `  Q${quality}: ${result.averageTime.toFixed(
              1
            )}ms (${result.megapixelsPerSecond.toFixed(1)} MP/s)`,
            "data"
          );
        }
      );
    }

    this.log("\n✅ JPEG conversion tests completed!", "success");
    this.log(`📁 Output files saved to: ${this.outputDir}`, "info");
  }

  async runAllTests() {
    try {
      this.log("Starting JPEG Conversion Test Suite", "test");
      this.log("===================================", "test");

      this.testFiles = this.findTestFiles();
      if (this.testFiles.length === 0) {
        this.log(
          "No RAW test files found. Please add RAW files to raw-samples-repo directory.",
          "error"
        );
        return;
      }

      await this.setupOutputDirectory();

      // Run all test categories
      await this.testQualitySettings();
      await this.testSizeOptions();
      await this.testBatchConversion();
      await this.testOptimizationOptions();
      await this.testOptimalSettings();
      await this.testPerformanceBenchmarks();

      this.generateReport();
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, "error");
      console.error(error);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new JPEGConversionTests();
  tester.runAllTests();
}

module.exports = JPEGConversionTests;
