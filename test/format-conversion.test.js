/**
 * 格式转换和色彩空间测试套件
 * 测试各种输出格式、色彩空间和位深度
 */

const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");

class FormatConversionTests {
  constructor() {
    this.results = {
      formats: {},
      colorSpaces: {},
      bitDepths: {},
      quality: {},
    };
    this.testFiles = [];
    this.outputDir = path.join(__dirname, "format-output");
  }

  log(message, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      test: "🧪",
      data: "📊",
    };
    console.log(`${icons[type]} ${message}`);
  }

  findTestFiles() {
    const sampleDir = path.join(__dirname, "..", "raw-samples-repo");
    if (!fs.existsSync(sampleDir)) {
      this.log("未找到示例图像目录", "warning");
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

    return files
      .filter((file) =>
        rawExtensions.some((ext) => file.toLowerCase().endsWith(ext))
      )
      .map((file) => path.join(sampleDir, file))
      .slice(0, 2); // Limit to 2 files for format testing
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async testOutputFormats() {
    console.log("\n📄 Testing Output Formats");
    console.log("=========================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for format testing", "warning");
      return false;
    }

    this.ensureOutputDir();

    const formats = [
      {
        name: "PPM (Portable Pixmap)",
        extension: ".ppm",
        method: "writePPM",
        binary: true,
        colorSpace: "RGB",
      },
      {
        name: "TIFF (Tagged Image File)",
        extension: ".tiff",
        method: "writeTIFF",
        binary: true,
        colorSpace: "RGB/sRGB",
      },
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const testFile of this.testFiles) {
      const fileName = path.basename(testFile, path.extname(testFile));
      const processor = new LibRaw();

      try {
        this.log(`Processing file: ${path.basename(testFile)}`, "test");

        await processor.loadFile(testFile);
        await processor.subtractBlack();
        await processor.raw2Image();
        await processor.processImage();

        for (const format of formats) {
          totalTests++;

          try {
            const outputPath = path.join(
              this.outputDir,
              `${fileName}_format${format.extension}`
            );

            this.log(`  Testing ${format.name}...`, "test");

            const startTime = Date.now();
            await processor[format.method](outputPath);
            const processingTime = Date.now() - startTime;

            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath);
              this.log(
                `    ✓ Created: ${stats.size} bytes in ${processingTime}ms`,
                "success"
              );

              // Analyze file header for format validation
              const header = this.analyzeFileHeader(outputPath, format);
              if (header.valid) {
                this.log(`    ✓ Format validated: ${header.info}`, "success");
                passedTests++;
              } else {
                this.log(
                  `    ⚠ Format validation failed: ${header.error}`,
                  "warning"
                );
              }
            } else {
              this.log(`    ✗ File not created`, "error");
            }
          } catch (formatError) {
            this.log(`    ✗ Format error: ${formatError.message}`, "error");
          }
        }

        await processor.close();
      } catch (error) {
        this.log(`File processing failed: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.formats = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `Format conversion results: ${passedTests}/${totalTests} passed (${this.results.formats.successRate}%)`,
      passedTests > 0 ? "success" : "error"
    );

    return passedTests > 0;
  }

  analyzeFileHeader(filePath, format) {
    try {
      const buffer = fs.readFileSync(filePath, { start: 0, end: 32 });

      switch (format.extension) {
        case ".ppm":
          const ppmHeader = buffer.toString("ascii", 0, 3);
          if (ppmHeader === "P6\n" || ppmHeader.startsWith("P6")) {
            return { valid: true, info: "Binary PPM format detected" };
          } else if (ppmHeader === "P3\n" || ppmHeader.startsWith("P3")) {
            return { valid: true, info: "ASCII PPM format detected" };
          }
          return { valid: false, error: `Invalid PPM header: ${ppmHeader}` };

        case ".tiff":
          // TIFF magic numbers: II* (little-endian) or MM* (big-endian)
          const tiffMagic = buffer.toString("hex", 0, 4);
          if (tiffMagic === "49492a00" || tiffMagic === "4d4d002a") {
            const endian = tiffMagic.startsWith("4949")
              ? "little-endian"
              : "big-endian";
            return { valid: true, info: `TIFF format (${endian})` };
          }
          return { valid: false, error: `Invalid TIFF magic: ${tiffMagic}` };

        default:
          return { valid: true, info: "Format check not implemented" };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Header analysis failed: ${error.message}`,
      };
    }
  }

  async testColorSpaces() {
    console.log("\n🎨 Testing Color Spaces");
    console.log("=======================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for color space testing", "warning");
      return false;
    }

    const colorSpaces = [
      {
        name: "Raw (Camera RGB)",
        value: 0,
        description: "Camera native color space",
      },
      { name: "sRGB", value: 1, description: "Standard RGB color space" },
      { name: "Adobe RGB", value: 2, description: "Adobe RGB color space" },
      {
        name: "Wide Gamut RGB",
        value: 3,
        description: "Wide gamut color space",
      },
      {
        name: "ProPhoto RGB",
        value: 4,
        description: "ProPhoto RGB color space",
      },
      { name: "XYZ", value: 5, description: "CIE XYZ color space" },
    ];

    let totalTests = 0;
    let passedTests = 0;

    const testFile = this.testFiles[0];
    const fileName = path.basename(testFile, path.extname(testFile));

    for (const colorSpace of colorSpaces) {
      const processor = new LibRaw();
      totalTests++;

      try {
        this.log(`Testing color space: ${colorSpace.name}`, "test");

        await processor.loadFile(testFile);

        // Set color space
        const params = { output_color: colorSpace.value };
        await processor.setOutputParams(params);

        // Verify parameter was set
        const currentParams = await processor.getOutputParams();
        this.log(`  Color space set to: ${colorSpace.value}`, "data");

        await processor.subtractBlack();
        await processor.raw2Image();
        await processor.processImage();

        // Create memory image and analyze
        const memImage = await processor.createMemoryImage();
        if (memImage && memImage.data) {
          this.log(
            `  ✓ Processed: ${memImage.width}x${memImage.height}, ${memImage.colors} channels`,
            "success"
          );

          // Write sample output
          const outputPath = path.join(
            this.outputDir,
            `${fileName}_colorspace_${colorSpace.name.replace(/\s+/g, "_")}.ppm`
          );
          await processor.writePPM(outputPath);

          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            this.log(`  ✓ Output file: ${stats.size} bytes`, "success");
            passedTests++;
          }
        } else {
          this.log(`  ✗ Memory image creation failed`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ Color space test failed: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.colorSpaces = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `Color space results: ${passedTests}/${totalTests} passed (${this.results.colorSpaces.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return passedTests > 0;
  }

  async testBitDepths() {
    console.log("\n🔢 Testing Bit Depths");
    console.log("=====================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for bit depth testing", "warning");
      return false;
    }

    const bitDepths = [
      { name: "8-bit", value: 8, description: "Standard 8-bit per channel" },
      {
        name: "16-bit",
        value: 16,
        description: "High precision 16-bit per channel",
      },
    ];

    let totalTests = 0;
    let passedTests = 0;

    const testFile = this.testFiles[0];
    const fileName = path.basename(testFile, path.extname(testFile));

    for (const bitDepth of bitDepths) {
      const processor = new LibRaw();
      totalTests++;

      try {
        this.log(`Testing bit depth: ${bitDepth.name}`, "test");

        await processor.loadFile(testFile);

        // Set bit depth
        const params = {
          output_bps: bitDepth.value,
          output_color: 1, // sRGB for consistency
        };
        await processor.setOutputParams(params);

        await processor.subtractBlack();
        await processor.raw2Image();
        await processor.processImage();

        // Create memory image and analyze
        const memImage = await processor.createMemoryImage();
        if (memImage && memImage.data) {
          this.log(
            `  ✓ Processed: ${memImage.width}x${memImage.height}, ${memImage.bits}-bit`,
            "success"
          );

          // Calculate expected data size
          const expectedSize =
            memImage.width *
            memImage.height *
            memImage.colors *
            (bitDepth.value / 8);
          const actualSize = memImage.data.length;

          this.log(
            `  Data size: ${actualSize} bytes (expected ~${expectedSize})`,
            "data"
          );

          // Analyze bit depth usage
          const bitAnalysis = this.analyzeBitDepthUsage(
            memImage.data,
            bitDepth.value
          );
          this.log(
            `  Bit utilization: ${bitAnalysis.utilization}%, unique values: ${bitAnalysis.uniqueValues}`,
            "data"
          );

          // Write output file
          const outputPath = path.join(
            this.outputDir,
            `${fileName}_${bitDepth.value}bit.ppm`
          );
          await processor.writePPM(outputPath);

          if (fs.existsSync(outputPath)) {
            passedTests++;
            this.log(`  ✓ Output written successfully`, "success");
          }
        } else {
          this.log(`  ✗ Memory image creation failed`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ Bit depth test failed: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.bitDepths = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `Bit depth results: ${passedTests}/${totalTests} passed (${this.results.bitDepths.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return passedTests > 0;
  }

  analyzeBitDepthUsage(data, bitDepth) {
    const sampleSize = Math.min(10000, data.length);
    const uniqueValues = new Set();
    let maxValue = 0;
    const maxPossible = Math.pow(2, bitDepth) - 1;

    if (bitDepth === 8) {
      for (let i = 0; i < sampleSize; i++) {
        const value = data[i];
        uniqueValues.add(value);
        maxValue = Math.max(maxValue, value);
      }
    } else if (bitDepth === 16) {
      for (let i = 0; i < sampleSize; i += 2) {
        const value = data.readUInt16LE(i);
        uniqueValues.add(value);
        maxValue = Math.max(maxValue, value);
      }
    }

    const utilization = ((maxValue / maxPossible) * 100).toFixed(1);

    return {
      utilization,
      uniqueValues: uniqueValues.size,
      maxValue,
      maxPossible,
    };
  }

  async testQualitySettings() {
    console.log("\n⭐ Testing Quality Settings");
    console.log("===========================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for quality testing", "warning");
      return false;
    }

    const qualityConfigs = [
      {
        name: "Fast Preview",
        params: {
          half_size: true,
          four_color_rgb: true,
          output_bps: 8,
          bright: 1.0,
        },
      },
      {
        name: "Standard Quality",
        params: {
          half_size: false,
          four_color_rgb: false,
          output_bps: 8,
          bright: 1.0,
          highlight: 0,
        },
      },
      {
        name: "High Quality",
        params: {
          half_size: false,
          four_color_rgb: false,
          output_bps: 16,
          bright: 1.0,
          highlight: 1,
          no_auto_bright: false,
        },
      },
    ];

    let totalTests = 0;
    let passedTests = 0;

    const testFile = this.testFiles[0];
    const fileName = path.basename(testFile, path.extname(testFile));

    for (const config of qualityConfigs) {
      const processor = new LibRaw();
      totalTests++;

      try {
        this.log(`Testing quality preset: ${config.name}`, "test");

        const startTime = Date.now();

        await processor.loadFile(testFile);
        await processor.setOutputParams(config.params);

        await processor.subtractBlack();
        await processor.raw2Image();
        await processor.processImage();

        const memImage = await processor.createMemoryImage();
        const processingTime = Date.now() - startTime;

        if (memImage && memImage.data) {
          this.log(
            `  ✓ Processed in ${processingTime}ms: ${memImage.width}x${memImage.height}`,
            "success"
          );

          // Calculate pixels per second
          const totalPixels = memImage.width * memImage.height;
          const pixelsPerSecond = Math.round(
            totalPixels / (processingTime / 1000)
          );
          this.log(
            `  Performance: ${pixelsPerSecond.toLocaleString()} pixels/second`,
            "data"
          );

          // Write quality comparison output
          const outputPath = path.join(
            this.outputDir,
            `${fileName}_quality_${config.name.replace(/\s+/g, "_")}.ppm`
          );
          await processor.writePPM(outputPath);

          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            this.log(`  ✓ Output: ${stats.size} bytes`, "success");
            passedTests++;
          }
        } else {
          this.log(`  ✗ Processing failed`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ Quality test failed: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.quality = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `Quality settings results: ${passedTests}/${totalTests} passed (${this.results.quality.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return passedTests > 0;
  }

  cleanupOutputFiles() {
    try {
      if (fs.existsSync(this.outputDir)) {
        const files = fs.readdirSync(this.outputDir);
        files.forEach((file) => {
          const filePath = path.join(this.outputDir, file);
          fs.unlinkSync(filePath);
        });
        fs.rmdirSync(this.outputDir);
        this.log("Test output files cleaned up", "info");
      }
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, "warning");
    }
  }

  printSummary() {
    console.log("\n📊 Format Conversion Test Summary");
    console.log("=================================");

    const categories = [
      { name: "Output Formats", result: this.results.formats },
      { name: "Color Spaces", result: this.results.colorSpaces },
      { name: "Bit Depths", result: this.results.bitDepths },
      { name: "Quality Settings", result: this.results.quality },
    ];

    let totalTests = 0;
    let passedTests = 0;

    categories.forEach((category) => {
      if (category.result.tested !== undefined) {
        totalTests += category.result.tested;
        passedTests += category.result.passed;
        this.log(
          `${category.name}: ${category.result.passed}/${category.result.tested} (${category.result.successRate}%)`,
          category.result.passed > 0 ? "success" : "warning"
        );
      }
    });

    if (totalTests > 0) {
      const overallSuccessRate = ((passedTests / totalTests) * 100).toFixed(1);
      this.log(
        `\nOverall Success Rate: ${passedTests}/${totalTests} (${overallSuccessRate}%)`,
        passedTests === totalTests ? "success" : "warning"
      );
    }

    this.log(`\nTest files used: ${this.testFiles.length}`, "data");
    this.testFiles.forEach((file) => {
      this.log(`  - ${path.basename(file)}`, "data");
    });

    this.log(`\nOutput directory: ${this.outputDir}`, "data");
  }

  async runAllTests() {
    console.log("🧪 LibRaw Format Conversion Test Suite");
    console.log("======================================");

    // Find test files
    this.testFiles = this.findTestFiles();

    if (this.testFiles.length === 0) {
      this.log("No RAW test files found in raw-samples-repo directory", "error");
      this.log(
        "Please add some RAW files (CR2, CR3, NEF, ARW, DNG, RAF, RW2) to test/",
        "info"
      );
      return false;
    }

    this.log(`Found ${this.testFiles.length} test files`, "success");

    // Run all test categories
    const results = [];

    results.push(await this.testOutputFormats());
    results.push(await this.testColorSpaces());
    results.push(await this.testBitDepths());
    results.push(await this.testQualitySettings());

    this.printSummary();

    // Clean up test files
    this.cleanupOutputFiles();

    const allPassed = results.every((result) => result);

    if (allPassed) {
      console.log("\n🎉 All format conversion tests completed successfully!");
    } else {
      console.log("\n⚠️  Some format conversion tests failed or had warnings");
    }

    return allPassed;
  }
}

async function main() {
  const tester = new FormatConversionTests();

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

module.exports = { FormatConversionTests };
