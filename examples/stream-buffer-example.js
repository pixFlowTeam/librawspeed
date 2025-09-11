const LibRaw = require("../lib/index");
const fs = require("fs");

/**
 * 流/缓冲区操作示例
 *
 * 此示例演示了新的缓冲区/流 API，它直接返回数据
 * 而不是写入文件。这在您想要以下操作时很有用：
 * - 在内存中处理图像而无需文件系统 I/O
 * - 直接将图像发送到 HTTP 响应
 * - 将处理后的图像上传到云存储
 * - 构建图像处理管道
 */

async function streamBufferExample(inputFile, outputDir) {
  console.log("🚀 LibRaw 流/缓冲区操作示例");
  console.log("==========================================");
  console.log(`📁 输入: ${inputFile}`);
  console.log(`📂 输出目录: ${outputDir}`);

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const processor = new LibRaw();
  const startTime = Date.now();

  try {
    // ============== 步骤 1：加载和处理 RAW ==============
    console.log("\n🔄 加载 RAW 图像...");
    await processor.loadFile(inputFile);

    console.log("⚙️ 处理 RAW 数据...");
    await processor.processImage();

    console.log("✅ RAW 处理完成");

    // ============== 步骤 2：创建不同格式的缓冲区 ==============
    console.log("\n🎨 创建不同格式的图像缓冲区...");

    // 创建 JPEG 缓冲区（最常见用例）
    console.log("📸 创建 JPEG 缓冲区...");
    const jpegResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920, // 调整到 Web 分辨率
      progressive: true,
    });
    console.log(`   ✅ JPEG 缓冲区已创建: ${jpegResult.buffer.length} 字节`);
    console.log(
      `   📐 尺寸: ${jpegResult.metadata.outputDimensions.width}x${jpegResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${jpegResult.metadata.processing.timeMs}ms`
    );

    // 创建 PNG 缓冲区（无损）
    console.log("🖼️ 创建 PNG 缓冲区...");
    const pngResult = await processor.createPNGBuffer({
      width: 800, // PNG 使用较小尺寸
      compressionLevel: 6,
    });
    console.log(`   ✅ PNG 缓冲区已创建: ${pngResult.buffer.length} 字节`);
    console.log(
      `   📐 尺寸: ${pngResult.metadata.outputDimensions.width}x${pngResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${pngResult.metadata.processing.timeMs}ms`
    );

    // 创建 WebP 缓冲区（现代格式）
    console.log("🌐 创建 WebP 缓冲区...");
    const webpResult = await processor.createWebPBuffer({
      quality: 80,
      width: 1200,
      effort: 4,
    });
    console.log(`   ✅ WebP 缓冲区已创建: ${webpResult.buffer.length} 字节`);
    console.log(
      `   📐 尺寸: ${webpResult.metadata.outputDimensions.width}x${webpResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${webpResult.metadata.processing.timeMs}ms`
    );

    // 创建 AVIF 缓冲区（下一代格式）
    console.log("🚀 创建 AVIF 缓冲区...");
    const avifResult = await processor.createAVIFBuffer({
      quality: 50,
      width: 1200,
      effort: 4,
    });
    console.log(`   ✅ AVIF 缓冲区已创建: ${avifResult.buffer.length} 字节`);
    console.log(
      `   📐 尺寸: ${avifResult.metadata.outputDimensions.width}x${avifResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${avifResult.metadata.processing.timeMs}ms`
    );

    // 创建 TIFF 缓冲区（存档）
    console.log("📄 创建 TIFF 缓冲区...");
    const tiffResult = await processor.createTIFFBuffer({
      compression: "lzw",
      width: 2400,
    });
    console.log(`   ✅ TIFF 缓冲区已创建: ${tiffResult.buffer.length} 字节`);
    console.log(
      `   📐 尺寸: ${tiffResult.metadata.outputDimensions.width}x${tiffResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${tiffResult.metadata.processing.timeMs}ms`
    );

    // 创建缩略图 JPEG 缓冲区
    console.log("🔍 创建缩略图 JPEG 缓冲区...");
    const thumbResult = await processor.createThumbnailJPEGBuffer({
      quality: 85,
      maxSize: 300,
    });
    console.log(
      `   ✅ 缩略图缓冲区已创建: ${thumbResult.buffer.length} 字节`
    );
    console.log(
      `   📐 尺寸: ${thumbResult.metadata.outputDimensions.width}x${thumbResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${thumbResult.metadata.processing.timeMs}ms`
    );

    // 创建原始 PPM 缓冲区
    console.log("📋 创建 PPM 缓冲区...");
    const ppmResult = await processor.createPPMBuffer();
    console.log(`   ✅ PPM 缓冲区已创建: ${ppmResult.buffer.length} 字节`);
    console.log(
      `   📐 尺寸: ${ppmResult.metadata.dimensions.width}x${ppmResult.metadata.dimensions.height}`
    );
    console.log(
      `   ⏱️ 处理时间: ${ppmResult.metadata.processing.timeMs}ms`
    );

    // ============== 步骤 3：将缓冲区保存到文件（可选）==============
    console.log("\n💾 将缓冲区保存到文件进行演示...");

    const baseName = inputFile.split(/[/\\]/).pop().split(".")[0];

    fs.writeFileSync(`${outputDir}/${baseName}_buffer.jpg`, jpegResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.png`, pngResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.webp`, webpResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.avif`, avifResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.tiff`, tiffResult.buffer);
    fs.writeFileSync(
      `${outputDir}/${baseName}_thumb_buffer.jpg`,
      thumbResult.buffer
    );
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.ppm`, ppmResult.buffer);

    console.log("✅ 所有缓冲区已保存到文件");

    // ============== 步骤 4：演示实际用例 ==============
    console.log("\n🔧 实际用例示例:");

    // 示例 1：HTTP 响应（Express.js 风格）
    console.log("\n📡 示例 1：HTTP 响应");
    console.log("```javascript");
    console.log('app.get("/image/:id", async (req, res) => {');
    console.log("    const processor = new LibRaw();");
    console.log(
      "    await processor.loadFile(`/photos/${req.params.id}.raw`);"
    );
    console.log(
      "    const result = await processor.createJPEGBuffer({ quality: 85, width: 1920 });"
    );
    console.log('    res.set("Content-Type", "image/jpeg");');
    console.log("    res.send(result.buffer);");
    console.log("});");
    console.log("```");

    // 示例 2：云存储上传
    console.log("\n☁️ 示例 2：云存储上传");
    console.log("```javascript");
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 90 });"
    );
    console.log("await cloudStorage.upload({");
    console.log('    fileName: "processed-image.jpg",');
    console.log("    buffer: result.buffer,");
    console.log('    contentType: "image/jpeg"');
    console.log("});");
    console.log("```");

    // 示例 3：图像处理管道
    console.log("\n🔄 示例 3：处理管道");
    console.log("```javascript");
    console.log("// 为响应式图像创建多种尺寸");
    console.log("const sizes = [");
    console.log('    { name: "large", width: 1920 },');
    console.log('    { name: "medium", width: 1200 },');
    console.log('    { name: "small", width: 800 },');
    console.log('    { name: "thumb", width: 300 }');
    console.log("];");
    console.log("");
    console.log("const results = await Promise.all(");
    console.log("    sizes.map(size => processor.createJPEGBuffer({");
    console.log("        width: size.width,");
    console.log("        quality: 85");
    console.log("    }))");
    console.log(");");
    console.log("```");

    // ============== 步骤 5：性能汇总 ==============
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log("\n📊 性能汇总:");
    console.log(`   ⏱️ 总处理时间: ${totalTime}ms`);

    const formats = [
      { name: "JPEG", result: jpegResult },
      { name: "PNG", result: pngResult },
      { name: "WebP", result: webpResult },
      { name: "AVIF", result: avifResult },
      { name: "TIFF", result: tiffResult },
      { name: "缩略图", result: thumbResult },
      { name: "PPM", result: ppmResult },
    ];

    formats.forEach(({ name, result }) => {
      const compressionRatio =
        result.metadata.fileSize.compressionRatio || "N/A";
      console.log(
        `   📸 ${name}: ${result.buffer.length} 字节 (比率: ${compressionRatio})`
      );
    });

    // 大小比较
    const sizes = formats.map((f) => f.result.buffer.length);
    const smallest = Math.min(...sizes);
    const largest = Math.max(...sizes);
    console.log(`   📏 大小范围: ${smallest} - ${largest} 字节`);
    console.log(
      `   📈 压缩效率: AVIF < WebP < JPEG < PNG < TIFF < PPM`
    );

    // ============== 清理 ==============
    console.log("\n🧹 清理中...");
    await processor.close();

    console.log("\n✅ 流/缓冲区示例完成！");
    console.log("\n💡 主要优势:");
    console.log("   • 无需文件系统 I/O");
    console.log("   • 直接内存到内存处理");
    console.log("   • 完美适用于 Web 服务和 API");
    console.log("   • 支持流式和实时处理");
    console.log("   • 减少磁盘空间使用");
    console.log("   • 云部署更快");
  } catch (error) {
    console.error("\n❌ 错误:", error.message);
    console.error("\n请确保您有:");
    console.error("1. 已构建插件: npm run build");
    console.error("2. 提供了有效的 RAW 文件路径");
    console.error("3. RAW 文件可访问且未损坏");
    console.error("4. 已安装 Sharp: npm install sharp");
  }
}

// 使用说明
if (process.argv.length < 3) {
  console.log(
    "用法: node stream-buffer-example.js <RAW文件路径> [输出目录]"
  );
  console.log(
    "示例: node stream-buffer-example.js C:\\photos\\IMG_1234.CR2 ./output"
  );
  process.exit(1);
}

const inputFile = process.argv[2];
const outputDir = process.argv[3] || "./buffer-output";

streamBufferExample(inputFile, outputDir);
