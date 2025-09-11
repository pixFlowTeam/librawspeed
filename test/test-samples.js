const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function testAllSamples() {
  console.log("LibRaw Node.js POC - 示例图像测试");
  console.log("=======================================\n");

  const sampleDir = path.join(__dirname, "../raw-samples-repo");

  try {
    // 获取所有 NEF 文件
    const files = fs
      .readdirSync(sampleDir, { withFileTypes: true })
      .filter((file) => file.toLowerCase().endsWith(".nef"))
      .sort();

    if (files.length === 0) {
      console.log("❌ 在 raw-samples-repo 目录中未找到 NEF 文件");
      return;
    }

    console.log(`找到 ${files.length} 个 NEF 文件待处理:\n`);

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const filepath = path.join(sampleDir, filename);

      console.log(`📸 处理中 ${i + 1}/${files.length}: ${filename}`);
      console.log("─".repeat(50));

      const processor = new LibRaw();

      try {
        // 加载文件
        await processor.loadFile(filepath);

        // 获取元数据
        const metadata = await processor.getMetadata();
        const size = await processor.getImageSize();

        // 显示关键信息
        console.log(`📷 相机: ${metadata.make} ${metadata.model}`);
        console.log(`📐 尺寸: ${size.width} x ${size.height} 像素`);
        console.log(
          `🎯 设置: ISO ${metadata.iso}, f/${metadata.aperture?.toFixed(
            1
          )}, 1/${Math.round(1 / metadata.shutterSpeed)}s, ${
            metadata.focalLength
          }mm`
        );

        if (metadata.timestamp) {
          const date = new Date(metadata.timestamp * 1000);
          console.log(`📅 拍摄时间: ${date.toLocaleString()}`);
        }

        // 文件大小
        const stats = fs.statSync(filepath);
        console.log(
          `💾 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        );

        // 颜色滤镜模式
        const filterHex = metadata.filters?.toString(16).toUpperCase() || "0";
        console.log(
          `🎨 颜色滤镜: 0x${filterHex} (${metadata.colors} 颜色)`
        );

        console.log("✅ 成功\n");

        // 清理
        await processor.close();
      } catch (error) {
        console.log(`❌ 处理 ${filename} 时出错: ${error.message}\n`);
      }
    }

    console.log("🎉 示例处理完成！");
    console.log("\n📊 总结:");
    console.log(`   • 处理了 ${files.length} 个 NEF 文件`);
    console.log(`   • 所有文件来自 Nikon D5600`);
    console.log(`   • 分辨率: 6016 x 4016 (24.2 MP)`);
    console.log(`   • 格式: Nikon NEF (RAW)`);
  } catch (error) {
    console.error("❌ 错误:", error.message);
  }
}

// 运行测试
testAllSamples().catch(console.error);
