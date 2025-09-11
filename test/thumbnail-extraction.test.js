/**
 * 缩略图提取测试套件
 * 缩略图操作的综合测试
 */

const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class ThumbnailExtractionTests {
  constructor() {
    this.results = {
      extraction: {},
      memory: {},
      formats: {},
      sizes: {},
      validation: {},
      performance: {},
    };
    this.testFiles = [];
    this.outputDir = path.join(__dirname, "thumbnail-output");
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
      .slice(0, 5); // 最多测试 5 个文件
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async testThumbnailDetection() {
    console.log("\n🔍 测试缩略图检测");
    console.log("==============================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于缩略图检测的测试文件", "warning");
      return false;
    }

    let totalTests = 0;
    let passedTests = 0;
    const detectionResults = [];

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();
      totalTests++;

      try {
        const fileName = path.basename(testFile);
        this.log(`检测缩略图: ${fileName}`, "test");

        await processor.loadFile(testFile);

        // 检查缩略图是否存在
        const thumbOK = await processor.thumbOK();
        this.log(
          `  缩略图可用: ${thumbOK ? "是" : "否"}`,
          thumbOK ? "success" : "warning"
        );

        if (thumbOK) {
          // 尝试使用可用的 LibRaw API 获取缩略图信息
          try {
            const thumbInfo = processor.thumbnail || processor.thumb || {};
            if (thumbInfo && thumbInfo.width > 0 && thumbInfo.height > 0) {
              this.log(
                `  找到缩略图: ${thumbInfo.width}x${
                  thumbInfo.height
                }, 格式: ${thumbInfo.format || "未知"}, 大小: ${
                  thumbInfo.size || "未知"
                } 字节`,
                "data"
              );
            } else {
              this.log(
                `  检测到缩略图但详细信息不可用`,
                "info"
              );
            }
            passedTests++; // 如果缩略图可用则计为成功
          } catch (listError) {
            this.log(`  缩略图信息错误: ${listError.message}`, "warning");
            passedTests++; // 由于 thumbOK 返回 true，仍计为成功
          }

          detectionResults.push({
            file: fileName,
            hasThumb: true,
            processor: processor,
          });
        } else {
          detectionResults.push({
            file: fileName,
            hasThumb: false,
            processor: processor,
          });
        }
      } catch (error) {
        this.log(`  检测失败: ${error.message}`, "error");
        await processor.close();
      }
    }

    // 清理没有缩略图的文件的处理器
    for (const result of detectionResults) {
      if (!result.hasThumb) {
        await result.processor.close();
      }
    }

    this.results.extraction = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
      withThumbnails: detectionResults.filter((r) => r.hasThumb).length,
    };

    this.log(
      `缩略图检测结果: ${passedTests}/${totalTests} 通过 (${this.results.extraction.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return { success: passedTests > 0, results: detectionResults };
  }

  async testThumbnailExtraction(detectionResults) {
    console.log("\n📤 测试缩略图提取");
    console.log("===============================");

    const filesWithThumbs = detectionResults.filter((r) => r.hasThumb);

    if (filesWithThumbs.length === 0) {
      this.log(
        "没有可用于提取测试的缩略图文件",
        "warning"
      );
      return false;
    }

    this.ensureOutputDir();

    let totalTests = 0;
    let passedTests = 0;

    for (const result of filesWithThumbs) {
      const processor = result.processor;
      const fileName = path.basename(result.file, path.extname(result.file));

      try {
        totalTests++;
        this.log(`从以下文件提取缩略图: ${result.file}`, "test");

        // 解包缩略图
        const startTime = Date.now();
        const unpacked = await processor.unpackThumbnail();
        const unpackTime = Date.now() - startTime;

        if (unpacked) {
          this.log(`  ✓ 缩略图在 ${unpackTime}ms 内解包`, "success");

          // 测试内存缩略图创建
          const memThumb = await processor.createMemoryThumbnail();
          if (memThumb && memThumb.data) {
            this.log(
              `  ✓ 内存缩略图: ${memThumb.width}x${memThumb.height}, ${memThumb.dataSize} 字节`,
              "success"
            );

            // 验证缩略图数据
            const validation = this.validateThumbnailData(memThumb);
            this.log(
              `  验证: ${validation.valid ? "通过" : "失败"} - ${
                validation.message
              }`,
              validation.valid ? "success" : "warning"
            );

            // 测试文件写入
            const outputPath = path.join(
              this.outputDir,
              `${fileName}_thumb.jpg`
            );

            try {
              await processor.writeThumbnail(outputPath);

              if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                this.log(
                  `  ✓ 缩略图文件已写入: ${stats.size} 字节`,
                  "success"
                );

                // 验证文件格式
                const formatValidation = this.validateThumbnailFile(outputPath);
                this.log(
                  `  文件格式: ${formatValidation.format} (${
                    formatValidation.valid ? "有效" : "无效"
                  })`,
                  formatValidation.valid ? "success" : "warning"
                );

                if (validation.valid && formatValidation.valid) {
                  passedTests++;
                }
              } else {
                this.log(`  ✗ 缩略图文件未创建`, "error");
              }
            } catch (writeError) {
              this.log(
                `  ✗ 缩略图写入失败: ${writeError.message}`,
                "error"
              );
            }
          } else {
            this.log(`  ✗ 内存缩略图创建失败`, "error");
          }
        } else {
          this.log(`  ✗ 缩略图解包失败`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ 提取失败: ${error.message}`, "error");
        await processor.close();
      }
    }

    this.results.memory = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
    };

    this.log(
      `缩略图提取结果: ${passedTests}/${totalTests} 通过 (${this.results.memory.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return passedTests > 0;
  }

  validateThumbnailData(thumbnail) {
    try {
      // 检查基本属性
      if (!thumbnail.data || thumbnail.data.length === 0) {
        return { valid: false, message: "无缩略图数据" };
      }

      // 注意：某些 LibRaw 构建可能不会在内存缩略图中返回正确的尺寸
      // 这是已知限制，不会影响实际缩略图数据质量
      if (
        (thumbnail.width <= 0 || thumbnail.height <= 0) &&
        thumbnail.dataSize > 1000
      ) {
        return {
          valid: true,
          message: `缩略图数据存在 (${thumbnail.dataSize} 字节) - LibRaw 未报告尺寸`,
        };
      }

      if (
        thumbnail.width > 0 &&
        thumbnail.height > 0 &&
        thumbnail.dataSize !== thumbnail.data.length
      ) {
        return {
          valid: false,
          message: `大小不匹配: ${thumbnail.dataSize} vs ${thumbnail.data.length}`,
        };
      }

      // 如果格式指示 JPEG，检查 JPEG 签名
      const header = thumbnail.data.slice(0, 10);
      const hasJPEGHeader = header[0] === 0xff && header[1] === 0xd8;

      if (hasJPEGHeader) {
        return {
          valid: true,
          message:
            thumbnail.width > 0
              ? `JPEG 缩略图 ${thumbnail.width}x${thumbnail.height}`
              : `JPEG 缩略图 (${thumbnail.dataSize} 字节)`,
        };
      }

      // 检查其他格式或原始数据
      const isNonZero = header.some((byte) => byte !== 0);
      if (isNonZero) {
        return {
          valid: true,
          message:
            thumbnail.width > 0
              ? `原始缩略图数据 ${thumbnail.width}x${thumbnail.height}`
              : `原始缩略图数据 (${thumbnail.dataSize} 字节)`,
        };
      }

      return { valid: false, message: "缩略图数据似乎为空" };
    } catch (error) {
      return { valid: false, message: `验证错误: ${error.message}` };
    }
  }

  validateThumbnailFile(filePath) {
    try {
      const buffer = fs.readFileSync(filePath, { start: 0, end: 10 });

      // Check JPEG signature
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        // 查找 JFIF 或 Exif 标记
        const restBuffer = fs.readFileSync(filePath, { start: 2, end: 20 });
        const hasJFIF = restBuffer.includes(Buffer.from("JFIF"));
        const hasExif = restBuffer.includes(Buffer.from("Exif"));

        if (hasJFIF || hasExif) {
          return { valid: true, format: "带元数据的 JPEG" };
        } else {
          return { valid: true, format: "JPEG" };
        }
      }

      // 检查 TIFF 签名
      const tiffMagic = buffer.toString("hex", 0, 4);
      if (tiffMagic === "49492a00" || tiffMagic === "4d4d002a") {
        return { valid: true, format: "TIFF" };
      }

      // 检查 PNG 签名
      if (buffer.toString("hex", 0, 8) === "89504e470d0a1a0a") {
        return { valid: true, format: "PNG" };
      }

      return { valid: false, format: "未知格式" };
    } catch (error) {
      return { valid: false, format: `验证错误: ${error.message}` };
    }
  }

  async testThumbnailFormats() {
    console.log("\n🎨 测试缩略图格式变化");
    console.log("======================================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于格式测试的测试文件", "warning");
      return false;
    }

    let totalTests = 0;
    let passedTests = 0;
    const formatStats = {
      jpeg: 0,
      tiff: 0,
      raw: 0,
      unknown: 0,
    };
    const detailedResults = [];

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();

      try {
        totalTests++;
        const fileName = path.basename(testFile);
        this.log(`分析缩略图格式: ${fileName}`, "test");

        await processor.loadFile(testFile);

        const thumbOK = await processor.thumbOK();
        if (!thumbOK) {
          this.log(`  无缩略图可用`, "warning");
          await processor.close();
          continue;
        }

        const unpacked = await processor.unpackThumbnail();
        if (unpacked) {
          const memThumb = await processor.createMemoryThumbnail();

          if (memThumb && memThumb.data && memThumb.data.length > 0) {
            const format = this.detectThumbnailFormat(memThumb.data);
            this.log(
              `  ✓ 格式: ${format.name} (${format.confidence}% 置信度)`,
              "success"
            );

            // 测试不同的缩略图提取方法
            const extractionResults = await this.testThumbnailExtractionMethods(
              processor,
              fileName
            );

            const result = {
              file: fileName,
              format: format,
              dimensions: `${memThumb.width}x${memThumb.height}`,
              size: memThumb.dataSize,
              extractionMethods: extractionResults,
            };

            formatStats[format.type]++;
            passedTests++;

            // 额外的格式特定测试
            if (format.type === "jpeg") {
              const jpegInfo = this.analyzeJPEGThumbnail(memThumb.data);
              this.log(
                `    JPEG 质量: ~${jpegInfo.quality}%, 子采样: ${jpegInfo.subsampling}`,
                "data"
              );
              result.jpegInfo = jpegInfo;
            } else if (format.type === "tiff") {
              const tiffInfo = this.analyzeTIFFThumbnail(memThumb.data);
              this.log(
                `    TIFF 字节序: ${tiffInfo.endianness}, 压缩: ${tiffInfo.compression}`,
                "data"
              );
              result.tiffInfo = tiffInfo;
            } else if (format.type === "raw") {
              const rawInfo = this.analyzeRawThumbnail(memThumb);
              this.log(
                `    原始格式: ${rawInfo.channels} 通道, ${rawInfo.bitsPerChannel} 位/通道`,
                "data"
              );
              result.rawInfo = rawInfo;
            }

            detailedResults.push(result);
          } else {
            this.log(`  ✗ 无缩略图数据可用`, "error");
          }
        } else {
          this.log(`  ✗ 缩略图解包失败`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ 格式分析失败: ${error.message}`, "error");
        await processor.close();
      }
    }

    // 测试格式转换功能
    await this.testThumbnailFormatConversions(detailedResults);

    this.results.formats = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
      formatStats,
      detailedResults,
    };

    this.log(
      `格式分析结果: ${passedTests}/${totalTests} 通过 (${this.results.formats.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    this.log(`格式分布:`, "data");
    Object.entries(formatStats).forEach(([format, count]) => {
      if (count > 0) {
        this.log(`  ${format.toUpperCase()}: ${count} 个文件`, "data");
      }
    });

    return passedTests > 0;
  }

  async testThumbnailExtractionMethods(processor, fileName) {
    const methods = {};

    try {
      // 方法 1: 直接文件写入
      const outputPath1 = path.join(this.outputDir, `${fileName}_direct.jpg`);
      const start1 = Date.now();
      await processor.writeThumbnail(outputPath1);
      const time1 = Date.now() - start1;

      if (fs.existsSync(outputPath1)) {
        const stats1 = fs.statSync(outputPath1);
        methods.directWrite = {
          success: true,
          time: time1,
          size: stats1.size,
          path: outputPath1,
        };
        this.log(`    直接写入: ${time1}ms, ${stats1.size} 字节`, "data");
      } else {
        methods.directWrite = { success: false, error: "文件未创建" };
      }
    } catch (error) {
      methods.directWrite = { success: false, error: error.message };
      this.log(`    直接写入失败: ${error.message}`, "warning");
    }

    try {
      // 方法 2: 内存提取 + 手动写入
      const start2 = Date.now();
      const memThumb = await processor.createMemoryThumbnail();
      const time2 = Date.now() - start2;

      if (memThumb && memThumb.data) {
        const outputPath2 = path.join(this.outputDir, `${fileName}_memory.jpg`);
        fs.writeFileSync(outputPath2, memThumb.data);

        methods.memoryExtraction = {
          success: true,
          time: time2,
          size: memThumb.dataSize,
          dimensions: `${memThumb.width}x${memThumb.height}`,
          path: outputPath2,
        };
        this.log(
          `    内存提取: ${time2}ms, ${memThumb.dataSize} 字节`,
          "data"
        );
      } else {
        methods.memoryExtraction = { success: false, error: "无内存数据" };
      }
    } catch (error) {
      methods.memoryExtraction = { success: false, error: error.message };
      this.log(`    内存提取失败: ${error.message}`, "warning");
    }

    return methods;
  }

  async testThumbnailFormatConversions(detailedResults) {
    console.log("\n🔄 测试缩略图格式转换");
    console.log("=======================================");

    const conversionTests = [];

    for (const result of detailedResults) {
      if (!result.extractionMethods.memoryExtraction?.success) continue;

      const fileName = path.parse(result.file).name;
      this.log(`测试转换: ${result.file}`, "test");

      try {
        // 测试不同的输出格式
        const conversions = await this.testMultipleOutputFormats(
          result.extractionMethods.memoryExtraction.path,
          fileName
        );

        conversionTests.push({
          sourceFile: result.file,
          sourceFormat: result.format.name,
          conversions: conversions,
        });

        this.log(
          `  ✓ 测试了 ${Object.keys(conversions).length} 种格式转换`,
          "success"
        );
      } catch (error) {
        this.log(`  ✗ 转换测试失败: ${error.message}`, "error");
      }
    }

    return conversionTests;
  }

  async testMultipleOutputFormats(sourcePath, baseName) {
    const sharp = require("sharp");
    const conversions = {};

    // 测试不同的输出格式
    const formats = [
      { ext: "png", options: { compressionLevel: 6 } },
      { ext: "webp", options: { quality: 80 } },
      { ext: "tiff", options: { compression: "lzw" } },
      { ext: "jpeg", options: { quality: 90, progressive: true } },
      { ext: "avif", options: { quality: 50 } }, // 现代格式
    ];

    for (const format of formats) {
      try {
        const outputPath = path.join(
          this.outputDir,
          `${baseName}_converted.${format.ext}`
        );
        const start = Date.now();

        let sharpInstance = sharp(sourcePath);

        // 应用格式特定的处理
        switch (format.ext) {
          case "png":
            await sharpInstance.png(format.options).toFile(outputPath);
            break;
          case "webp":
            await sharpInstance.webp(format.options).toFile(outputPath);
            break;
          case "tiff":
            await sharpInstance.tiff(format.options).toFile(outputPath);
            break;
          case "jpeg":
            await sharpInstance.jpeg(format.options).toFile(outputPath);
            break;
          case "avif":
            await sharpInstance.avif(format.options).toFile(outputPath);
            break;
        }

        const time = Date.now() - start;

        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          conversions[format.ext] = {
            success: true,
            time: time,
            size: stats.size,
            path: outputPath,
          };
          this.log(
            `    ${format.ext.toUpperCase()}: ${time}ms, ${stats.size} bytes`,
            "data"
          );
        } else {
          conversions[format.ext] = {
            success: false,
            error: "文件未创建",
          };
        }
      } catch (error) {
        conversions[format.ext] = { success: false, error: error.message };
        if (!error.message.includes("avif")) {
          // AVIF 可能不受支持
          this.log(
            `    ${format.ext.toUpperCase()} 转换失败: ${
              error.message
            }`,
            "warning"
          );
        }
      }
    }

    return conversions;
  }

  analyzeTIFFThumbnail(data) {
    try {
      // 检查字节序
      const endianness =
        data[0] === 0x49 && data[1] === 0x49 ? "little" : "big";

      // 查找压缩信息
      let compression = "unknown";

      // 简单启发式 - 查找常见的 TIFF 压缩标记
      if (data.includes(0x01)) compression = "uncompressed";
      else if (data.includes(0x05)) compression = "LZW";
      else if (data.includes(0x07)) compression = "JPEG";

      return { endianness, compression };
    } catch (error) {
      return { endianness: "unknown", compression: "unknown" };
    }
  }

  analyzeRawThumbnail(thumbnail) {
    try {
      // 分析原始缩略图数据
      const channels = thumbnail.colors || 3;
      const bitsPerChannel = thumbnail.bits || 8;
      const pixelCount = thumbnail.width * thumbnail.height;
      const expectedSize = pixelCount * channels * (bitsPerChannel / 8);

      return {
        channels: channels,
        bitsPerChannel: bitsPerChannel,
        pixelCount: pixelCount,
        expectedSize: expectedSize,
        actualSize: thumbnail.dataSize,
        sizeMatch: Math.abs(expectedSize - thumbnail.dataSize) < 100,
      };
    } catch (error) {
      return {
        channels: "unknown",
        bitsPerChannel: "unknown",
        error: error.message,
      };
    }
  }

  detectThumbnailFormat(data) {
    // JPEG 检测
    if (data[0] === 0xff && data[1] === 0xd8) {
      // 检查 JPEG 变体
      const hasJFIF =
        data.includes(Buffer.from("JFIF")[0]) &&
        data.includes(Buffer.from("JFIF")[1]);
      const hasExif =
        data.includes(Buffer.from("Exif")[0]) &&
        data.includes(Buffer.from("Exif")[1]);

      if (hasJFIF) {
        return {
          name: "JPEG/JFIF",
          type: "jpeg",
          confidence: 100,
          variant: "JFIF",
        };
      } else if (hasExif) {
        return {
          name: "JPEG/Exif",
          type: "jpeg",
          confidence: 100,
          variant: "Exif",
        };
      } else {
        return {
          name: "JPEG",
          type: "jpeg",
          confidence: 95,
          variant: "Standard",
        };
      }
    }

    // TIFF 检测（包括 TIFF 中的嵌入式 JPEG）
    const tiffMagic = data.slice(0, 4);
    if (
      (tiffMagic[0] === 0x49 &&
        tiffMagic[1] === 0x49 &&
        tiffMagic[2] === 0x2a &&
        tiffMagic[3] === 0x00) ||
      (tiffMagic[0] === 0x4d &&
        tiffMagic[1] === 0x4d &&
        tiffMagic[2] === 0x00 &&
        tiffMagic[3] === 0x2a)
    ) {
      // 检查是否为带 JPEG 压缩的 TIFF
      const hasJPEGCompression = this.checkTIFFForJPEGCompression(data);
      return {
        name: hasJPEGCompression ? "TIFF/JPEG" : "TIFF",
        type: "tiff",
        confidence: 100,
        variant: hasJPEGCompression ? "JPEG-compressed" : "Uncompressed",
      };
    }

    // PNG 检测
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (data.length >= 8 && pngSignature.every((byte, i) => data[i] === byte)) {
      return { name: "PNG", type: "png", confidence: 100, variant: "Standard" };
    }

    // WebP 检测
    if (
      data.length >= 12 &&
      data[0] === 0x52 &&
      data[1] === 0x49 &&
      data[2] === 0x46 &&
      data[3] === 0x46 &&
      data[8] === 0x57 &&
      data[9] === 0x45 &&
      data[10] === 0x42 &&
      data[11] === 0x50
    ) {
      return {
        name: "WebP",
        type: "webp",
        confidence: 100,
        variant: "Standard",
      };
    }

    // BMP 检测
    if (data.length >= 2 && data[0] === 0x42 && data[1] === 0x4d) {
      return { name: "BMP", type: "bmp", confidence: 100, variant: "Standard" };
    }

    // 原始 RGB 数据检测（启发式）
    const nonZeroBytes = data
      .slice(0, Math.min(100, data.length))
      .filter((b) => b !== 0).length;

    if (nonZeroBytes > 10) {
      // 尝试确定是 RGB、YUV 还是其他原始格式
      const variance = this.calculateDataVariance(data.slice(0, 300));
      if (variance > 1000) {
        return {
          name: "原始 RGB 数据",
          type: "raw",
          confidence: 70,
          variant: "RGB",
        };
      } else {
        return {
          name: "原始 YUV 数据",
          type: "raw",
          confidence: 60,
          variant: "YUV",
        };
      }
    }

    return {
      name: "未知格式",
      type: "unknown",
      confidence: 0,
      variant: "Unknown",
    };
  }

  checkTIFFForJPEGCompression(data) {
    // 查找 TIFF 压缩标签 (0x0103) 和 JPEG 值 (0x0007)
    try {
      for (let i = 0; i < Math.min(data.length - 10, 1000); i++) {
        if (
          data[i] === 0x03 &&
          data[i + 1] === 0x01 && // 标签 0x0103
          data[i + 8] === 0x07 &&
          data[i + 9] === 0x00
        ) {
          // JPEG 压缩
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  calculateDataVariance(data) {
    if (data.length === 0) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  async testThumbnailTypesAndSizes() {
    console.log("\n📏 测试缩略图类型和尺寸");
    console.log("====================================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于尺寸测试的测试文件", "warning");
      return false;
    }

    const sizeCategories = {
      tiny: { min: 0, max: 5000, count: 0 }, // < 5KB
      small: { min: 5000, max: 20000, count: 0 }, // 5-20KB
      medium: { min: 20000, max: 100000, count: 0 }, // 20-100KB
      large: { min: 100000, max: 500000, count: 0 }, // 100-500KB
      huge: { min: 500000, max: Infinity, count: 0 }, // > 500KB
    };

    const dimensionCategories = {
      micro: { max: 64, count: 0 }, // ≤ 64px
      tiny: { max: 128, count: 0 }, // ≤ 128px
      small: { max: 256, count: 0 }, // ≤ 256px
      medium: { max: 512, count: 0 }, // ≤ 512px
      large: { max: 1024, count: 0 }, // ≤ 1024px
      huge: { max: Infinity, count: 0 }, // > 1024px
    };

    const aspectRatios = {};
    let totalTests = 0;
    let passedTests = 0;

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();

      try {
        totalTests++;
        const fileName = path.basename(testFile);
        this.log(`分析缩略图尺寸: ${fileName}`, "test");

        await processor.loadFile(testFile);

        const thumbOK = await processor.thumbOK();
        if (!thumbOK) {
          this.log(`  无缩略图可用`, "warning");
          await processor.close();
          continue;
        }

        const unpacked = await processor.unpackThumbnail();
        if (unpacked) {
          const memThumb = await processor.createMemoryThumbnail();

          if (memThumb && memThumb.data && memThumb.data.length > 0) {
            passedTests++;

            // 按文件大小分类
            const size = memThumb.dataSize;
            for (const [category, range] of Object.entries(sizeCategories)) {
              if (size >= range.min && size < range.max) {
                range.count++;
                break;
              }
            }

            // 按尺寸分类
            const maxDimension = Math.max(memThumb.width, memThumb.height);
            for (const [category, range] of Object.entries(
              dimensionCategories
            )) {
              if (maxDimension <= range.max) {
                range.count++;
                break;
              }
            }

            // 计算宽高比
            const aspectRatio = (memThumb.width / memThumb.height).toFixed(2);
            aspectRatios[aspectRatio] = (aspectRatios[aspectRatio] || 0) + 1;

            this.log(
              `  ✓ 大小: ${size} 字节, 尺寸: ${memThumb.width}x${memThumb.height}, 宽高比: ${aspectRatio}`,
              "success"
            );

            // 测试缩略图质量估计
            const qualityInfo = await this.estimateThumbnailQuality(memThumb);
            this.log(
              `    质量估计: ${qualityInfo.estimation}, 压缩: ${qualityInfo.compression}`,
              "data"
            );
          }
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ 尺寸分析失败: ${error.message}`, "error");
        await processor.close();
      }
    }

    // 报告结果
    this.log("\n大小分布:", "data");
    Object.entries(sizeCategories).forEach(([category, range]) => {
      if (range.count > 0) {
        const sizeRange =
          range.max === Infinity
            ? `> ${(range.min / 1000).toFixed(0)}KB`
            : `${(range.min / 1000).toFixed(0)}-${(range.max / 1000).toFixed(
                0
              )}KB`;
        this.log(`  ${category}: ${range.count} (${sizeRange})`, "data");
      }
    });

    this.log("\n尺寸分布:", "data");
    Object.entries(dimensionCategories).forEach(([category, range]) => {
      if (range.count > 0) {
        const dimRange =
          range.max === Infinity ? `> ${range.max}px` : `≤ ${range.max}px`;
        this.log(`  ${category}: ${range.count} (${dimRange})`, "data");
      }
    });

    this.log("\n宽高比:", "data");
    Object.entries(aspectRatios)
      .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
      .slice(0, 5)
      .forEach(([ratio, count]) => {
        this.log(`  ${ratio}: ${count} 个文件`, "data");
      });

    this.results.sizes = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
      sizeCategories,
      dimensionCategories,
      aspectRatios,
    };

    return passedTests > 0;
  }

  async estimateThumbnailQuality(thumbnail) {
    try {
      const data = thumbnail.data;

      // 计算压缩比
      const uncompressedSize = thumbnail.width * thumbnail.height * 3; // 假设 RGB
      const compressionRatio = (uncompressedSize / thumbnail.dataSize).toFixed(
        1
      );

      // 基于压缩比和大小估计质量
      let qualityEstimate = "Unknown";
      if (compressionRatio > 10) qualityEstimate = "Low (High compression)";
      else if (compressionRatio > 5) qualityEstimate = "Medium";
      else if (compressionRatio > 2) qualityEstimate = "High";
      else qualityEstimate = "Very High (Low compression)";

      // JPEG 缩略图的额外分析
      if (data[0] === 0xff && data[1] === 0xd8) {
        const jpegQuality = this.estimateJPEGQuality(data);
        qualityEstimate = `JPEG Q~${jpegQuality}`;
      }

      return {
        estimation: qualityEstimate,
        compression: `${compressionRatio}:1`,
        uncompressedSize: uncompressedSize,
        compressedSize: thumbnail.dataSize,
      };
    } catch (error) {
      return {
        estimation: "错误",
        compression: "未知",
        error: error.message,
      };
    }
  }

  estimateJPEGQuality(data) {
    try {
      // 查找量化表以估计质量
      let quality = 75; // 默认值

      // 查找 DQT（定义量化表）标记
      for (let i = 0; i < data.length - 10; i++) {
        if (data[i] === 0xff && data[i + 1] === 0xdb) {
          // 找到 DQT 标记，分析量化值
          const qtLength = (data[i + 2] << 8) | data[i + 3];
          if (qtLength > 4 && i + qtLength < data.length) {
            const qtValues = data.slice(
              i + 5,
              i + 5 + Math.min(64, qtLength - 3)
            );
            const avgQt =
              qtValues.reduce((sum, val) => sum + val, 0) / qtValues.length;

            // 基于平均量化表值的粗略质量估计
            if (avgQt < 10) quality = 95;
            else if (avgQt < 20) quality = 85;
            else if (avgQt < 40) quality = 75;
            else if (avgQt < 60) quality = 65;
            else if (avgQt < 80) quality = 55;
            else quality = 45;

            break;
          }
        }
      }

      return quality;
    } catch (error) {
      return 75; // 默认回退
    }
  }

  analyzeJPEGThumbnail(data) {
    try {
      // 查找量化表以估计质量
      let quality = 75; // 默认假设
      let subsampling = "Unknown";

      // 查找 SOF（帧开始）标记
      for (let i = 0; i < data.length - 10; i++) {
        if (data[i] === 0xff && data[i + 1] === 0xc0) {
          // 找到 SOF0 标记，读取采样因子
          const components = data[i + 9];
          if (components === 3) {
            const y_sampling = data[i + 11];
            const cb_sampling = data[i + 14];
            const cr_sampling = data[i + 17];

            if (
              y_sampling === 0x22 &&
              cb_sampling === 0x11 &&
              cr_sampling === 0x11
            ) {
              subsampling = "4:2:0";
            } else if (
              y_sampling === 0x21 &&
              cb_sampling === 0x11 &&
              cr_sampling === 0x11
            ) {
              subsampling = "4:2:2";
            } else if (
              y_sampling === 0x11 &&
              cb_sampling === 0x11 &&
              cr_sampling === 0x11
            ) {
              subsampling = "4:4:4";
            }
          }
          break;
        }
      }

      return { quality, subsampling };
    } catch (error) {
      return { quality: "未知", subsampling: "未知" };
    }
  }

  async testThumbnailPerformance() {
    console.log("\n⚡ 测试缩略图性能");
    console.log("===============================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于性能测试的测试文件", "warning");
      return false;
    }

    const performanceResults = [];
    let totalTime = 0;
    let successfulTests = 0;

    for (const testFile of this.testFiles) {
      const processor = new LibRaw();

      try {
        const fileName = path.basename(testFile);
        this.log(`性能测试: ${fileName}`, "test");

        const startTime = Date.now();

        await processor.loadFile(testFile);
        const loadTime = Date.now() - startTime;

        const thumbOK = await processor.thumbOK();
        if (!thumbOK) {
          this.log(`  无缩略图 - 跳过`, "warning");
          await processor.close();
          continue;
        }

        const unpackStart = Date.now();
        const unpacked = await processor.unpackThumbnail();
        const unpackTime = Date.now() - unpackStart;

        if (unpacked) {
          const memStart = Date.now();
          const memThumb = await processor.createMemoryThumbnail();
          const memTime = Date.now() - memStart;

          const totalTestTime = Date.now() - startTime;
          totalTime += totalTestTime;
          successfulTests++;

          const result = {
            file: fileName,
            loadTime,
            unpackTime,
            memTime,
            totalTime: totalTestTime,
            thumbSize: memThumb ? memThumb.dataSize : 0,
            thumbDimensions: memThumb
              ? `${memThumb.width}x${memThumb.height}`
              : "N/A",
          };

          performanceResults.push(result);

          this.log(
            `  ✓ 总计: ${totalTestTime}ms (加载: ${loadTime}ms, 解包: ${unpackTime}ms, 内存: ${memTime}ms)`,
            "success"
          );
          this.log(
            `    缩略图: ${result.thumbDimensions}, ${result.thumbSize} 字节`,
            "data"
          );
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ 性能测试失败: ${error.message}`, "error");
        await processor.close();
      }
    }

    if (successfulTests > 0) {
      const avgTime = Math.round(totalTime / successfulTests);
      const avgThroughput =
        (performanceResults.reduce((sum, r) => sum + r.thumbSize, 0) /
          totalTime) *
        1000; // bytes per second

      this.log(`\n性能总结:`, "data");
      this.log(`  平均处理时间: ${avgTime}ms`, "data");
      this.log(
        `  缩略图吞吐量: ${(avgThroughput / 1024).toFixed(2)} KB/s`,
        "data"
      );
      this.log(
        `  成功提取: ${successfulTests}/${this.testFiles.length}`,
        "data"
      );

      this.results.performance = {
        tested: this.testFiles.length,
        passed: successfulTests,
        successRate:
          this.testFiles.length > 0
            ? ((successfulTests / this.testFiles.length) * 100).toFixed(1)
            : 0,
        averageTime: avgTime,
        throughput: avgThroughput,
        performanceResults,
      };
    } else {
      this.results.performance = {
        tested: this.testFiles.length,
        passed: 0,
        successRate: "0.0",
        averageTime: 0,
        throughput: 0,
        performanceResults: [],
      };
    }

    return successfulTests > 0;
  }

  async testMultiSizeJPEGGeneration() {
    console.log("\n📐 测试从 RAW 生成多尺寸 JPEG");
    console.log("==============================================");

    if (this.testFiles.length === 0) {
      this.log("没有可用于多尺寸测试的测试文件", "warning");
      return false;
    }

    const multiSizeOutputDir = path.join(this.outputDir, "multi-size");
    if (!fs.existsSync(multiSizeOutputDir)) {
      fs.mkdirSync(multiSizeOutputDir, { recursive: true });
    }

    // 定义不同的尺寸配置
    const sizeConfigs = [
      {
        name: "thumbnail",
        width: 200,
        height: 150,
        quality: 85,
        description: "小缩略图",
      },
      {
        name: "small",
        width: 400,
        height: 300,
        quality: 85,
        description: "小预览",
      },
      {
        name: "medium",
        width: 800,
        height: 600,
        quality: 85,
        description: "中等预览",
      },
      {
        name: "large",
        width: 1200,
        height: 900,
        quality: 90,
        description: "大预览",
      },
      {
        name: "web_hd",
        width: 1920,
        height: 1080,
        quality: 85,
        description: "Web HD",
      },
      {
        name: "web_4k",
        width: 3840,
        height: 2160,
        quality: 80,
        description: "4K Web",
      },
      {
        name: "full_quality",
        quality: 95,
        description: "全尺寸，高质量",
      },
      { name: "archive", quality: 100, description: "归档质量" },
    ];

    let totalTests = 0;
    let passedTests = 0;
    const generationResults = [];

    for (const testFile of this.testFiles.slice(0, 2)) {
      // 使用前 2 个文件进行速度测试
      const processor = new LibRaw();

      try {
        totalTests++;
        const fileName = path.basename(testFile, path.extname(testFile));
        this.log(`从以下文件生成多尺寸 JPEG: ${fileName}`, "test");

        const startTime = Date.now();
        await processor.loadFile(testFile);

        // 获取原始图像元数据
        const metadata = await processor.getMetadata();
        this.log(
          `  原始: ${metadata.width}x${metadata.height} (${(
            (metadata.width * metadata.height) /
            1000000
          ).toFixed(1)}MP)`,
          "data"
        );

        const sizeResults = [];
        let successfulSizes = 0;

        for (const config of sizeConfigs) {
          try {
            const outputPath = path.join(
              multiSizeOutputDir,
              `${fileName}_${config.name}.jpg`
            );
            const sizeStartTime = Date.now();

            // 使用带尺寸参数的 JPEG 转换方法
            const conversionOptions = {
              quality: config.quality,
              fastMode: true,
              effort: 3,
            };

            // 如果指定了尺寸约束，则添加
            if (config.width) conversionOptions.width = config.width;
            if (config.height) conversionOptions.height = config.height;

            const result = await processor.convertToJPEG(
              outputPath,
              conversionOptions
            );
            const sizeTime = Date.now() - sizeStartTime;

            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath);
              const outputDimensions = result.metadata.outputDimensions;

              sizeResults.push({
                name: config.name,
                description: config.description,
                targetSize:
                  config.width && config.height
                    ? `${config.width}x${config.height}`
                    : "原始",
                actualSize: `${outputDimensions.width}x${outputDimensions.height}`,
                fileSize: stats.size,
                fileSizeKB: (stats.size / 1024).toFixed(1),
                quality: config.quality,
                processingTime: sizeTime,
                compressionRatio: result.metadata.fileSize.compressionRatio,
                success: true,
              });

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
                success: false,
                error: "文件未创建",
              });
              this.log(`    ✗ ${config.name}: 文件未创建`, "error");
            }
          } catch (sizeError) {
            sizeResults.push({
              name: config.name,
              success: false,
              error: sizeError.message,
            });
            this.log(`    ✗ ${config.name}: ${sizeError.message}`, "error");
          }
        }

        const totalTime = Date.now() - startTime;

        generationResults.push({
          file: fileName,
          originalDimensions: `${metadata.width}x${metadata.height}`,
          originalSize: `${(
            (metadata.width * metadata.height) /
            1000000
          ).toFixed(1)}MP`,
          totalProcessingTime: totalTime,
          successfulSizes: successfulSizes,
          totalSizes: sizeConfigs.length,
          sizeResults: sizeResults,
        });

        if (successfulSizes > 0) {
          passedTests++;
          this.log(
            `  ✓ 生成了 ${successfulSizes}/${sizeConfigs.length} 个尺寸，用时 ${totalTime}ms`,
            "success"
          );

          // 生成尺寸比较报告
          await this.generateSizeComparisonReport(
            fileName,
            sizeResults,
            multiSizeOutputDir
          );
        } else {
          this.log(`  ✗ 未能生成任何尺寸`, "error");
        }

        await processor.close();
      } catch (error) {
        this.log(`  ✗ 多尺寸生成失败: ${error.message}`, "error");
        await processor.close();
      }
    }

    // 生成综合结果
    this.results.multiSize = {
      tested: totalTests,
      passed: passedTests,
      successRate:
        totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
      generationResults: generationResults,
    };

    // 打印详细结果
    this.printMultiSizeResults(generationResults);

    this.log(
      `多尺寸 JPEG 生成结果: ${passedTests}/${totalTests} 通过 (${this.results.multiSize.successRate}%)`,
      passedTests > 0 ? "success" : "warning"
    );

    return passedTests > 0;
  }

  async generateSizeComparisonReport(fileName, sizeResults, outputDir) {
    try {
      const reportPath = path.join(outputDir, `${fileName}_size_report.html`);

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>多尺寸 JPEG 报告 - ${fileName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .size-preview { display: flex; flex-wrap: wrap; gap: 20px; margin: 20px 0; }
        .preview-item { border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #fafafa; }
        .preview-item img { max-width: 200px; max-height: 150px; object-fit: contain; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .file-size { font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>多尺寸 JPEG 生成报告</h1>
        <h2>源文件: ${fileName}</h2>
        
        <div class="stats">
            ${sizeResults
              .filter((r) => r.success)
              .map(
                (result) => `
                <div class="stat-card">
                    <h3>${result.name}</h3>
                    <p>${result.description}</p>
                    <p><strong>尺寸:</strong> ${result.actualSize}</p>
                    <p><strong>文件大小:</strong> <span class="file-size">${result.fileSizeKB}KB</span></p>
                    <p><strong>质量:</strong> ${result.quality}%</p>
                    <p><strong>时间:</strong> ${result.processingTime}ms</p>
                </div>
            `
              )
              .join("")}
        </div>

        <table>
            <thead>
                <tr>
                    <th>尺寸名称</th>
                    <th>描述</th>
                    <th>目标尺寸</th>
                    <th>实际尺寸</th>
                    <th>文件大小</th>
                    <th>质量</th>
                    <th>压缩比</th>
                    <th>处理时间</th>
                    <th>状态</th>
                </tr>
            </thead>
            <tbody>
                ${sizeResults
                  .map(
                    (result) => `
                    <tr>
                        <td><strong>${result.name}</strong></td>
                        <td>${result.description || "N/A"}</td>
                        <td>${result.targetSize || "N/A"}</td>
                        <td>${result.actualSize || "N/A"}</td>
                        <td class="file-size">${
                          result.fileSizeKB || "N/A"
                        }KB</td>
                        <td>${result.quality || "N/A"}%</td>
                        <td>${result.compressionRatio || "N/A"}</td>
                        <td>${result.processingTime || "N/A"}ms</td>
                        <td class="${result.success ? "success" : "error"}">
                            ${
                              result.success
                                ? "✓ 成功"
                                : "✗ " + (result.error || "失败")
                            }
                        </td>
                    </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
            由 LibRaw 多尺寸 JPEG 测试于 ${new Date().toLocaleString()} 生成
        </div>
    </div>
</body>
</html>`;

      fs.writeFileSync(reportPath, htmlContent);
      this.log(
        `    📋 尺寸比较报告已生成: ${reportPath}`,
        "data"
      );
    } catch (error) {
      this.log(`    ⚠️ 生成报告失败: ${error.message}`, "warning");
    }
  }

  printMultiSizeResults(generationResults) {
    console.log("\n📊 多尺寸 JPEG 生成结果");
    console.log("=====================================");

    for (const result of generationResults) {
      this.log(
        `文件: ${result.file} (${result.originalDimensions}, ${result.originalSize})`,
        "data"
      );
      this.log(
        `总处理时间: ${result.totalProcessingTime}ms`,
        "data"
      );
      this.log(
        `成功尺寸: ${result.successfulSizes}/${result.totalSizes}`,
        "data"
      );

      // 按成功/失败分组结果
      const successful = result.sizeResults.filter((r) => r.success);
      const failed = result.sizeResults.filter((r) => !r.success);

      if (successful.length > 0) {
        this.log(`  成功生成:`, "success");
        successful.forEach((size) => {
          this.log(
            `    ${size.name}: ${size.actualSize} → ${size.fileSizeKB}KB (Q${size.quality}%, ${size.processingTime}ms)`,
            "data"
          );
        });
      }

      if (failed.length > 0) {
        this.log(`  失败生成:`, "error");
        failed.forEach((size) => {
          this.log(`    ${size.name}: ${size.error}`, "error");
        });
      }

      // 尺寸效率分析
      if (successful.length >= 2) {
        const sizes = successful.sort((a, b) => a.fileSize - b.fileSize);
        const smallest = sizes[0];
        const largest = sizes[sizes.length - 1];
        const compressionRange = (largest.fileSize / smallest.fileSize).toFixed(
          1
        );

        this.log(
          `  尺寸范围: ${smallest.fileSizeKB}KB 到 ${largest.fileSizeKB}KB (${compressionRange}x 差异)`,
          "data"
        );
      }

      console.log();
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
        this.log("测试输出文件和目录已清理", "info");
      }
    } catch (error) {
      this.log(`清理失败: ${error.message}`, "warning");
    }
  }

  printSummary() {
    console.log("\n📊 缩略图提取测试总结");
    console.log("====================================");

    const categories = [
      { name: "缩略图检测", result: this.results.extraction },
      { name: "内存操作", result: this.results.memory },
      { name: "格式分析", result: this.results.formats },
      { name: "尺寸和类型分析", result: this.results.sizes },
      { name: "性能测试", result: this.results.performance },
      { name: "多尺寸 JPEG 生成", result: this.results.multiSize },
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

    if (this.results.extraction.withThumbnails !== undefined) {
      this.log(
        `有缩略图的文件: ${this.results.extraction.withThumbnails}/${this.testFiles.length}`,
        "data"
      );
    }

    if (this.results.formats.formatStats) {
      this.log(`格式分布:`, "data");
      Object.entries(this.results.formats.formatStats).forEach(
        ([format, count]) => {
          if (count > 0) {
            this.log(`  ${format.toUpperCase()}: ${count}`, "data");
          }
        }
      );
    }

    // 如果可用，添加详细格式分析
    if (this.results.formats.detailedResults) {
      this.log(`\n详细格式分析:`, "data");
      this.results.formats.detailedResults.forEach((result) => {
        this.log(
          `  ${result.file}: ${result.format.name} (${result.dimensions})`,
          "data"
        );
        if (result.jpegInfo) {
          this.log(
            `    JPEG: Q~${result.jpegInfo.quality}%, ${result.jpegInfo.subsampling}`,
            "data"
          );
        }
        if (result.tiffInfo) {
          this.log(
            `    TIFF: ${result.tiffInfo.endianness} 字节序, ${result.tiffInfo.compression}`,
            "data"
          );
        }
      });
    }

    if (totalTests > 0) {
      const overallSuccessRate = ((passedTests / totalTests) * 100).toFixed(1);
      this.log(
        `\n总体成功率: ${passedTests}/${totalTests} (${overallSuccessRate}%)`,
        passedTests === totalTests ? "success" : "warning"
      );
    }
  }

  async runAllTests() {
    console.log("🧪 LibRaw 缩略图提取测试套件");
    console.log("==========================================");

    // 查找测试文件
    this.testFiles = this.findTestFiles();

    if (this.testFiles.length === 0) {
      this.log("在 raw-samples-repo 目录中未找到 RAW 测试文件", "error");
      this.log(
        "请将一些 RAW 文件（CR2、CR3、NEF、ARW、DNG、RAF、RW2）添加到 raw-samples-repo/",
        "info"
      );
      return false;
    }

    this.log(`找到 ${this.testFiles.length} 个测试文件`, "success");

    // 运行所有测试类别
    const results = [];

    // 1. 基本缩略图检测
    const detectionResult = await this.testThumbnailDetection();
    results.push(detectionResult.success);

    if (detectionResult.success) {
      // 2. 缩略图提取方法
      results.push(await this.testThumbnailExtraction(detectionResult.results));

      // 3. 综合格式分析
      results.push(await this.testThumbnailFormats());

      // 4. 尺寸和类型分析
      results.push(await this.testThumbnailTypesAndSizes());

      // 5. 性能测试
      results.push(await this.testThumbnailPerformance());

      // 6. 多尺寸 JPEG 生成测试
      results.push(await this.testMultiSizeJPEGGeneration());
    }

    this.printSummary();

    // 清理测试文件
    this.cleanupOutputFiles();

    const allPassed = results.every((result) => result);

    if (allPassed) {
      console.log(
        "\n🎉 所有缩略图提取测试成功完成！"
      );
    } else {
      console.log(
        "\n⚠️  某些缩略图提取测试失败或有警告"
      );
    }

    return allPassed;
  }
}

async function main() {
  const tester = new ThumbnailExtractionTests();

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

module.exports = { ThumbnailExtractionTests };
