const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function jpegConversionExample() {
  console.log("LibRaw JPEG 转换示例");
  console.log("===============================\n");

  const processor = new LibRaw();

  try {
    // 替换为您的 RAW 文件路径
    const rawFile = process.argv[2] || "sample.cr2";

    if (!fs.existsSync(rawFile)) {
      console.log("❌ 未找到 RAW 文件:", rawFile);
      console.log(
        "\n用法: node jpeg-conversion-example.js <RAW文件路径>"
      );
      console.log(
        "示例: node jpeg-conversion-example.js C:\\photos\\IMG_1234.CR2"
      );
      return;
    }

    console.log(`📁 加载 RAW 文件: ${rawFile}`);
    await processor.loadFile(rawFile);

    console.log("📊 分析图像以获得最佳设置...");
    const metadata = await processor.getMetadata();

    console.log(`\n📷 图像信息:`);
    console.log(`   相机: ${metadata.make} ${metadata.model}`);
    console.log(`   尺寸: ${metadata.width} x ${metadata.height}`);
    console.log(
      `   百万像素: ${((metadata.width * metadata.height) / 1000000).toFixed(
        1
      )}MP`
    );

    // 创建输出目录
    const outputDir = path.join(__dirname, "jpeg-examples");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(rawFile, path.extname(rawFile));

    // 示例 1：使用默认设置的基本 JPEG 转换
    console.log("\n🖼️  示例 1：基本 JPEG 转换（默认质量）");
    const basicOutput = path.join(outputDir, `${baseName}_basic.jpg`);
    const basicResult = await processor.convertToJPEG(basicOutput);
    console.log(`   ✅ 已保存: ${basicOutput}`);
    console.log(
      `   📊 大小: ${(basicResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(`   ⚡ 时间: ${basicResult.metadata.processing.timeMs}ms`);
    console.log(
      `   📉 压缩: ${basicResult.metadata.fileSize.compressionRatio}x`
    );

    // 示例 2：用于打印的高质量 JPEG
    console.log("\n🖼️  示例 2：用于打印的高质量 JPEG");
    const printOutput = path.join(outputDir, `${baseName}_print.jpg`);
    const printResult = await processor.convertToJPEG(printOutput, {
      quality: 95,
      chromaSubsampling: "4:2:2", // 更好的色度用于打印
      trellisQuantisation: true, // 更好的压缩
      optimizeCoding: true,
    });
    console.log(`   ✅ 已保存: ${printOutput}`);
    console.log(
      `   📊 大小: ${(printResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(`   ⚡ 时间: ${printResult.metadata.processing.timeMs}ms`);

    // 示例 3：Web 优化的 JPEG 带调整大小
    console.log("\n🖼️  示例 3：Web 优化的 JPEG（1920px 宽）");
    const webOutput = path.join(outputDir, `${baseName}_web.jpg`);
    const webResult = await processor.convertToJPEG(webOutput, {
      quality: 80,
      width: 1920, // 调整到 1920px 宽度
      progressive: true, // 渐进式加载
      mozjpeg: true, // 更好的压缩
      optimizeScans: true,
    });
    console.log(`   ✅ 已保存: ${webOutput}`);
    console.log(
      `   📊 大小: ${(webResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(
      `   📐 尺寸: ${webResult.metadata.outputDimensions.width}x${webResult.metadata.outputDimensions.height}`
    );
    console.log(`   ⚡ 时间: ${webResult.metadata.processing.timeMs}ms`);

    // 示例 4：缩略图创建
    console.log("\n🖼️  示例 4：缩略图创建（400x300）");
    const thumbOutput = path.join(outputDir, `${baseName}_thumb.jpg`);
    const thumbResult = await processor.convertToJPEG(thumbOutput, {
      quality: 85,
      width: 400,
      height: 300,
      chromaSubsampling: "4:2:2", // 小图像更好的质量
    });
    console.log(`   ✅ 已保存: ${thumbOutput}`);
    console.log(
      `   📊 大小: ${(thumbResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(
      `   📐 尺寸: ${thumbResult.metadata.outputDimensions.width}x${thumbResult.metadata.outputDimensions.height}`
    );

    // 示例 5：获取最佳设置建议
    console.log("\n🧠 示例 5：AI 优化设置分析");
    const webSettings = await processor.getOptimalJPEGSettings({
      usage: "web",
    });
    console.log(`   🎯 Web 推荐:`);
    console.log(`      质量: ${webSettings.recommended.quality}`);
    console.log(`      渐进式: ${webSettings.recommended.progressive}`);
    console.log(`      色度: ${webSettings.recommended.chromaSubsampling}`);
    console.log(`      类别: ${webSettings.imageAnalysis.category}`);

    // 应用推荐设置
    const optimizedOutput = path.join(outputDir, `${baseName}_optimized.jpg`);
    const optimizedResult = await processor.convertToJPEG(
      optimizedOutput,
      webSettings.recommended
    );
    console.log(
      `   ✅ 应用最佳设置: ${(
        optimizedResult.metadata.fileSize.compressed / 1024
      ).toFixed(1)}KB`
    );

    console.log("\n📊 性能汇总:");
    console.log("   ========================");
    console.log(`   📁 创建的文件总数: 5`);
    console.log(`   📂 输出目录: ${outputDir}`);

    // 显示文件大小比较
    const outputs = [
      { name: "基本 (Q85)", path: basicOutput },
      { name: "打印 (Q95)", path: printOutput },
      { name: "Web (1920px)", path: webOutput },
      { name: "缩略图", path: thumbOutput },
      { name: "优化", path: optimizedOutput },
    ];

    console.log("\n   📋 文件大小比较:");
    outputs.forEach((output) => {
      if (fs.existsSync(output.path)) {
        const stats = fs.statSync(output.path);
        console.log(
          `      ${output.name}: ${(stats.size / 1024).toFixed(1)}KB`
        );
      }
    });

    console.log("\n🧹 清理中...");
    await processor.close();

    console.log("\n✅ JPEG 转换示例完成！");
    console.log("🎉 检查输出文件以查看质量差异");
  } catch (error) {
    console.error("\n❌ 错误:", error.message);
    console.error("\n请确保您有:");
    console.error("1. 已构建插件: npm run build");
    console.error("2. 已安装 Sharp: npm install sharp");
    console.error("3. 提供了有效的 RAW 文件路径");
    console.error("4. RAW 文件可访问且未损坏");

    // 如果没有提供参数，显示可用的示例文件
    if (!process.argv[2]) {
      const sampleDir = path.join(__dirname, "..", "sample-images");
      if (fs.existsSync(sampleDir)) {
        const files = fs
          .readdirSync(sampleDir)
          .filter((f) =>
            [".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".rw2"].includes(
              path.extname(f).toLowerCase()
            )
          );
        if (files.length > 0) {
          console.error("\n可用的示例文件:");
          files.forEach((file) => {
            console.error(`   ${path.join(sampleDir, file)}`);
          });
        }
      }
    }
  }
}

// 使用说明
if (process.argv.length < 3) {
  console.log("LibRaw JPEG 转换示例");
  console.log("用法: node jpeg-conversion-example.js <RAW文件路径>");
  console.log("");
  console.log("示例:");
  console.log("  node jpeg-conversion-example.js C:\\photos\\IMG_1234.CR2");
  console.log(
    "  node jpeg-conversion-example.js /home/user/photos/DSC_0001.NEF"
  );
  console.log("  node jpeg-conversion-example.js ./sample-images/photo.ARW");
  console.log("");
  console.log("此示例将创建 5 个不同的 JPEG 版本:");
  console.log("  1. 基本质量（默认设置）");
  console.log("  2. 用于打印的高质量");
  console.log("  3. Web 优化带调整大小");
  console.log("  4. 缩略图版本");
  console.log("  5. AI 优化设置");
  process.exit(1);
}

jpegConversionExample();
