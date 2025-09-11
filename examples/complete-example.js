const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 完整 RAW 处理管道示例
 *
 * 此示例演示了完整的 LibRaw API，包括：
 * - 文件加载和缓冲区操作
 * - 全面的元数据提取
 * - 图像处理管道
 * - 内存图像操作
 * - 多种格式的文件输出
 * - 配置和实用函数
 */

async function completeProcessingExample(inputFile, outputDir) {
  console.log("🎯 完整 RAW 处理管道");
  console.log("=====================================");
  console.log(`📁 输入: ${inputFile}`);
  console.log(`📂 输出目录: ${outputDir}`);

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const processor = new LibRaw();
  const startTime = Date.now();

  try {
    // ============== 步骤 1：库信息 ==============
    console.log("\n📊 库信息:");
    console.log(`   LibRaw 版本: ${LibRaw.getVersion()}`);
    console.log(`   支持的相机: ${LibRaw.getCameraCount()}`);
    console.log(`   功能: 0x${LibRaw.getCapabilities().toString(16)}`);

    // ============== 步骤 2：加载图像 ==============
    console.log("\n🔄 加载 RAW 图像...");
    await processor.loadFile(inputFile);
    console.log("   ✅ 图像加载成功");

    // ============== 步骤 3：提取元数据 ==============
    console.log("\n📋 提取元数据...");

    const metadata = await processor.getMetadata();
    console.log(
      `   📷 相机: ${metadata.make || "未知"} ${
        metadata.model || "未知"
      }`
    );
    console.log(
      `   📐 分辨率: ${metadata.width}×${metadata.height} (RAW: ${metadata.rawWidth}×${metadata.rawHeight})`
    );

    if (metadata.iso) console.log(`   🎯 ISO: ${metadata.iso}`);
    if (metadata.aperture)
      console.log(`   🔍 光圈: f/${metadata.aperture}`);
    if (metadata.shutterSpeed)
      console.log(`   ⏱️ 快门: 1/${Math.round(1 / metadata.shutterSpeed)}s`);
    if (metadata.focalLength)
      console.log(`   📏 焦距: ${metadata.focalLength}mm`);

    const sizeInfo = await processor.getImageSize();
    console.log(
      `   📏 边距: ${sizeInfo.leftMargin}px×${sizeInfo.topMargin}px`
    );

    const lensInfo = await processor.getLensInfo();
    if (lensInfo.lensName) {
      console.log(`   🔍 镜头: ${lensInfo.lensName}`);
      if (lensInfo.lensSerial)
        console.log(`   🔢 镜头序列号: ${lensInfo.lensSerial}`);
    }

    const colorInfo = await processor.getColorInfo();
    console.log(`   🎨 色彩通道: ${colorInfo.colors}`);
    console.log(`   ⚫ 黑电平: ${colorInfo.blackLevel}`);
    console.log(`   ⚪ 白电平: ${colorInfo.whiteLevel}`);

    // ============== 步骤 4：图像分析 ==============
    console.log("\n🔬 图像分析...");
    const [isFloating, isFuji, isSRAW, isJPEGThumb, errorCount] =
      await Promise.all([
        processor.isFloatingPoint(),
        processor.isFujiRotated(),
        processor.isSRAW(),
        processor.isJPEGThumb(),
        processor.errorCount(),
      ]);

    console.log(`   📊 浮点: ${isFloating ? "是" : "否"}`);
    console.log(`   🔄 富士旋转: ${isFuji ? "是" : "否"}`);
    console.log(`   📦 sRAW 格式: ${isSRAW ? "是" : "否"}`);
    console.log(`   🖼️ JPEG 缩略图: ${isJPEGThumb ? "是" : "否"}`);
    console.log(`   ⚠️ 处理错误: ${errorCount}`);

    // ============== 步骤 5：配置处理 ==============
    console.log("\n⚙️ 配置处理...");

    // 获取当前参数
    const currentParams = await processor.getOutputParams();
    console.log(
      `   📊 当前伽马: [${currentParams.gamma[0]}, ${currentParams.gamma[1]}]`
    );

    // 设置自定义处理参数
    await processor.setOutputParams({
      bright: 1.1, // 10% 亮度提升
      gamma: [2.2, 4.5], // 标准 sRGB 伽马
      output_bps: 16, // 16 位输出以获得最大质量
      no_auto_bright: false, // 启用自动亮度
      highlight: 1, // 高光恢复模式 1
      output_color: 1, // sRGB 色彩空间
    });
    console.log("   ✅ 处理参数已配置");

    // ============== 步骤 6：处理图像 ==============
    console.log("\n🖼️ 处理图像...");

    try {
      await processor.raw2Image();
      console.log("   ✅ RAW 到图像转换");
    } catch (e) {
      console.log(`   ⚠️ RAW 到图像: ${e.message}`);
    }

    try {
      await processor.adjustMaximum();
      console.log("   ✅ 最大值调整");
    } catch (e) {
      console.log(`   ⚠️ 最大值调整: ${e.message}`);
    }

    try {
      await processor.processImage();
      console.log("   ✅ 图像处理完成");
    } catch (e) {
      console.log(`   ⚠️ 图像处理: ${e.message}`);
    }

    // ============== 步骤 7：内存操作 ==============
    console.log("\n💾 内存操作...");

    try {
      const imageData = await processor.createMemoryImage();
      console.log(`   📸 内存图像: ${imageData.width}×${imageData.height}`);
      console.log(
        `   📊 格式: 类型 ${imageData.type}, ${imageData.colors} 色彩, ${imageData.bits} 位`
      );
      console.log(
        `   💽 大小: ${(imageData.dataSize / 1024 / 1024).toFixed(1)} MB`
      );

      // 保存原始图像数据
      const rawDataPath = path.join(outputDir, "processed_image_data.bin");
      fs.writeFileSync(rawDataPath, imageData.data);
      console.log(`   💾 原始图像数据已保存到: ${rawDataPath}`);
    } catch (e) {
      console.log(`   ⚠️ 内存图像创建: ${e.message}`);
    }

    // ============== 步骤 8：缩略图操作 ==============
    console.log("\n🖼️ 缩略图操作...");

    try {
      await processor.unpackThumbnail();
      console.log("   ✅ 缩略图已解包");

      const thumbData = await processor.createMemoryThumbnail();
      console.log(
        `   🖼️ 内存缩略图: ${thumbData.width}×${thumbData.height}`
      );
      console.log(
        `   📊 格式: 类型 ${thumbData.type}, ${thumbData.colors} 色彩, ${thumbData.bits} 位`
      );
      console.log(`   💽 大小: ${(thumbData.dataSize / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.log(`   ⚠️ 缩略图操作: ${e.message}`);
    }

    // ============== 步骤 9：文件输出 ==============
    console.log("\n💾 文件输出...");

    const baseName = path.basename(inputFile, path.extname(inputFile));

    // PPM 输出
    try {
      const ppmPath = path.join(outputDir, `${baseName}.ppm`);
      await processor.writePPM(ppmPath);
      const ppmStats = fs.statSync(ppmPath);
      console.log(
        `   ✅ PPM: ${(ppmStats.size / 1024 / 1024).toFixed(
          1
        )} MB -> ${ppmPath}`
      );
    } catch (e) {
      console.log(`   ⚠️ PPM 输出: ${e.message}`);
    }

    // TIFF 输出
    try {
      const tiffPath = path.join(outputDir, `${baseName}.tiff`);
      await processor.writeTIFF(tiffPath);
      const tiffStats = fs.statSync(tiffPath);
      console.log(
        `   ✅ TIFF: ${(tiffStats.size / 1024 / 1024).toFixed(
          1
        )} MB -> ${tiffPath}`
      );
    } catch (e) {
      console.log(`   ⚠️ TIFF 输出: ${e.message}`);
    }

    // 缩略图输出
    try {
      const thumbPath = path.join(outputDir, `${baseName}_thumbnail.jpg`);
      await processor.writeThumbnail(thumbPath);
      const thumbStats = fs.statSync(thumbPath);
      console.log(
        `   ✅ 缩略图: ${(thumbStats.size / 1024).toFixed(
          1
        )} KB -> ${thumbPath}`
      );
    } catch (e) {
      console.log(`   ⚠️ 缩略图输出: ${e.message}`);
    }

    // ============== 步骤 10：性能汇总 ==============
    const processingTime = Date.now() - startTime;
    console.log("\n⏱️ 性能汇总:");
    console.log(`   🕐 总处理时间: ${processingTime}ms`);
    console.log(
      `   📊 吞吐量: ${(
        fs.statSync(inputFile).size /
        1024 /
        1024 /
        (processingTime / 1000)
      ).toFixed(1)} MB/s`
    );

    const finalErrorCount = await processor.errorCount();
    console.log(`   ⚠️ 最终错误计数: ${finalErrorCount}`);
  } catch (error) {
    console.error(`\n❌ 处理错误: ${error.message}`);
    console.error(error.stack);
  } finally {
    // ============== 清理 ==============
    console.log("\n🧹 清理...");
    await processor.close();
    console.log("   ✅ 资源已释放");
  }

  console.log("\n🎉 完整处理管道完成！");
  console.log("=====================================");
}

// 缓冲区加载示例
async function bufferProcessingExample(inputFile) {
  console.log("\n🗂️ 缓冲区处理示例");
  console.log("=============================");

  const processor = new LibRaw();

  try {
    // 将文件加载到缓冲区
    const buffer = fs.readFileSync(inputFile);
    console.log(
      `📁 已加载 ${(buffer.length / 1024 / 1024).toFixed(1)} MB 到缓冲区`
    );

    // 从缓冲区处理
    await processor.loadBuffer(buffer);
    console.log("✅ 从缓冲区加载 RAW");

    const metadata = await processor.getMetadata();
    console.log(
      `📷 成功处理: ${metadata.make} ${metadata.model}`
    );
    console.log(`📐 分辨率: ${metadata.width}×${metadata.height}`);
  } catch (error) {
    console.error(`❌ 缓冲区处理错误: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(
      "用法: node complete-example.js <输入RAW文件> [输出目录]"
    );
    console.log("示例: node complete-example.js sample.cr2 ./output");
    return;
  }

  const inputFile = args[0];
  const outputDir = args[1] || "./output";

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ 输入文件未找到: ${inputFile}`);
    return;
  }

  try {
    await completeProcessingExample(inputFile, outputDir);
    await bufferProcessingExample(inputFile);
  } catch (error) {
    console.error(`❌ 致命错误: ${error.message}`);
  }
}

// 导出供模块使用
module.exports = {
  completeProcessingExample,
  bufferProcessingExample,
};

// 如果直接调用则运行
if (require.main === module) {
  main().catch(console.error);
}
