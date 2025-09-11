const LibRaw = require("../lib/index.js");
const path = require("path");

async function advancedExample() {
  console.log("🔬 高级 LibRaw 功能演示");
  console.log("=".repeat(40));

  const processor = new LibRaw();

  try {
    // 使用第一个可用示例图像的示例
    const sampleFile = path.join(
      __dirname,
      "..",
      "sample-images",
      "ILCE-7RM2_01.ARW"
    );

    console.log("\n1️⃣ 加载 RAW 文件...");
    await processor.loadFile(sampleFile);

    console.log("\n2️⃣ 高级元数据提取...");
    const [metadata, advanced, lens, color] = await Promise.all([
      processor.getMetadata(),
      processor.getAdvancedMetadata(),
      processor.getLensInfo(),
      processor.getColorInfo(),
    ]);

    console.log(`📷 相机: ${metadata.make} ${metadata.model}`);
    console.log(`🔍 镜头: ${lens.lensName || "未知"}`);
    console.log(
      `📊 色彩矩阵可用: ${
        advanced.colorMatrix.length > 0 ? "是" : "否"
      }`
    );

    console.log("\n3️⃣ 配置处理...");
    await processor.setOutputParams({
      bright: 1.1, // 轻微亮度提升
      gamma: [2.2, 4.5], // 标准 sRGB 伽马
      output_bps: 16, // 16 位输出
      no_auto_bright: false, // 启用自动亮度
      highlight: 1, // 高光恢复模式
    });

    console.log("\n4️⃣ 处理管道...");
    await processor.subtractBlack();
    console.log("   ✅ 已减去黑电平");

    await processor.raw2Image();
    console.log("   ✅ RAW 数据已转换为图像");

    await processor.adjustMaximum();
    console.log("   ✅ 最大值已调整");

    await processor.processImage();
    console.log("   ✅ 图像处理完成");

    console.log("\n5️⃣ 创建内存图像...");
    const imageData = await processor.createMemoryImage();
    console.log(
      `   📸 主图像: ${imageData.width}x${imageData.height} (${(
        imageData.dataSize /
        1024 /
        1024
      ).toFixed(1)}MB)`
    );

    await processor.unpackThumbnail();
    const thumbData = await processor.createMemoryThumbnail();
    console.log(
      `   🖼️ 缩略图: ${thumbData.width}x${thumbData.height} (${(
        thumbData.dataSize / 1024
      ).toFixed(1)}KB)`
    );

    console.log("\n6️⃣ 导出文件...");
    const outputDir = path.join(__dirname, "..", "output");
    require("fs").mkdirSync(outputDir, { recursive: true });

    await processor.writeTIFF(path.join(outputDir, "processed.tiff"));
    console.log("   💾 TIFF 已保存");

    await processor.writeThumbnail(path.join(outputDir, "thumbnail.jpg"));
    console.log("   💾 缩略图已保存");

    console.log("\n7️⃣ 图像分析...");
    const [isFloating, isFuji, isSRAW, errors] = await Promise.all([
      processor.isFloatingPoint(),
      processor.isFujiRotated(),
      processor.isSRAW(),
      processor.errorCount(),
    ]);

    console.log(`   🔢 浮点: ${isFloating}`);
    console.log(`   🔄 富士旋转: ${isFuji}`);
    console.log(`   📦 sRAW: ${isSRAW}`);
    console.log(`   ⚠️ 处理错误: ${errors}`);

    console.log("\n✨ 完成！所有高级功能已演示。");
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// 缓冲区加载示例
async function bufferExample() {
  console.log("\n🗂️ 缓冲区加载示例");
  console.log("-".repeat(30));

  const fs = require("fs");
  const sampleFile = path.join(
    __dirname,
    "..",
    "sample-images",
    "ILCE-7RM2_01.ARW"
  );

  if (!fs.existsSync(sampleFile)) {
    console.log("❌ 未找到缓冲区演示的示例文件");
    return;
  }

  const processor = new LibRaw();

  try {
    // 将文件加载到缓冲区
    const buffer = fs.readFileSync(sampleFile);
    console.log(
      `📁 已加载 ${(buffer.length / 1024 / 1024).toFixed(1)}MB 到缓冲区`
    );

    // 从缓冲区处理
    await processor.loadBuffer(buffer);
    console.log("✅ 从缓冲区加载 RAW");

    const metadata = await processor.getMetadata();
    console.log(`📷 ${metadata.make} ${metadata.model} 加载成功`);
  } catch (error) {
    console.error(`❌ 缓冲区加载错误: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// 静态信息示例
function staticInfoExample() {
  console.log("\n📊 静态库信息");
  console.log("-".repeat(35));

  console.log(`📋 LibRaw 版本: ${LibRaw.getVersion()}`);
  console.log(`🎯 功能: 0x${LibRaw.getCapabilities().toString(16)}`);
  console.log(`📷 支持的相机: ${LibRaw.getCameraCount()}`);

  const cameras = LibRaw.getCameraList();
  console.log(`🏷️ 示例相机型号:`);
  cameras.slice(0, 10).forEach((camera) => console.log(`   • ${camera}`));
  if (cameras.length > 10) {
    console.log(`   ... 还有 ${cameras.length - 10} 个`);
  }
}

// 运行所有示例
async function runExamples() {
  staticInfoExample();
  await advancedExample();
  await bufferExample();

  console.log("\n🎉 所有示例完成！");
}

runExamples().catch(console.error);
