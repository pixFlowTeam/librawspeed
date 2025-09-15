/**
 * 图像处理测试套件
 * 测试图像转换、缩略图提取和高级处理功能
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
      this.log("未找到示例图像目录", "warning");
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

    const findFilesRecursively = (dir) => {
      const files = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...findFilesRecursively(fullPath));
        } else if (entry.isFile() && rawExtensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
          files.push(fullPath);
        }
      }
      
      return files;
    };

    const allFiles = findFilesRecursively(sampleDir);
    return allFiles.slice(0, 3); // 限制为 3 个文件进行测试
  }

  async testThumbnailExtraction() {
    console.log("\n🖼️  测试缩略图提取");
    console.log("================================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于缩略图提取的测试文件", "warning");
      return false;
    }

    let passedTests = 0;
    let totalTests = 0;

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();
      const fileName = path.basename(testFile);

      try {
        totalTests++;
        this.log(`测试缩略图提取: ${fileName}`, "test");

        // 加载文件
        await processor.loadFile(testFile);
        this.log(`  文件加载成功`, "success");

        // 检查缩略图状态
        const thumbOK = await processor.thumbOK();
        this.log(`  缩略图状态: ${thumbOK}`, "data");

        // 解包缩略图
        const thumbnailUnpacked = await processor.unpackThumbnail();
        this.log(
          `  缩略图已解包: ${thumbnailUnpacked}`,
          thumbnailUnpacked ? "success" : "warning"
        );

        if (thumbnailUnpacked) {
          // 创建内存缩略图
          const memoryThumbnail = await processor.createMemoryThumbnail();
          if (memoryThumbnail && memoryThumbnail.data) {
            this.log(
              `  内存缩略图已创建: ${memoryThumbnail.width}x${memoryThumbnail.height}, ${memoryThumbnail.dataSize} 字节`,
              "success"
            );

            // 验证缩略图数据
            if (memoryThumbnail.data.length > 0) {
              this.log(
                `  缩略图数据已验证: ${memoryThumbnail.data.length} 字节`,
                "success"
              );

              // 测试将缩略图写入文件
              const outputPath = path.join(
                __dirname,
                "output",
                `thumb_${fileName}.jpg`
              );

              // 确保输出目录存在
              const outputDir = path.dirname(outputPath);
              if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
              }

              try {
                await processor.writeThumbnail(outputPath);

                if (fs.existsSync(outputPath)) {
                  const stats = fs.statSync(outputPath);
                  this.log(
                    `  缩略图文件已写入: ${outputPath} (${stats.size} 字节)`,
                    "success"
                  );

                  // 清理测试文件
                  fs.unlinkSync(outputPath);
                } else {
                  this.log(`  缩略图文件未创建`, "warning");
                }
              } catch (writeError) {
                this.log(
                  `  缩略图写入失败: ${writeError.message}`,
                  "warning"
                );
              }

              passedTests++;
            } else {
              this.log(`  缩略图数据为空`, "warning");
            }
          } else {
            this.log(`  内存缩略图创建失败`, "warning");
          }
        }

        await processor.close();
      } catch (error) {
        this.log(`  缩略图提取失败: ${error.message}`, "error");
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
      `缩略图提取结果: ${passedTests}/${totalTests} 通过 (${this.results.thumbnail.successRate}%)`,
      passedTests === totalTests ? "success" : "warning"
    );

    return passedTests > 0;
  }

  async testImageConversion() {
    console.log("\n🔄 测试图像转换");
    console.log("===========================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于图像转换的测试文件", "warning");
      return false;
    }

    let passedTests = 0;
    let totalTests = 0;

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();
      const fileName = path.basename(testFile);

      try {
        totalTests++;
        this.log(`测试图像转换: ${fileName}`, "test");

        // 加载文件
        await processor.loadFile(testFile);
        this.log(`  文件加载成功`, "success");

        // 获取元数据作为参考
        const metadata = await processor.getMetadata();
        this.log(
          `  图像尺寸: ${metadata.width}x${metadata.height}`,
          "data"
        );

        // 测试基本处理步骤
        this.log(`  测试处理管道...`, "info");

        // 处理图像
        await processor.raw2Image();
        const processed = await processor.processImage();
        this.log(
          `  图像处理: ${processed ? "成功" : "失败"}`,
          processed ? "success" : "warning"
        );

        // RAW 到图像转换
        const raw2ImageResult = await processor.raw2Image();
        this.log(
          `  RAW 到图像转换: ${
            raw2ImageResult ? "成功" : "失败"
          }`,
          raw2ImageResult ? "success" : "warning"
        );

        if (raw2ImageResult) {
          // 处理图像
          const processResult = await processor.processImage();
          this.log(
            `  图像处理: ${processResult ? "成功" : "失败"}`,
            processResult ? "success" : "warning"
          );

          if (processResult) {
            // 创建内存图像
            const memoryImage = await processor.createMemoryImage();
            if (memoryImage && memoryImage.data) {
              this.log(
                `  内存图像已创建: ${memoryImage.width}x${memoryImage.height}, ${memoryImage.bits}-位, ${memoryImage.dataSize} 字节`,
                "success"
              );

              // 计算预期大小
              const expectedSize =
                memoryImage.width *
                memoryImage.height *
                memoryImage.colors *
                (memoryImage.bits / 8);
              const actualSize = memoryImage.data.length;

              if (Math.abs(actualSize - expectedSize) < expectedSize * 0.1) {
                // 允许 10% 的头部/填充变化
                this.log(
                  `  图像数据大小已验证: ${actualSize} 字节 (预期 ~${expectedSize})`,
                  "success"
                );
              } else {
                this.log(
                  `  图像数据大小不匹配: ${actualSize} 字节 (预期 ${expectedSize})`,
                  "warning"
                );
              }

              // 测试不同的输出格式
              await this.testOutputFormats(processor, fileName);

              passedTests++;
            } else {
              this.log(`  内存图像创建失败`, "error");
            }
          }
        }

        await processor.close();
      } catch (error) {
        this.log(`  图像转换失败: ${error.message}`, "error");
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
      `图像转换结果: ${passedTests}/${totalTests} 通过 (${this.results.conversion.successRate}%)`,
      passedTests === totalTests ? "success" : "warning"
    );

    return passedTests > 0;
  }

  async testOutputFormats(processor, fileName) {
    this.log(`  测试输出格式...`, "info");

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
          `    ${format.name} 文件已写入: ${stats.size} 字节`,
          "success"
        );

        // 清理测试文件
        fs.unlinkSync(outputPath);
      } else {
        this.log(`    ${format.name} 文件未创建`, "warning");
      }
    } catch (error) {
      this.log(
        `    ${format.name} 写入失败: ${error.message}`,
        "warning"
      );
    }
    }
  }

  async testAdvancedProcessing() {
    console.log("\n⚙️ 测试高级处理功能");
    console.log("======================================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于高级处理的测试文件", "warning");
      return false;
    }

    const testFile = this.testFiles[0];
    const processor = new LibRaw();

    try {
      this.log(
        `测试高级处理: ${path.basename(testFile)}`,
        "test"
      );

      await processor.loadFile(testFile);
      this.log(`文件加载成功`, "success");

      // 先进行基本的图像处理
      await processor.raw2Image();
      await processor.processImage();
      this.log(`基本图像处理完成`, "success");

      // 测试扩展 raw2image
      const raw2ImageEx = await processor.raw2ImageEx(true);
      this.log(
        `扩展 RAW 到图像: ${raw2ImageEx ? "成功" : "失败"}`,
        raw2ImageEx ? "success" : "warning"
      );

      // 测试尺寸调整
      const sizesAdjusted = await processor.adjustSizesInfoOnly();
      this.log(
        `尺寸调整: ${sizesAdjusted ? "成功" : "失败"}`,
        sizesAdjusted ? "success" : "warning"
      );

      // 测试内存格式
      const memFormat = await processor.getMemImageFormat();
      if (memFormat) {
        this.log(
          `内存格式: ${memFormat.width}x${memFormat.height}, ${memFormat.colors} 颜色, ${memFormat.bps} bps`,
          "data"
        );
      }

      // 测试颜色操作
      try {
        const colorAt = await processor.getColorAt(0, 0);
        this.log(`(0,0) 处的颜色: ${colorAt}`, "data");
      } catch (error) {
        this.log(`位置颜色测试失败: ${error.message}`, "warning");
      }

      // 测试浮点数转换
      try {
        const floatConverted = await processor.convertFloatToInt();
        this.log(
          `浮点数到整数转换: ${floatConverted ? "成功" : "失败"}`,
          floatConverted ? "success" : "warning"
        );
      } catch (error) {
        this.log(`浮点数转换失败: ${error.message}`, "warning");
      }

      await processor.close();

      this.results.processing = { success: true };
      return true;
    } catch (error) {
      this.log(`高级处理失败: ${error.message}`, "error");
      await processor.close();
      this.results.processing = { success: false, error: error.message };
      return false;
    }
  }

  async testParameterConfiguration() {
    console.log("\n🛠️  测试参数配置");
    console.log("==================================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于参数测试的测试文件", "warning");
      return false;
    }

    const testFile = this.testFiles[0];
    const processor = new LibRaw();

    try {
      await processor.loadFile(testFile);
      this.log(`文件已加载用于参数测试`, "success");

      // 测试不同的参数配置
      const parameterSets = [
        {
          name: "标准 sRGB 8位",
          params: {
            output_color: 1, // sRGB
            output_bps: 8, // 8位
            bright: 1.0, // 正常亮度
            gamma: [2.2, 4.5], // 标准 gamma
          },
        },
        {
          name: "Adobe RGB 16位",
          params: {
            output_color: 2, // Adobe RGB
            output_bps: 16, // 16位
            bright: 1.1, // 稍亮
            gamma: [1.8, 4.5], // Adobe gamma
          },
        },
        {
          name: "高质量处理",
          params: {
            output_color: 1,
            output_bps: 16,
            bright: 1.0,
            highlight: 1, // 高光恢复
            no_auto_bright: false,
          },
        },
      ];

      let successfulConfigs = 0;

      for (const config of parameterSets) {
        try {
          this.log(`  测试配置: ${config.name}`, "test");

          // 设置参数
          const paramsSet = await processor.setOutputParams(config.params);
          this.log(
            `    参数设置: ${paramsSet ? "成功" : "失败"}`,
            paramsSet ? "success" : "warning"
          );

          if (paramsSet) {
            // 获取参数进行验证
            const currentParams = await processor.getOutputParams();
            this.log(`    参数获取成功`, "success");

            // 使用这些参数进行处理
            await processor.raw2Image();
            const processed = await processor.processImage();

            if (processed) {
              const memImage = await processor.createMemoryImage();
              if (memImage) {
                this.log(
                  `    处理后的图像: ${memImage.width}x${memImage.height}, ${memImage.bits}-位`,
                  "success"
                );
                successfulConfigs++;
              }
            }
          }
        } catch (configError) {
          this.log(
            `    配置失败: ${configError.message}`,
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
        `参数配置结果: ${successfulConfigs}/${parameterSets.length} 通过 (${this.results.output.successRate}%)`,
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
      await processor.raw2Image();
      await processor.processImage();

      // Test memory image format
      const memFormat = await processor.getMemImageFormat();
      if (memFormat) {
        this.log(
          `内存格式: ${memFormat.width}x${memFormat.height}, ${memFormat.colors} 颜色, ${memFormat.bps} bps`,
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
    console.log("\n📊 图像处理测试汇总");
    console.log("================================");

    const categories = [
      { name: "缩略图提取", result: this.results.thumbnail },
      { name: "图像转换", result: this.results.conversion },
      { name: "高级处理", result: this.results.processing },
      { name: "参数配置", result: this.results.output },
      { name: "内存操作", result: this.results.memory },
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
          `${category.name}: ${category.result.success ? "通过" : "失败"}`,
          category.result.success ? "success" : "error"
        );
      }
    });

    if (totalTests > 0) {
      const overallSuccessRate = ((passedTests / totalTests) * 100).toFixed(1);
      this.log(
        `\n总体成功率: ${passedTests}/${totalTests} (${overallSuccessRate}%)`,
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
      this.log("在 raw-samples-repo 目录中未找到 RAW 测试文件", "error");
      this.log(
        "请添加一些 RAW 文件 (CR2, CR3, NEF, ARW, DNG, RAF, RW2) 到 test/ 目录",
        "info"
      );
      return false;
    }

    this.log(`找到 ${this.testFiles.length} 个测试文件`, "success");

    // 运行所有测试类别
    const results = [];

    results.push(await this.testThumbnailExtraction());
    results.push(await this.testImageConversion());
    results.push(await this.testAdvancedProcessing());
    results.push(await this.testParameterConfiguration());
    results.push(await this.testMemoryOperations());

    this.printSummary();

    const allPassed = results.every((result) => result);

    if (allPassed) {
      console.log("\n🎉 所有图像处理测试成功完成！");
    } else {
      console.log("\n⚠️  一些图像处理测试失败或有警告");
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
    console.error("❌ 测试套件失败:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ImageProcessingTests };
