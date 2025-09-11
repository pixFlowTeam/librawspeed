/**
 * Image Processing Test Suite
 * Tests image conversion, thumbnail extraction, and advanced processing features
 */

const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class ImageProcessingTests {
  constructor() {
    this.results = {
      conversion: {},
      thumbnail: {},
      processing: {},
      memory: {},
      output: {},
    };
    this.testFiles = [];
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

    return files
      .filter((file) =>
        rawExtensions.some((ext) => file.toLowerCase().endsWith(ext))
      )
      .map((file) => path.join(sampleDir, file))
      .slice(0, 3); // Limit to 3 files for testing
  }

  async testThumbnailExtraction() {
    console.log("\n🖼️  Testing Thumbnail Extraction");
    console.log("================================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for thumbnail extraction", "warning");
      return false;
    }

    let passedTests = 0;
    let totalTests = 0;

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();
      const fileName = path.basename(testFile);

      try {
        totalTests++;
        this.log(`Testing thumbnail extraction: ${fileName}`, "test");

        // Load file
        await processor.loadFile(testFile);
        this.log(`  File loaded successfully`, "success");

        // Check thumbnail status
        const thumbOK = await processor.thumbOK();
        this.log(`  Thumbnail status: ${thumbOK}`, "data");

        // Unpack thumbnail
        const thumbnailUnpacked = await processor.unpackThumbnail();
        this.log(
          `  Thumbnail unpacked: ${thumbnailUnpacked}`,
          thumbnailUnpacked ? "success" : "warning"
        );

        if (thumbnailUnpacked) {
          // Create memory thumbnail
          const memoryThumbnail = await processor.createMemoryThumbnail();
          if (memoryThumbnail && memoryThumbnail.data) {
            this.log(
              `  Memory thumbnail created: ${memoryThumbnail.width}x${memoryThumbnail.height}, ${memoryThumbnail.dataSize} bytes`,
              "success"
            );

            // Verify thumbnail data
            if (memoryThumbnail.data.length > 0) {
              this.log(
                `  Thumbnail data verified: ${memoryThumbnail.data.length} bytes`,
                "success"
              );

              // Test writing thumbnail to file
              const outputPath = path.join(
                __dirname,
                "output",
                `thumb_${fileName}.jpg`
              );

              // Ensure output directory exists
              const outputDir = path.dirname(outputPath);
              if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
              }

              try {
                await processor.writeThumbnail(outputPath);

                if (fs.existsSync(outputPath)) {
                  const stats = fs.statSync(outputPath);
                  this.log(
                    `  Thumbnail file written: ${outputPath} (${stats.size} bytes)`,
                    "success"
                  );

                  // Clean up test file
                  fs.unlinkSync(outputPath);
                } else {
                  this.log(`  Thumbnail file not created`, "warning");
                }
              } catch (writeError) {
                this.log(
                  `  Thumbnail write failed: ${writeError.message}`,
                  "warning"
                );
              }

              passedTests++;
            } else {
              this.log(`  Thumbnail data is empty`, "warning");
            }
          } else {
            this.log(`  Memory thumbnail creation failed`, "warning");
          }
        }

        await processor.close();
      } catch (error) {
        this.log(`  Thumbnail extraction failed: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.thumbnail = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `Thumbnail extraction results: ${passedTests}/${totalTests} passed (${this.results.thumbnail.successRate}%)`,
      passedTests === totalTests ? "success" : "warning"
    );

    return passedTests > 0;
  }

  async testImageConversion() {
    console.log("\n🔄 Testing Image Conversion");
    console.log("===========================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for image conversion", "warning");
      return false;
    }

    let passedTests = 0;
    let totalTests = 0;

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();
      const fileName = path.basename(testFile);

      try {
        totalTests++;
        this.log(`Testing image conversion: ${fileName}`, "test");

        // Load file
        await processor.loadFile(testFile);
        this.log(`  File loaded successfully`, "success");

        // Get metadata for reference
        const metadata = await processor.getMetadata();
        this.log(
          `  Image dimensions: ${metadata.width}x${metadata.height}`,
          "data"
        );

        // Test basic processing steps
        this.log(`  Testing processing pipeline...`, "info");

        // Subtract black
        const blackSubtracted = await processor.subtractBlack();
        this.log(
          `  Black subtraction: ${blackSubtracted ? "Success" : "Failed"}`,
          blackSubtracted ? "success" : "warning"
        );

        // Raw to image conversion
        const raw2ImageResult = await processor.raw2Image();
        this.log(
          `  RAW to image conversion: ${
            raw2ImageResult ? "Success" : "Failed"
          }`,
          raw2ImageResult ? "success" : "warning"
        );

        if (raw2ImageResult) {
          // Process image
          const processResult = await processor.processImage();
          this.log(
            `  Image processing: ${processResult ? "Success" : "Failed"}`,
            processResult ? "success" : "warning"
          );

          if (processResult) {
            // Create memory image
            const memoryImage = await processor.createMemoryImage();
            if (memoryImage && memoryImage.data) {
              this.log(
                `  Memory image created: ${memoryImage.width}x${memoryImage.height}, ${memoryImage.bits}-bit, ${memoryImage.dataSize} bytes`,
                "success"
              );

              // Calculate expected size
              const expectedSize =
                memoryImage.width *
                memoryImage.height *
                memoryImage.colors *
                (memoryImage.bits / 8);
              const actualSize = memoryImage.data.length;

              if (Math.abs(actualSize - expectedSize) < expectedSize * 0.1) {
                // Allow 10% variance for headers/padding
                this.log(
                  `  Image data size validated: ${actualSize} bytes (expected ~${expectedSize})`,
                  "success"
                );
              } else {
                this.log(
                  `  Image data size mismatch: ${actualSize} bytes (expected ${expectedSize})`,
                  "warning"
                );
              }

              // Test different output formats
              await this.testOutputFormats(processor, fileName);

              passedTests++;
            } else {
              this.log(`  Memory image creation failed`, "error");
            }
          }
        }

        await processor.close();
      } catch (error) {
        this.log(`  Image conversion failed: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.conversion = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `Image conversion results: ${passedTests}/${totalTests} passed (${this.results.conversion.successRate}%)`,
      passedTests === totalTests ? "success" : "warning"
    );

    return passedTests > 0;
  }

  async testOutputFormats(processor, fileName) {
    this.log(`  Testing output formats...`, "info");

    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const formats = [
      { extension: ".ppm", method: "writePPM", name: "PPM" },
      { extension: ".tiff", method: "writeTIFF", name: "TIFF" },
    ];

    for (const format of formats) {
      try {
        const outputPath = path.join(
          outputDir,
          `converted_${fileName}${format.extension}`
        );

        await processor[format.method](outputPath);

        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          this.log(
            `    ${format.name} file written: ${stats.size} bytes`,
            "success"
          );

          // Clean up test file
          fs.unlinkSync(outputPath);
        } else {
          this.log(`    ${format.name} file not created`, "warning");
        }
      } catch (error) {
        this.log(
          `    ${format.name} write failed: ${error.message}`,
          "warning"
        );
      }
    }
  }

  async testAdvancedProcessing() {
    console.log("\n⚙️ Testing Advanced Processing Features");
    console.log("======================================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for advanced processing", "warning");
      return false;
    }

    const testFile = this.testFiles[0];
    const processor = new LibRaw();

    try {
      this.log(
        `Testing advanced processing with: ${path.basename(testFile)}`,
        "test"
      );

      await processor.loadFile(testFile);
      this.log(`File loaded successfully`, "success");

      // Test unpack operation
      const unpacked = await processor.unpack();
      this.log(
        `Low-level unpack: ${unpacked ? "Success" : "Failed"}`,
        unpacked ? "success" : "warning"
      );

      // Test extended raw2image
      const raw2ImageEx = await processor.raw2ImageEx(true);
      this.log(
        `Extended RAW to image: ${raw2ImageEx ? "Success" : "Failed"}`,
        raw2ImageEx ? "success" : "warning"
      );

      // Test size adjustment
      const sizesAdjusted = await processor.adjustSizesInfoOnly();
      this.log(
        `Size adjustment: ${sizesAdjusted ? "Success" : "Failed"}`,
        sizesAdjusted ? "success" : "warning"
      );

      // Test memory format
      const memFormat = await processor.getMemImageFormat();
      if (memFormat) {
        this.log(
          `Memory format: ${memFormat.width}x${memFormat.height}, ${memFormat.colors} colors, ${memFormat.bps} bps`,
          "data"
        );
      }

      // Test color operations
      try {
        const colorAt = await processor.getColorAt(0, 0);
        this.log(`Color at (0,0): ${colorAt}`, "data");
      } catch (error) {
        this.log(`Color at position test failed: ${error.message}`, "warning");
      }

      // Test floating point conversion
      try {
        const floatConverted = await processor.convertFloatToInt();
        this.log(
          `Float to int conversion: ${floatConverted ? "Success" : "Failed"}`,
          floatConverted ? "success" : "warning"
        );
      } catch (error) {
        this.log(`Float conversion failed: ${error.message}`, "warning");
      }

      await processor.close();

      this.results.processing = { success: true };
      return true;
    } catch (error) {
      this.log(`Advanced processing failed: ${error.message}`, "error");
      await processor.close();
      this.results.processing = { success: false, error: error.message };
      return false;
    }
  }

  async testParameterConfiguration() {
    console.log("\n🛠️  Testing Parameter Configuration");
    console.log("==================================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for parameter testing", "warning");
      return false;
    }

    const testFile = this.testFiles[0];
    const processor = new LibRaw();

    try {
      await processor.loadFile(testFile);
      this.log(`File loaded for parameter testing`, "success");

      // Test different parameter configurations
      const parameterSets = [
        {
          name: "Standard sRGB 8-bit",
          params: {
            output_color: 1, // sRGB
            output_bps: 8, // 8-bit
            bright: 1.0, // Normal brightness
            gamma: [2.2, 4.5], // Standard gamma
          },
        },
        {
          name: "Adobe RGB 16-bit",
          params: {
            output_color: 2, // Adobe RGB
            output_bps: 16, // 16-bit
            bright: 1.1, // Slightly brighter
            gamma: [1.8, 4.5], // Adobe gamma
          },
        },
        {
          name: "High quality processing",
          params: {
            output_color: 1,
            output_bps: 16,
            bright: 1.0,
            highlight: 1, // Highlight recovery
            no_auto_bright: false,
          },
        },
      ];

      let successfulConfigs = 0;

      for (const config of parameterSets) {
        try {
          this.log(`  Testing configuration: ${config.name}`, "test");

          // Set parameters
          const paramsSet = await processor.setOutputParams(config.params);
          this.log(
            `    Parameters set: ${paramsSet ? "Success" : "Failed"}`,
            paramsSet ? "success" : "warning"
          );

          if (paramsSet) {
            // Get parameters to verify
            const currentParams = await processor.getOutputParams();
            this.log(`    Parameters retrieved successfully`, "success");

            // Process with these parameters
            await processor.subtractBlack();
            await processor.raw2Image();
            const processed = await processor.processImage();

            if (processed) {
              const memImage = await processor.createMemoryImage();
              if (memImage) {
                this.log(
                  `    Processed image: ${memImage.width}x${memImage.height}, ${memImage.bits}-bit`,
                  "success"
                );
                successfulConfigs++;
              }
            }
          }
        } catch (configError) {
          this.log(
            `    Configuration failed: ${configError.message}`,
            "warning"
          );
        }
      }

      await processor.close();

      this.results.output = {
        tested: parameterSets.length,
        passed: successfulConfigs,
        successRate: ((successfulConfigs / parameterSets.length) * 100).toFixed(
          1
        ),
      };

      this.log(
        `Parameter configuration results: ${successfulConfigs}/${parameterSets.length} passed (${this.results.output.successRate}%)`,
        successfulConfigs > 0 ? "success" : "warning"
      );

      return successfulConfigs > 0;
    } catch (error) {
      this.log(
        `Parameter configuration test failed: ${error.message}`,
        "error"
      );
      await processor.close();
      return false;
    }
  }

  async testMemoryOperations() {
    console.log("\n💾 Testing Memory Operations");
    console.log("============================");

    if (this.testFiles.length === 0) {
      this.log("No test files available for memory testing", "warning");
      return false;
    }

    const testFile = this.testFiles[0];
    const processor = new LibRaw();

    try {
      await processor.loadFile(testFile);
      this.log(`File loaded for memory testing`, "success");

      // Process the image
      await processor.subtractBlack();
      await processor.raw2Image();
      await processor.processImage();

      // Test memory image format
      const memFormat = await processor.getMemImageFormat();
      if (memFormat) {
        this.log(
          `Memory format: ${memFormat.width}x${memFormat.height}, ${memFormat.colors} colors, ${memFormat.bps} bps`,
          "data"
        );

        // Test memory copying
        const imageSize =
          memFormat.width *
          memFormat.height *
          memFormat.colors *
          (memFormat.bps / 8);
        const buffer = Buffer.allocUnsafe(imageSize);

        try {
          const copied = await processor.copyMemImage(
            buffer,
            memFormat.width * memFormat.colors * (memFormat.bps / 8),
            false
          );
          this.log(
            `Memory copy operation: ${copied ? "Success" : "Failed"}`,
            copied ? "success" : "warning"
          );

          if (copied) {
            // Verify buffer contains data
            let hasData = false;
            for (let i = 0; i < Math.min(1000, buffer.length); i++) {
              if (buffer[i] !== 0) {
                hasData = true;
                break;
              }
            }
            this.log(
              `Buffer contains image data: ${hasData ? "Yes" : "No"}`,
              hasData ? "success" : "warning"
            );
          }
        } catch (copyError) {
          this.log(`Memory copy failed: ${copyError.message}`, "warning");
        }
      }

      // Test image freeing
      const freed = await processor.freeImage();
      this.log(
        `Image memory freed: ${freed ? "Success" : "Failed"}`,
        freed ? "success" : "warning"
      );

      await processor.close();

      this.results.memory = { success: true };
      return true;
    } catch (error) {
      this.log(`Memory operations test failed: ${error.message}`, "error");
      await processor.close();
      this.results.memory = { success: false, error: error.message };
      return false;
    }
  }

  printSummary() {
    console.log("\n📊 Image Processing Test Summary");
    console.log("================================");

    const categories = [
      { name: "Thumbnail Extraction", result: this.results.thumbnail },
      { name: "Image Conversion", result: this.results.conversion },
      { name: "Advanced Processing", result: this.results.processing },
      { name: "Parameter Configuration", result: this.results.output },
      { name: "Memory Operations", result: this.results.memory },
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
      } else if (category.result.success !== undefined) {
        totalTests++;
        if (category.result.success) passedTests++;
        this.log(
          `${category.name}: ${category.result.success ? "Passed" : "Failed"}`,
          category.result.success ? "success" : "error"
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
  }

  async runAllTests() {
    console.log("🧪 LibRaw Image Processing Test Suite");
    console.log("=====================================");

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

    results.push(await this.testThumbnailExtraction());
    results.push(await this.testImageConversion());
    results.push(await this.testAdvancedProcessing());
    results.push(await this.testParameterConfiguration());
    results.push(await this.testMemoryOperations());

    this.printSummary();

    const allPassed = results.every((result) => result);

    if (allPassed) {
      console.log("\n🎉 All image processing tests completed successfully!");
    } else {
      console.log("\n⚠️  Some image processing tests failed or had warnings");
    }

    return allPassed;
  }
}

async function main() {
  const tester = new ImageProcessingTests();

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

module.exports = { ImageProcessingTests };
