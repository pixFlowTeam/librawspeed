const LibRaw = require("../lib/index");
const fs = require("fs");

/**
 * 缓冲区 API 快速测试
 *
 * 此测试验证新的缓冲区方法是否正确工作
 * 并可以在内存中创建图像数据。
 */

async function quickBufferTest() {
  console.log("🧪 缓冲区 API 快速测试");
  console.log("========================\n");

  // 检查示例图像
  const sampleDir = "../raw-samples-repo";
  const testFiles = [
    "D5600_0276.NEF",
    "012A0459.CR3",
    "DSCF4035.RAF",
    "_DSC0406.ARW",
  ];

  let testFile = null;

  // 查找第一个可用的测试文件
  for (const file of testFiles) {
    const fullPath = `${sampleDir}/${file}`;
    if (fs.existsSync(fullPath)) {
      testFile = fullPath;
      console.log(`📁 找到测试文件: ${file}`);
      break;
    }
  }

  if (!testFile) {
    console.log("❌ 在 ../raw-samples-repo/ 中未找到示例图像");
    console.log("请将 RAW 文件放在那里并重试。");
    return;
  }

  const processor = new LibRaw();

  try {
    console.log("\n🔄 加载 RAW 文件...");
    await processor.loadFile(testFile);
    console.log("✅ RAW 文件加载成功");

    console.log("\n⚙️ 处理图像...");
    await processor.processImage();
    console.log("✅ 图像已处理");

    // 测试基本缓冲区创建
    console.log("\n📸 测试缓冲区创建...");

    // 测试 JPEG 缓冲区（最常用）
    console.log("  • JPEG 缓冲区...");
    const jpegResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 800,
    });

    if (jpegResult.success && jpegResult.buffer.length > 0) {
      console.log(`    ✅ 成功: ${jpegResult.buffer.length} 字节`);
      console.log(
        `    📐 ${jpegResult.metadata.outputDimensions.width}x${jpegResult.metadata.outputDimensions.height}`
      );
    } else {
      throw new Error("JPEG 缓冲区创建失败");
    }

    // 测试缩略图
    console.log("  • 缩略图缓冲区...");
    const thumbResult = await processor.createThumbnailJPEGBuffer({
      maxSize: 200,
    });

    if (thumbResult.success && thumbResult.buffer.length > 0) {
      console.log(`    ✅ 成功: ${thumbResult.buffer.length} 字节`);
      console.log(
        `    📐 ${thumbResult.metadata.outputDimensions.width}x${thumbResult.metadata.outputDimensions.height}`
      );
    } else {
      throw new Error("缩略图缓冲区创建失败");
    }

    // 测试 PNG 缓冲区
    console.log("  • PNG 缓冲区...");
    const pngResult = await processor.createPNGBuffer({
      width: 400,
    });

    if (pngResult.success && pngResult.buffer.length > 0) {
      console.log(`    ✅ 成功: ${pngResult.buffer.length} 字节`);
      console.log(
        `    📐 ${pngResult.metadata.outputDimensions.width}x${pngResult.metadata.outputDimensions.height}`
      );
    } else {
      throw new Error("PNG 缓冲区创建失败");
    }

    // 保存缓冲区用于视觉验证（可选）
    console.log("\n💾 保存测试输出...");
    fs.writeFileSync("test_jpeg.jpg", jpegResult.buffer);
    fs.writeFileSync("test_thumb.jpg", thumbResult.buffer);
    fs.writeFileSync("test_png.png", pngResult.buffer);
    console.log("✅ 测试文件已保存");

    // 性能总结
    console.log("\n📊 性能总结:");
    console.log(`  JPEG: ${jpegResult.metadata.processing.timeMs}ms`);
    console.log(`  缩略图: ${thumbResult.metadata.processing.timeMs}ms`);
    console.log(`  PNG: ${pngResult.metadata.processing.timeMs}ms`);

    console.log("\n✅ 所有缓冲区测试通过！");
    console.log("\n💡 缓冲区 API 工作正常。");
    console.log("   您现在可以在应用程序中使用这些方法：");
    console.log("   • createJPEGBuffer() - 用于网页图像");
    console.log("   • createThumbnailJPEGBuffer() - 用于缩略图");
    console.log("   • createPNGBuffer() - 用于无损图像");
    console.log("   • createWebPBuffer() - 用于现代网页");
    console.log("   • createAVIFBuffer() - 用于下一代压缩");
  } catch (error) {
    console.error("\n❌ 测试失败:", error.message);
    console.error("\n可能的问题:");
    console.error("1. Sharp 未安装: npm install sharp");
    console.error("2. LibRaw 插件未构建: npm run build");
    console.error("3. 不兼容的 RAW 文件格式");
    console.error("4. 处理内存不足");
  } finally {
    await processor.close();
  }
}

// 如果直接调用则运行
if (require.main === module) {
  quickBufferTest().catch(console.error);
}

module.exports = quickBufferTest;
