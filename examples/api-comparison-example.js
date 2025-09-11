const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");

/**
 * API 比较：基于文件 vs 基于缓冲区
 *
 * 此示例演示了传统基于文件的 API 和新的基于缓冲区的 API 之间的差异，
 * 突出了每种方法的优势。
 */

async function apiComparisonExample(inputFile, outputDir) {
  console.log("🔄 API 比较：文件 vs 缓冲区操作");
  console.log("============================================");
  console.log(`📁 输入: ${inputFile}`);
  console.log(`📂 输出目录: ${outputDir}\n`);

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const processor = new LibRaw();
  const baseName = path.basename(inputFile, path.extname(inputFile));

  try {
    // 加载 RAW 文件一次
    console.log("🔄 加载 RAW 文件...");
    await processor.loadFile(inputFile);
    console.log("✅ RAW 文件已加载\n");

    // ============== 旧方式：基于文件的 API ==============
    console.log("📁 旧方式：基于文件的操作");
    console.log("==================================");

    const fileStartTime = Date.now();

    // 传统方法：处理并写入文件
    console.log("1️⃣ 处理图像...");
    await processor.processImage();

    console.log("2️⃣ 写入 TIFF 文件...");
    const tiffPath = path.join(outputDir, `${baseName}_traditional.tiff`);
    await processor.writeTIFF(tiffPath);

    console.log("3️⃣ 写入 PPM 文件...");
    const ppmPath = path.join(outputDir, `${baseName}_traditional.ppm`);
    await processor.writePPM(ppmPath);

    console.log("4️⃣ 写入缩略图...");
    const thumbPath = path.join(outputDir, `${baseName}_traditional_thumb.jpg`);
    await processor.writeThumbnail(thumbPath);

    // 传统 JPEG 转换
    console.log("5️⃣ 转换为 JPEG...");
    const jpegPath = path.join(outputDir, `${baseName}_traditional.jpg`);
    await processor.convertToJPEG(jpegPath, {
      quality: 85,
      width: 1920,
    });

    const fileEndTime = Date.now();
    const fileProcessingTime = fileEndTime - fileStartTime;

    console.log(`✅ 基于文件的处理完成，用时 ${fileProcessingTime}ms`);

    // 检查文件大小
    const fileSizes = {
      tiff: fs.statSync(tiffPath).size,
      ppm: fs.statSync(ppmPath).size,
      thumb: fs.statSync(thumbPath).size,
      jpeg: fs.statSync(jpegPath).size,
    };

    console.log("📊 文件大小:");
    Object.entries(fileSizes).forEach(([format, size]) => {
      console.log(
        `   ${format.toUpperCase()}: ${(size / 1024 / 1024).toFixed(2)} MB`
      );
    });

    // ============== 新方式：基于缓冲区的 API ==============
    console.log("\n🚀 新方式：基于缓冲区的操作");
    console.log("===================================");

    const bufferStartTime = Date.now();

    // 现代方法：在内存中创建缓冲区
    console.log("1️⃣ 创建 TIFF 缓冲区...");
    const tiffBuffer = await processor.createTIFFBuffer({
      compression: "lzw",
    });

    console.log("2️⃣ 创建 PPM 缓冲区...");
    const ppmBuffer = await processor.createPPMBuffer();

    console.log("3️⃣ 创建缩略图缓冲区...");
    const thumbBuffer = await processor.createThumbnailJPEGBuffer({
      quality: 85,
    });

    console.log("4️⃣ 创建 JPEG 缓冲区...");
    const jpegBuffer = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920,
    });

    // 额外：并行创建多种格式
    console.log("5️⃣ 并行创建其他格式...");
    const [webpBuffer, avifBuffer, pngBuffer] = await Promise.all([
      processor.createWebPBuffer({ quality: 80, width: 1920 }),
      processor.createAVIFBuffer({ quality: 50, width: 1920 }),
      processor.createPNGBuffer({ width: 800, compressionLevel: 6 }),
    ]);

    const bufferEndTime = Date.now();
    const bufferProcessingTime = bufferEndTime - bufferStartTime;

    console.log(
      `✅ 基于缓冲区的处理完成，用时 ${bufferProcessingTime}ms`
    );

    // 将缓冲区保存到文件进行比较（可选步骤）
    console.log("6️⃣ 将缓冲区保存到文件进行比较...");
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.tiff`),
      tiffBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.ppm`),
      ppmBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer_thumb.jpg`),
      thumbBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.jpg`),
      jpegBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.webp`),
      webpBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.avif`),
      avifBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.png`),
      pngBuffer.buffer
    );

    console.log("📊 缓冲区大小:");
    const buffers = {
      TIFF: tiffBuffer.buffer,
      PPM: ppmBuffer.buffer,
      Thumbnail: thumbBuffer.buffer,
      JPEG: jpegBuffer.buffer,
      WebP: webpBuffer.buffer,
      AVIF: avifBuffer.buffer,
      PNG: pngBuffer.buffer,
    };

    Object.entries(buffers).forEach(([format, buffer]) => {
      console.log(
        `   ${format}: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
      );
    });

    // ============== 性能比较 ==============
    console.log("\n⚡ 性能比较");
    console.log("========================");
    console.log(`📁 基于文件的方法: ${fileProcessingTime}ms`);
    console.log(`🚀 基于缓冲区的方法: ${bufferProcessingTime}ms`);

    const speedImprovement =
      ((fileProcessingTime - bufferProcessingTime) / fileProcessingTime) * 100;
    if (speedImprovement > 0) {
      console.log(
        `🏆 缓冲区方法快 ${speedImprovement.toFixed(1)}%！`
      );
    } else {
      console.log(
        `📊 性能差异: ${Math.abs(speedImprovement).toFixed(1)}%`
      );
    }

    // ============== 使用案例建议 ==============
    console.log("\n💡 何时使用每种方法");
    console.log("=============================");

    console.log("\n📁 使用基于文件的 API 当:");
    console.log("   • 您需要将最终图像保存到磁盘");
    console.log("   • 处理大图像（内存限制）");
    console.log("   • 构建传统桌面应用程序");
    console.log("   • 创建永久存档");
    console.log("   • 与基于文件的工作流程集成");

    console.log("\n🚀 使用基于缓冲区的 API 当:");
    console.log("   • 构建 Web 服务和 API");
    console.log("   • 上传到云存储");
    console.log("   • 创建图像处理管道");
    console.log("   • 实时图像处理");
    console.log("   • 无服务器/ Lambda 函数");
    console.log("   • 流式图像数据");
    console.log("   • 从单一源创建多种格式");

    // ============== 代码示例 ==============
    console.log("\n📝 代码示例");
    console.log("================");

    console.log("\n📁 基于文件的方法:");
    console.log("```javascript");
    console.log("// 传统方式");
    console.log('await processor.loadFile("input.raw");');
    console.log("await processor.processImage();");
    console.log(
      'await processor.convertToJPEG("output.jpg", { quality: 85 });'
    );
    console.log('// 文件现在在磁盘上的 "output.jpg"');
    console.log("```");

    console.log("\n🚀 基于缓冲区的方法:");
    console.log("```javascript");
    console.log("// 现代方式");
    console.log('await processor.loadFile("input.raw");');
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 85 });"
    );
    console.log("// result.buffer 包含 JPEG 数据");
    console.log("// 直接使用，无需文件 I/O");
    console.log("```");

    console.log("\n🌐 Web 服务示例:");
    console.log("```javascript");
    console.log('app.post("/convert", async (req, res) => {');
    console.log("    const processor = new LibRaw();");
    console.log("    await processor.loadBuffer(req.body);");
    console.log("    const result = await processor.createJPEGBuffer({");
    console.log("        quality: 85,");
    console.log("        width: 1920");
    console.log("    });");
    console.log('    res.set("Content-Type", "image/jpeg");');
    console.log("    res.send(result.buffer);");
    console.log("});");
    console.log("```");

    console.log("\n☁️ 云存储示例:");
    console.log("```javascript");
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 90 });"
    );
    console.log(
      'await cloudBucket.file("processed.jpg").save(result.buffer, {'
    );
    console.log("    metadata: {");
    console.log('        contentType: "image/jpeg",');
    console.log('        cacheControl: "public, max-age=31536000"');
    console.log("    }");
    console.log("});");
    console.log("```");

    // ============== FORMAT COMPARISON ==============
    console.log("\n🎨 Format Efficiency Comparison");
    console.log("===============================");

    const formats = [
      { name: "AVIF", buffer: avifBuffer.buffer, extension: ".avif" },
      { name: "WebP", buffer: webpBuffer.buffer, extension: ".webp" },
      { name: "JPEG", buffer: jpegBuffer.buffer, extension: ".jpg" },
      { name: "PNG", buffer: pngBuffer.buffer, extension: ".png" },
      { name: "TIFF", buffer: tiffBuffer.buffer, extension: ".tiff" },
    ];

    // Sort by file size (smallest first)
    formats.sort((a, b) => a.buffer.length - b.buffer.length);

    console.log("📊 Formats ranked by file size (smallest to largest):");
    formats.forEach((format, index) => {
      const sizeMB = (format.buffer.length / 1024 / 1024).toFixed(2);
      const emoji =
        index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
      console.log(`   ${emoji} ${format.name}: ${sizeMB} MB`);
    });

    // Cleanup
    await processor.close();

    console.log("\n✅ API comparison complete!");
    console.log("\n🎯 Key Takeaway: Choose the right API for your use case");
    console.log("   • File-based: Traditional workflows, disk storage");
    console.log("   • Buffer-based: Modern web services, cloud applications");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nMake sure you have:");
    console.error("1. Built the addon: npm run build");
    console.error("2. Installed Sharp: npm install sharp");
    console.error("3. Provided a valid RAW file");
  }
}

// 使用说明
if (process.argv.length < 3) {
  console.log(
    "用法: node api-comparison-example.js <raw文件路径> [输出目录]"
  );
  console.log(
    "示例: node api-comparison-example.js ../sample-images/IMG_1234.CR2 ./comparison-output"
  );
  process.exit(1);
}

const inputFile = process.argv[2];
const outputDir = process.argv[3] || "./comparison-output";

apiComparisonExample(inputFile, outputDir);
