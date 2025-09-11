const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 新缓冲区创建方法的综合测试
 * 测试添加到 LibRaw API 的所有新 createXXXBuffer() 方法
 */

// 测试配置
const TEST_CONFIG = {
  timeout: 30000, // 每个测试 30 秒
  sampleImagesDir: path.join(__dirname, "..", "raw-samples-repo"),
  outputDir: path.join(__dirname, "buffer-output"),
  minBufferSize: 1000, // 最小预期缓冲区大小（字节）
  maxTestFileSize: 50 * 1024 * 1024, // 最大测试文件 50MB
};

// 确保输出目录存在
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

/**
 * 查找测试 RAW 文件的辅助函数
 */
function findTestFile() {
  if (!fs.existsSync(TEST_CONFIG.sampleImagesDir)) {
    throw new Error(
      `示例图像目录未找到: ${TEST_CONFIG.sampleImagesDir}`
    );
  }

  const rawExtensions = [
    ".cr2",
    ".cr3",
    ".nef",
    ".arw",
    ".raf",
    ".rw2",
    ".dng",
    ".orf",
  ];
  const files = fs.readdirSync(TEST_CONFIG.sampleImagesDir);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (rawExtensions.includes(ext)) {
      const fullPath = path.join(TEST_CONFIG.sampleImagesDir, file);
      const stats = fs.statSync(fullPath);

      // 跳过测试中过大的文件
      if (stats.size <= TEST_CONFIG.maxTestFileSize) {
        return fullPath;
      }
    }
  }

  throw new Error("未找到合适的 RAW 测试文件");
}

/**
 * 验证缓冲区结果结构的辅助函数
 */
function validateBufferResult(result, formatName) {
  const errors = [];

  // 检查结果结构
  if (!result || typeof result !== "object") {
    errors.push(`${formatName}: 结果不是对象`);
    return errors;
  }

  // 检查成功标志
  if (result.success !== true) {
    errors.push(`${formatName}: 成功标志不为 true`);
  }

  // 检查缓冲区
  if (!Buffer.isBuffer(result.buffer)) {
    errors.push(`${formatName}: 缓冲区不是 Buffer 实例`);
  } else if (result.buffer.length < TEST_CONFIG.minBufferSize) {
    errors.push(
      `${formatName}: 缓冲区太小 (${result.buffer.length} 字节)`
    );
  }

  // 检查元数据结构
  if (!result.metadata || typeof result.metadata !== "object") {
    errors.push(`${formatName}: 元数据缺失或不是对象`);
  } else {
    const meta = result.metadata;

    // 检查尺寸
    if (
      !meta.outputDimensions ||
      !meta.outputDimensions.width ||
      !meta.outputDimensions.height
    ) {
      errors.push(`${formatName}: 输出尺寸缺失或无效`);
    }

    // 检查文件大小信息
    if (!meta.fileSize || typeof meta.fileSize.compressed !== "number") {
      errors.push(`${formatName}: 文件大小压缩信息缺失或无效`);
    }

    // 检查处理信息
    if (!meta.processing || !meta.processing.timeMs) {
      errors.push(`${formatName}: 处理时间信息缺失`);
    }
  }

  return errors;
}

/**
 * 测试 createJPEGBuffer 方法
 */
async function testCreateJPEGBuffer() {
  console.log("\n📸 Testing createJPEGBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    // 测试 1：基本 JPEG 创建
    console.log("  • Basic JPEG creation...");
    const basicResult = await processor.createJPEGBuffer();
    const basicErrors = validateBufferResult(basicResult, "Basic JPEG");
    errors.push(...basicErrors);

    if (basicErrors.length === 0) {
      console.log(`    ✅ Success: ${basicResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_basic.jpg"),
        basicResult.buffer
      );
    } else {
      console.log("    ❌ Failed validation");
    }

    // 测试 2：高质量 JPEG
    console.log("  • High quality JPEG (quality: 95)...");
    const hqResult = await processor.createJPEGBuffer({ quality: 95 });
    const hqErrors = validateBufferResult(hqResult, "High Quality JPEG");
    errors.push(...hqErrors);

    if (hqErrors.length === 0) {
      console.log(`    ✅ Success: ${hqResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_hq.jpg"),
        hqResult.buffer
      );
    }

    // 测试 3：调整大小的 JPEG
    console.log("  • Resized JPEG (1920px wide)...");
    const resizedResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920,
    });
    const resizedErrors = validateBufferResult(resizedResult, "Resized JPEG");
    errors.push(...resizedErrors);

    if (resizedErrors.length === 0) {
      console.log(`    ✅ Success: ${resizedResult.buffer.length} bytes`);
      console.log(
        `    📐 Dimensions: ${resizedResult.metadata.outputDimensions.width}x${resizedResult.metadata.outputDimensions.height}`
      );
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_resized.jpg"),
        resizedResult.buffer
      );

      // 验证调整大小是否有效
      if (resizedResult.metadata.outputDimensions.width !== 1920) {
        errors.push("Resize did not produce expected width");
      }
    }

    // 测试 4：渐进式 JPEG
    console.log("  • Progressive JPEG...");
    const progressiveResult = await processor.createJPEGBuffer({
      quality: 85,
      progressive: true,
      width: 800,
    });
    const progressiveErrors = validateBufferResult(
      progressiveResult,
      "Progressive JPEG"
    );
    errors.push(...progressiveErrors);

    if (progressiveErrors.length === 0) {
      console.log(`    ✅ Success: ${progressiveResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_progressive.jpg"),
        progressiveResult.buffer
      );
    }

    // 测试 5：快速模式 JPEG
    console.log("  • Fast mode JPEG...");
    const fastResult = await processor.createJPEGBuffer({
      quality: 80,
      fastMode: true,
      effort: 1,
      width: 1200,
    });
    const fastErrors = validateBufferResult(fastResult, "Fast Mode JPEG");
    errors.push(...fastErrors);

    if (fastErrors.length === 0) {
      console.log(`    ✅ Success: ${fastResult.buffer.length} bytes`);
      console.log(
        `    ⚡ Processing time: ${fastResult.metadata.processing.timeMs}ms`
      );
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_fast.jpg"),
        fastResult.buffer
      );
    }

    // 测试 6：边缘情况 - 极低质量
    console.log("  • Very low quality JPEG (quality: 1)...");
    try {
      const lowQualityResult = await processor.createJPEGBuffer({ quality: 1 });
      const lowQualityErrors = validateBufferResult(
        lowQualityResult,
        "Low Quality JPEG"
      );
      if (lowQualityErrors.length === 0) {
        console.log(
          `    ✅ Low quality handled: ${lowQualityResult.buffer.length} bytes`
        );
      } else {
        errors.push(...lowQualityErrors);
      }
    } catch (error) {
      console.log(`    ⚠️ Low quality failed: ${error.message}`);
    }

    // 测试 7：边缘情况 - 极高质量
    console.log("  • Very high quality JPEG (quality: 100)...");
    try {
      const maxQualityResult = await processor.createJPEGBuffer({
        quality: 100,
      });
      const maxQualityErrors = validateBufferResult(
        maxQualityResult,
        "Max Quality JPEG"
      );
      if (maxQualityErrors.length === 0) {
        console.log(
          `    ✅ Max quality handled: ${maxQualityResult.buffer.length} bytes`
        );
      } else {
        errors.push(...maxQualityErrors);
      }
    } catch (error) {
      console.log(`    ⚠️ Max quality failed: ${error.message}`);
    }
  } catch (error) {
    errors.push(`JPEG test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test createPNGBuffer method
 */
async function testCreatePNGBuffer() {
  console.log("\n🖼️ Testing createPNGBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    // 测试 1：基本 PNG 创建
    console.log("  • Basic PNG creation...");
    const basicResult = await processor.createPNGBuffer();
    const basicErrors = validateBufferResult(basicResult, "Basic PNG");
    errors.push(...basicErrors);

    if (basicErrors.length === 0) {
      console.log(`    ✅ Success: ${basicResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_basic.png"),
        basicResult.buffer
      );
    }

    // 测试 2：带压缩的 PNG
    console.log("  • PNG with max compression (level: 9)...");
    const compressedResult = await processor.createPNGBuffer({
      compressionLevel: 9,
      width: 800,
    });
    const compressedErrors = validateBufferResult(
      compressedResult,
      "Compressed PNG"
    );
    errors.push(...compressedErrors);

    if (compressedErrors.length === 0) {
      console.log(`    ✅ Success: ${compressedResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_compressed.png"),
        compressedResult.buffer
      );
    }

    // 测试 3：快速 PNG（低压缩）
    console.log("  • Fast PNG (compression: 0)...");
    const fastResult = await processor.createPNGBuffer({
      compressionLevel: 0,
      width: 600,
    });
    const fastErrors = validateBufferResult(fastResult, "Fast PNG");
    errors.push(...fastErrors);

    if (fastErrors.length === 0) {
      console.log(`    ✅ Success: ${fastResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_fast.png"),
        fastResult.buffer
      );
    }
  } catch (error) {
    errors.push(`PNG test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test createWebPBuffer method
 */
async function testCreateWebPBuffer() {
  console.log("\n🌐 Testing createWebPBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    // 测试 1：基本 WebP 创建
    console.log("  • Basic WebP creation...");
    const basicResult = await processor.createWebPBuffer();
    const basicErrors = validateBufferResult(basicResult, "Basic WebP");
    errors.push(...basicErrors);

    if (basicErrors.length === 0) {
      console.log(`    ✅ Success: ${basicResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_basic.webp"),
        basicResult.buffer
      );
    }

    // 测试 2：高质量 WebP
    console.log("  • High quality WebP (quality: 90)...");
    const hqResult = await processor.createWebPBuffer({
      quality: 90,
      width: 1600,
    });
    const hqErrors = validateBufferResult(hqResult, "High Quality WebP");
    errors.push(...hqErrors);

    if (hqErrors.length === 0) {
      console.log(`    ✅ Success: ${hqResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_hq.webp"),
        hqResult.buffer
      );
    }

    // 测试 3：无损 WebP
    console.log("  • Lossless WebP...");
    const losslessResult = await processor.createWebPBuffer({
      lossless: true,
      width: 800,
    });
    const losslessErrors = validateBufferResult(
      losslessResult,
      "Lossless WebP"
    );
    errors.push(...losslessErrors);

    if (losslessErrors.length === 0) {
      console.log(`    ✅ Success: ${losslessResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_lossless.webp"),
        losslessResult.buffer
      );
    }

    // 测试 4：快速 WebP（低努力）
    console.log("  • Fast WebP (effort: 0)...");
    const fastResult = await processor.createWebPBuffer({
      quality: 75,
      effort: 0,
      width: 1000,
    });
    const fastErrors = validateBufferResult(fastResult, "Fast WebP");
    errors.push(...fastErrors);

    if (fastErrors.length === 0) {
      console.log(`    ✅ Success: ${fastResult.buffer.length} bytes`);
      console.log(
        `    ⚡ Processing time: ${fastResult.metadata.processing.timeMs}ms`
      );
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_fast.webp"),
        fastResult.buffer
      );
    }
  } catch (error) {
    errors.push(`WebP test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test createAVIFBuffer method
 */
async function testCreateAVIFBuffer() {
  console.log("\n🚀 Testing createAVIFBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    // 测试 1：基本 AVIF 创建
    console.log("  • Basic AVIF creation...");
    const basicResult = await processor.createAVIFBuffer();
    const basicErrors = validateBufferResult(basicResult, "Basic AVIF");
    errors.push(...basicErrors);

    if (basicErrors.length === 0) {
      console.log(`    ✅ Success: ${basicResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_basic.avif"),
        basicResult.buffer
      );
    }

    // 测试 2：高质量 AVIF
    console.log("  • High quality AVIF (quality: 80)...");
    const hqResult = await processor.createAVIFBuffer({
      quality: 80,
      width: 1400,
    });
    const hqErrors = validateBufferResult(hqResult, "High Quality AVIF");
    errors.push(...hqErrors);

    if (hqErrors.length === 0) {
      console.log(`    ✅ Success: ${hqResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_hq.avif"),
        hqResult.buffer
      );
    }

    // 测试 3：无损 AVIF
    console.log("  • Lossless AVIF...");
    const losslessResult = await processor.createAVIFBuffer({
      lossless: true,
      width: 600,
    });
    const losslessErrors = validateBufferResult(
      losslessResult,
      "Lossless AVIF"
    );
    errors.push(...losslessErrors);

    if (losslessErrors.length === 0) {
      console.log(`    ✅ Success: ${losslessResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_lossless.avif"),
        losslessResult.buffer
      );
    }

    // 测试 4：快速 AVIF
    console.log("  • Fast AVIF (effort: 2)...");
    const fastResult = await processor.createAVIFBuffer({
      quality: 45,
      effort: 2,
      width: 1000,
    });
    const fastErrors = validateBufferResult(fastResult, "Fast AVIF");
    errors.push(...fastErrors);

    if (fastErrors.length === 0) {
      console.log(`    ✅ Success: ${fastResult.buffer.length} bytes`);
      console.log(
        `    ⚡ Processing time: ${fastResult.metadata.processing.timeMs}ms`
      );
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_fast.avif"),
        fastResult.buffer
      );
    }
  } catch (error) {
    errors.push(`AVIF test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test createTIFFBuffer method
 */
async function testCreateTIFFBuffer() {
  console.log("\n📄 Testing createTIFFBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    // 测试 1：基本 TIFF 创建
    console.log("  • Basic TIFF creation...");
    const basicResult = await processor.createTIFFBuffer();
    const basicErrors = validateBufferResult(basicResult, "Basic TIFF");
    errors.push(...basicErrors);

    if (basicErrors.length === 0) {
      console.log(`    ✅ Success: ${basicResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_basic.tiff"),
        basicResult.buffer
      );
    }

    // 测试 2：LZW 压缩 TIFF
    console.log("  • LZW compressed TIFF...");
    const lzwResult = await processor.createTIFFBuffer({
      compression: "lzw",
      width: 1200,
    });
    const lzwErrors = validateBufferResult(lzwResult, "LZW TIFF");
    errors.push(...lzwErrors);

    if (lzwErrors.length === 0) {
      console.log(`    ✅ Success: ${lzwResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_lzw.tiff"),
        lzwResult.buffer
      );
    }

    // 测试 3：未压缩 TIFF
    console.log("  • Uncompressed TIFF...");
    const uncompressedResult = await processor.createTIFFBuffer({
      compression: "none",
      width: 800,
    });
    const uncompressedErrors = validateBufferResult(
      uncompressedResult,
      "Uncompressed TIFF"
    );
    errors.push(...uncompressedErrors);

    if (uncompressedErrors.length === 0) {
      console.log(`    ✅ Success: ${uncompressedResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_uncompressed.tiff"),
        uncompressedResult.buffer
      );
    }

    // Test 4: ZIP compressed TIFF
    console.log("  • ZIP compressed TIFF...");
    const zipResult = await processor.createTIFFBuffer({
      compression: "zip",
      width: 1000,
    });
    const zipErrors = validateBufferResult(zipResult, "ZIP TIFF");
    errors.push(...zipErrors);

    if (zipErrors.length === 0) {
      console.log(`    ✅ Success: ${zipResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_zip.tiff"),
        zipResult.buffer
      );
    }
  } catch (error) {
    errors.push(`TIFF test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test createPPMBuffer method
 */
async function testCreatePPMBuffer() {
  console.log("\n📋 Testing createPPMBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    // Test PPM creation
    console.log("  • PPM buffer creation...");
    const ppmResult = await processor.createPPMBuffer();
    const ppmErrors = validateBufferResult(ppmResult, "PPM");
    errors.push(...ppmErrors);

    if (ppmErrors.length === 0) {
      console.log(`    ✅ Success: ${ppmResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_basic.ppm"),
        ppmResult.buffer
      );

      // Verify PPM header
      const headerCheck = ppmResult.buffer.toString("ascii", 0, 10);
      if (headerCheck.startsWith("P6")) {
        console.log("    ✅ PPM header verified (P6 format)");
      } else {
        errors.push("PPM header validation failed");
        console.log(`    ⚠️ Unexpected PPM header: ${headerCheck}`);
      }
    }
  } catch (error) {
    errors.push(`PPM test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test createThumbnailJPEGBuffer method
 */
async function testCreateThumbnailJPEGBuffer() {
  console.log("\n🔍 Testing createThumbnailJPEGBuffer()");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);

    // Test 1: Basic thumbnail creation
    console.log("  • Basic thumbnail creation...");
    const basicResult = await processor.createThumbnailJPEGBuffer();
    const basicErrors = validateBufferResult(basicResult, "Basic Thumbnail");
    errors.push(...basicErrors);

    if (basicErrors.length === 0) {
      console.log(`    ✅ Success: ${basicResult.buffer.length} bytes`);
      console.log(
        `    📐 Dimensions: ${basicResult.metadata.outputDimensions.width}x${basicResult.metadata.outputDimensions.height}`
      );
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_thumb_basic.jpg"),
        basicResult.buffer
      );
    }

    // Test 2: Constrained thumbnail
    console.log("  • Constrained thumbnail (maxSize: 200)...");
    const constrainedResult = await processor.createThumbnailJPEGBuffer({
      maxSize: 200,
      quality: 80,
    });
    const constrainedErrors = validateBufferResult(
      constrainedResult,
      "Constrained Thumbnail"
    );
    errors.push(...constrainedErrors);

    if (constrainedErrors.length === 0) {
      console.log(`    ✅ Success: ${constrainedResult.buffer.length} bytes`);
      console.log(
        `    📐 Dimensions: ${constrainedResult.metadata.outputDimensions.width}x${constrainedResult.metadata.outputDimensions.height}`
      );
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_thumb_200.jpg"),
        constrainedResult.buffer
      );

      // Verify size constraint
      const maxDim = Math.max(
        constrainedResult.metadata.outputDimensions.width,
        constrainedResult.metadata.outputDimensions.height
      );
      if (maxDim > 200) {
        errors.push(
          `Thumbnail size constraint violated: max dimension ${maxDim} > 200`
        );
      } else {
        console.log("    ✅ Size constraint verified");
      }
    }

    // Test 3: High quality thumbnail
    console.log("  • High quality thumbnail (quality: 95)...");
    const hqResult = await processor.createThumbnailJPEGBuffer({
      quality: 95,
      maxSize: 400,
    });
    const hqErrors = validateBufferResult(hqResult, "High Quality Thumbnail");
    errors.push(...hqErrors);

    if (hqErrors.length === 0) {
      console.log(`    ✅ Success: ${hqResult.buffer.length} bytes`);
      fs.writeFileSync(
        path.join(TEST_CONFIG.outputDir, "test_thumb_hq.jpg"),
        hqResult.buffer
      );
    }
  } catch (error) {
    errors.push(`Thumbnail test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test parallel buffer creation
 */
async function testParallelBufferCreation() {
  console.log("\n🔄 Testing Parallel Buffer Creation");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    console.log("  • Creating multiple formats in parallel...");
    const startTime = Date.now();

    const [jpegResult, webpResult, pngResult, thumbResult] = await Promise.all([
      processor.createJPEGBuffer({ quality: 85, width: 1200 }),
      processor.createWebPBuffer({ quality: 80, width: 1200 }),
      processor.createPNGBuffer({ width: 800, compressionLevel: 6 }),
      processor.createThumbnailJPEGBuffer({ maxSize: 300 }),
    ]);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`    ⏱️ Parallel creation took: ${totalTime}ms`);

    // Validate each result
    const formatResults = [
      { name: "JPEG", result: jpegResult, filename: "parallel_test.jpg" },
      { name: "WebP", result: webpResult, filename: "parallel_test.webp" },
      { name: "PNG", result: pngResult, filename: "parallel_test.png" },
      {
        name: "Thumbnail",
        result: thumbResult,
        filename: "parallel_thumb.jpg",
      },
    ];

    let successCount = 0;

    for (const format of formatResults) {
      const formatErrors = validateBufferResult(format.result, format.name);
      if (formatErrors.length === 0) {
        successCount++;
        console.log(
          `    ✅ ${format.name}: ${format.result.buffer.length} bytes`
        );
        fs.writeFileSync(
          path.join(TEST_CONFIG.outputDir, format.filename),
          format.result.buffer
        );
      } else {
        errors.push(...formatErrors);
        console.log(`    ❌ ${format.name} failed validation`);
      }
    }

    console.log(
      `    📊 Success rate: ${successCount}/${formatResults.length} formats`
    );

    if (successCount === formatResults.length) {
      console.log("    ✅ All parallel operations successful");
    } else {
      errors.push(
        `Parallel creation failed for ${
          formatResults.length - successCount
        } formats`
      );
    }
  } catch (error) {
    errors.push(`Parallel test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test buffer creation performance
 */
async function testBufferCreationPerformance() {
  console.log("\n⚡ Testing Buffer Creation Performance");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    await processor.processImage();

    const performanceTests = [
      {
        name: "JPEG (quality: 85)",
        method: () => processor.createJPEGBuffer({ quality: 85, width: 1600 }),
      },
      {
        name: "WebP (quality: 80)",
        method: () => processor.createWebPBuffer({ quality: 80, width: 1600 }),
      },
      {
        name: "PNG (compression: 6)",
        method: () =>
          processor.createPNGBuffer({ width: 1000, compressionLevel: 6 }),
      },
      {
        name: "AVIF (quality: 50)",
        method: () => processor.createAVIFBuffer({ quality: 50, width: 1200 }),
      },
      {
        name: "TIFF (LZW)",
        method: () =>
          processor.createTIFFBuffer({ compression: "lzw", width: 1200 }),
      },
      {
        name: "Thumbnail",
        method: () => processor.createThumbnailJPEGBuffer({ maxSize: 300 }),
      },
    ];

    const results = [];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const result = await test.method();
        const endTime = Date.now();

        const timeMs = endTime - startTime;
        const sizeKB = (result.buffer.length / 1024).toFixed(1);
        const throughputMBps =
          result.buffer.length / 1024 / 1024 / (timeMs / 1000);

        results.push({
          name: test.name,
          timeMs,
          sizeKB,
          throughputMBps: throughputMBps.toFixed(2),
        });

        console.log(
          `    ${test.name}: ${timeMs}ms, ${sizeKB}KB, ${throughputMBps.toFixed(
            2
          )} MB/s`
        );
      } catch (error) {
        console.log(`    ❌ ${test.name} failed: ${error.message}`);
        errors.push(
          `Performance test failed for ${test.name}: ${error.message}`
        );
      }
    }

    // Find fastest and slowest
    if (results.length > 0) {
      const fastest = results.reduce((min, current) =>
        current.timeMs < min.timeMs ? current : min
      );
      const slowest = results.reduce((max, current) =>
        current.timeMs > max.timeMs ? current : max
      );

      console.log(`    🏆 Fastest: ${fastest.name} (${fastest.timeMs}ms)`);
      console.log(`    🐌 Slowest: ${slowest.name} (${slowest.timeMs}ms)`);
    }
  } catch (error) {
    errors.push(`Performance test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Test error handling and edge cases
 */
async function testErrorHandling() {
  console.log("\n🛡️ Testing Error Handling");
  console.log("-".repeat(50));

  const processor = new LibRaw();
  const testFile = findTestFile();
  const errors = [];

  try {
    await processor.loadFile(testFile);
    // Note: NOT processing the image to test error conditions

    // Test 1: Buffer creation without processing
    console.log("  • Buffer creation without processing...");
    try {
      await processor.createJPEGBuffer();
      console.log("    ⚠️ Expected error but succeeded");
      errors.push("Buffer creation should fail without processing");
    } catch (error) {
      console.log("    ✅ Correctly failed without processing");
    }

    // Process image for remaining tests
    await processor.processImage();

    // Test 2: Invalid quality values
    console.log("  • Invalid quality values...");
    const invalidQualities = [-1, 0, 101, 1000, "invalid"];

    for (const quality of invalidQualities) {
      try {
        await processor.createJPEGBuffer({ quality });
        console.log(`    ⚠️ Quality ${quality} should have been rejected`);
      } catch (error) {
        console.log(`    ✅ Quality ${quality} correctly rejected`);
      }
    }

    // Test 3: Invalid dimensions
    console.log("  • Invalid dimensions...");
    const invalidDimensions = [
      { width: -100 },
      { height: -100 },
      { width: 0 },
      { height: 0 },
      { width: 100000 }, // Very large
      { height: 100000 },
    ];

    for (const dims of invalidDimensions) {
      try {
        await processor.createJPEGBuffer(dims);
        console.log(
          `    ⚠️ Dimensions ${JSON.stringify(dims)} should have been rejected`
        );
      } catch (error) {
        console.log(
          `    ✅ Dimensions ${JSON.stringify(dims)} correctly rejected`
        );
      }
    }

    // Test 4: Invalid compression levels
    console.log("  • Invalid PNG compression levels...");
    const invalidCompressions = [-1, 10, "invalid"];

    for (const level of invalidCompressions) {
      try {
        await processor.createPNGBuffer({ compressionLevel: level });
        console.log(
          `    ⚠️ Compression level ${level} should have been rejected`
        );
      } catch (error) {
        console.log(`    ✅ Compression level ${level} correctly rejected`);
      }
    }

    // Test 5: Invalid TIFF compression types
    console.log("  • Invalid TIFF compression types...");
    const invalidTIFFCompressions = ["invalid", "gzip", 123];

    for (const compression of invalidTIFFCompressions) {
      try {
        await processor.createTIFFBuffer({ compression });
        console.log(
          `    ⚠️ TIFF compression ${compression} should have been rejected`
        );
      } catch (error) {
        console.log(
          `    ✅ TIFF compression ${compression} correctly rejected`
        );
      }
    }
  } catch (error) {
    errors.push(`Error handling test setup failed: ${error.message}`);
    console.log(`    ❌ Test failed: ${error.message}`);
  } finally {
    await processor.close();
  }

  return errors;
}

/**
 * Main test runner
 */
async function runAllBufferCreationTests() {
  console.log("🧪 LibRaw Buffer Creation Tests");
  console.log("=".repeat(60));

  const testFile = findTestFile();
  console.log(`📁 Using test file: ${path.basename(testFile)}`);
  console.log(`📂 Output directory: ${TEST_CONFIG.outputDir}`);

  const allErrors = [];
  const tests = [
    { name: "JPEG Buffer", fn: testCreateJPEGBuffer },
    { name: "PNG Buffer", fn: testCreatePNGBuffer },
    { name: "WebP Buffer", fn: testCreateWebPBuffer },
    { name: "AVIF Buffer", fn: testCreateAVIFBuffer },
    { name: "TIFF Buffer", fn: testCreateTIFFBuffer },
    { name: "PPM Buffer", fn: testCreatePPMBuffer },
    { name: "Thumbnail Buffer", fn: testCreateThumbnailJPEGBuffer },
    { name: "Parallel Creation", fn: testParallelBufferCreation },
    { name: "Performance", fn: testBufferCreationPerformance },
    { name: "Error Handling", fn: testErrorHandling },
  ];

  let passedTests = 0;
  const startTime = Date.now();

  for (const test of tests) {
    try {
      const errors = await test.fn();
      if (errors.length === 0) {
        passedTests++;
        console.log(`✅ ${test.name} - PASSED`);
      } else {
        console.log(`❌ ${test.name} - FAILED (${errors.length} errors)`);
        errors.forEach((error) => console.log(`   • ${error}`));
      }
      allErrors.push(...errors);
    } catch (error) {
      console.log(`💥 ${test.name} - CRASHED: ${error.message}`);
      allErrors.push(`${test.name} crashed: ${error.message}`);
    }
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log("\n📊 Test Summary");
  console.log("=".repeat(60));
  console.log(`Tests passed: ${passedTests}/${tests.length}`);
  console.log(`Total errors: ${allErrors.length}`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Output files saved to: ${TEST_CONFIG.outputDir}`);

  if (allErrors.length === 0) {
    console.log("\n🎉 All buffer creation tests passed!");
    return true;
  } else {
    console.log("\n❌ Some tests failed. Errors:");
    allErrors.forEach((error) => console.log(`  • ${error}`));
    return false;
  }
}

// Export for use in other test files
module.exports = {
  runAllBufferCreationTests,
  testCreateJPEGBuffer,
  testCreatePNGBuffer,
  testCreateWebPBuffer,
  testCreateAVIFBuffer,
  testCreateTIFFBuffer,
  testCreatePPMBuffer,
  testCreateThumbnailJPEGBuffer,
  testParallelBufferCreation,
  testBufferCreationPerformance,
  testErrorHandling,
  findTestFile,
  validateBufferResult,
  TEST_CONFIG,
};

// Run tests if called directly
if (require.main === module) {
  runAllBufferCreationTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test runner crashed:", error);
      process.exit(1);
    });
}
