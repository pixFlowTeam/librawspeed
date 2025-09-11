const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 演示缓冲区创建方法的演示测试
 * 这既是测试也是文档示例
 */

async function demonstrateBufferMethods() {
  console.log("🎨 LibRaw 缓冲区方法演示");
  console.log("=".repeat(50));

  const processor = new LibRaw();
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  const outputDir = path.join(__dirname, "demo-output");

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // 查找测试文件
    const files = fs.readdirSync(sampleImagesDir);
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".raf",
      ".rw2",
      ".dng",
    ];
    const testFile = files.find((file) => {
      const ext = path.extname(file).toLowerCase();
      return rawExtensions.includes(ext);
    });

    if (!testFile) {
      throw new Error("未找到 RAW 测试文件");
    }

    const fullPath = path.join(sampleImagesDir, testFile);
    console.log(`📁 处理: ${testFile}`);

    // 加载并处理 RAW 文件
    await processor.loadFile(fullPath);
    console.log("✅ 文件加载成功");

    await processor.processImage();
    console.log("✅ 图像处理成功");

    // 演示各种缓冲区方法
    console.log("\n📸 创建不同格式的缓冲区...");

    // 1. JPEG 缓冲区
    console.log("  • 创建 JPEG 缓冲区...");
    const jpegResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 1200,
    });
    if (jpegResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.jpg"), jpegResult.buffer);
      console.log(
        `    ✅ JPEG: ${(jpegResult.buffer.length / 1024).toFixed(1)}KB, ${
          jpegResult.metadata.outputDimensions.width
        }x${jpegResult.metadata.outputDimensions.height}`
      );
    }

    // 2. PNG 缓冲区
    console.log("  • 创建 PNG 缓冲区...");
    const pngResult = await processor.createPNGBuffer({
      width: 800,
      compressionLevel: 6,
    });
    if (pngResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.png"), pngResult.buffer);
      console.log(
        `    ✅ PNG: ${(pngResult.buffer.length / 1024).toFixed(1)}KB, ${
          pngResult.metadata.outputDimensions.width
        }x${pngResult.metadata.outputDimensions.height}`
      );
    }

    // 3. WebP 缓冲区
    console.log("  • 创建 WebP 缓冲区...");
    const webpResult = await processor.createWebPBuffer({
      quality: 80,
      width: 1000,
    });
    if (webpResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.webp"), webpResult.buffer);
      console.log(
        `    ✅ WebP: ${(webpResult.buffer.length / 1024).toFixed(1)}KB, ${
          webpResult.metadata.outputDimensions.width
        }x${webpResult.metadata.outputDimensions.height}`
      );
    }

    // 4. AVIF 缓冲区（下一代格式）
    console.log("  • 创建 AVIF 缓冲区...");
    try {
      const avifResult = await processor.createAVIFBuffer({
        quality: 50,
        width: 800,
      });
      if (avifResult.success) {
        fs.writeFileSync(path.join(outputDir, "demo.avif"), avifResult.buffer);
        console.log(
          `    ✅ AVIF: ${(avifResult.buffer.length / 1024).toFixed(1)}KB, ${
            avifResult.metadata.outputDimensions.width
          }x${avifResult.metadata.outputDimensions.height}`
        );
      }
    } catch (error) {
      console.log(`    ⚠️ AVIF 不受支持: ${error.message}`);
    }

    // 5. TIFF 缓冲区
    console.log("  • 创建 TIFF 缓冲区...");
    const tiffResult = await processor.createTIFFBuffer({
      compression: "lzw",
      width: 600,
    });
    if (tiffResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.tiff"), tiffResult.buffer);
      console.log(
        `    ✅ TIFF: ${(tiffResult.buffer.length / 1024).toFixed(1)}KB, ${
          tiffResult.metadata.outputDimensions.width
        }x${tiffResult.metadata.outputDimensions.height}`
      );
    }

    // 6. PPM 缓冲区（原始格式）
    console.log("  • 创建 PPM 缓冲区...");
    try {
      const ppmResult = await processor.createPPMBuffer();
      if (ppmResult.success) {
        fs.writeFileSync(path.join(outputDir, "demo.ppm"), ppmResult.buffer);
        console.log(
          `    ✅ PPM: ${(ppmResult.buffer.length / 1024).toFixed(1)}KB, ${
            ppmResult.metadata.dimensions.width
          }x${ppmResult.metadata.dimensions.height}`
        );
      }
    } catch (error) {
      console.log(`    ⚠️ PPM creation failed: ${error.message}`);
    }

    // 7. Thumbnail JPEG (doesn't require full processing)
    console.log("  • Creating thumbnail buffer...");
    const processor2 = new LibRaw();
    await processor2.loadFile(fullPath);
    const thumbResult = await processor2.createThumbnailJPEGBuffer({
      maxSize: 300,
      quality: 90,
    });
    if (thumbResult.success) {
      fs.writeFileSync(
        path.join(outputDir, "demo_thumb.jpg"),
        thumbResult.buffer
      );
      console.log(
        `    ✅ Thumbnail: ${(thumbResult.buffer.length / 1024).toFixed(
          1
        )}KB, ${thumbResult.metadata.outputDimensions.width}x${
          thumbResult.metadata.outputDimensions.height
        }`
      );
    }
    await processor2.close();

    // 并行创建演示
    console.log("\n🔄 并行创建多种格式...");
    const startTime = Date.now();

    const [parallelJpeg, parallelPng, parallelWebp] = await Promise.all([
      processor.createJPEGBuffer({ quality: 75, width: 400 }),
      processor.createPNGBuffer({ width: 400, compressionLevel: 3 }),
      processor.createWebPBuffer({ quality: 70, width: 400 }),
    ]);

    const endTime = Date.now();
    console.log(`    ⚡ 并行创建耗时: ${endTime - startTime}ms`);

    if (parallelJpeg.success && parallelPng.success && parallelWebp.success) {
      fs.writeFileSync(
        path.join(outputDir, "parallel.jpg"),
        parallelJpeg.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "parallel.png"),
        parallelPng.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "parallel.webp"),
        parallelWebp.buffer
      );

      console.log(
        `    ✅ JPEG: ${(parallelJpeg.buffer.length / 1024).toFixed(1)}KB`
      );
      console.log(
        `    ✅ PNG: ${(parallelPng.buffer.length / 1024).toFixed(1)}KB`
      );
      console.log(
        `    ✅ WebP: ${(parallelWebp.buffer.length / 1024).toFixed(1)}KB`
      );
    }

    console.log(`\n🎉 演示成功完成！`);
    console.log(`📂 输出文件已保存到: ${outputDir}`);

    // 列出输出文件
    const outputFiles = fs.readdirSync(outputDir);
    console.log(`📋 生成了 ${outputFiles.length} 个文件:`);
    outputFiles.forEach((file) => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });
  } catch (error) {
    console.error(`❌ 演示失败: ${error.message}`);
    console.error(error.stack);
  } finally {
    await processor.close();
  }
}

// Run demo if called directly
if (require.main === module) {
  demonstrateBufferMethods().catch(console.error);
}

module.exports = { demonstrateBufferMethods };
