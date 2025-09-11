const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function performanceBenchmark() {
  console.log("⚡ LibRaw Node.js - 性能基准测试");
  console.log("=========================================\n");

  const sampleDir = path.join(__dirname, "../raw-samples-repo");

  try {
    // 获取所有 RAW 文件
    const rawFiles = fs
      .readdirSync(sampleDir, { withFileTypes: true })
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".nef", ".cr3", ".raf", ".dng", ".rw2", ".arw"].includes(ext);
      })
      .sort();

    if (rawFiles.length === 0) {
      console.log("❌ 未找到用于基准测试的 RAW 文件");
      return;
    }

    console.log(`🎯 使用 ${rawFiles.length} 个文件进行基准测试\n`);

    const results = [];
    let totalTime = 0;

    for (let i = 0; i < rawFiles.length; i++) {
      const filename = rawFiles[i];
      const filepath = path.join(sampleDir, filename);
      const fileStats = fs.statSync(filepath);
      const fileSizeMB = fileStats.size / 1024 / 1024;

      console.log(
        `📊 ${i + 1}/${rawFiles.length}: ${filename} (${fileSizeMB.toFixed(
          2
        )} MB)`
      );

      const processor = new LibRaw();
      const startTime = process.hrtime.bigint();

      try {
        // 测量加载时间
        const loadStart = process.hrtime.bigint();
        await processor.loadFile(filepath);
        const loadTime = Number(process.hrtime.bigint() - loadStart) / 1000000; // 转换为毫秒

        // 测量元数据提取时间
        const metaStart = process.hrtime.bigint();
        const metadata = await processor.getMetadata();
        const metaTime = Number(process.hrtime.bigint() - metaStart) / 1000000;

        // 测量尺寸提取时间
        const sizeStart = process.hrtime.bigint();
        const size = await processor.getImageSize();
        const sizeTime = Number(process.hrtime.bigint() - sizeStart) / 1000000;

        // 测量关闭时间
        const closeStart = process.hrtime.bigint();
        await processor.close();
        const closeTime =
          Number(process.hrtime.bigint() - closeStart) / 1000000;

        const totalOperationTime =
          Number(process.hrtime.bigint() - startTime) / 1000000;
        totalTime += totalOperationTime;

        // 计算吞吐量
        const throughputMBps = fileSizeMB / (totalOperationTime / 1000);
        const pixelCount = size.width * size.height;
        const pixelThroughput = pixelCount / (totalOperationTime / 1000);

        results.push({
          filename,
          format: path.extname(filename).toUpperCase().substring(1),
          fileSizeMB,
          resolution: `${size.width}x${size.height}`,
          megapixels: pixelCount / 1000000,
          loadTime,
          metaTime,
          sizeTime,
          closeTime,
          totalTime: totalOperationTime,
          throughputMBps,
          pixelThroughput: pixelThroughput / 1000000, // 每秒百万像素
          camera: `${metadata.make} ${metadata.model}`,
        });

        console.log(
          `   ⏱️  加载: ${loadTime.toFixed(1)}ms | 元数据: ${metaTime.toFixed(
            1
          )}ms | 尺寸: ${sizeTime.toFixed(1)}ms | 关闭: ${closeTime.toFixed(
            1
          )}ms`
        );
        console.log(
          `   🚀 总计: ${totalOperationTime.toFixed(
            1
          )}ms | 吞吐量: ${throughputMBps.toFixed(1)} MB/s | ${(
            pixelThroughput / 1000000
          ).toFixed(1)} MP/s`
        );
        console.log("   ✅ 成功\n");
      } catch (error) {
        console.log(`   ❌ 错误: ${error.message}\n`);
        results.push({
          filename,
          format: path.extname(filename).toUpperCase().substring(1),
          fileSizeMB,
          error: error.message,
        });
      }
    }

    // 计算统计数据
    const successfulResults = results.filter((r) => !r.error);
    if (successfulResults.length === 0) {
      console.log("❌ 没有成功的操作用于统计");
      return;
    }

    console.log("📈 性能统计");
    console.log("═".repeat(50));
    console.log(
      `🎯 成功率: ${successfulResults.length}/${results.length} (${(
        (successfulResults.length / results.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`⏱️  总处理时间: ${totalTime.toFixed(1)}ms`);
    console.log(
      `📊 平均每文件: ${(totalTime / successfulResults.length).toFixed(
        1
      )}ms`
    );

    // 时间分解
    const avgLoad =
      successfulResults.reduce((sum, r) => sum + r.loadTime, 0) /
      successfulResults.length;
    const avgMeta =
      successfulResults.reduce((sum, r) => sum + r.metaTime, 0) /
      successfulResults.length;
    const avgSize =
      successfulResults.reduce((sum, r) => sum + r.sizeTime, 0) /
      successfulResults.length;
    const avgClose =
      successfulResults.reduce((sum, r) => sum + r.closeTime, 0) /
      successfulResults.length;

    console.log("\n⚡ 操作分解（平均值）:");
    console.log(`   • 文件加载: ${avgLoad.toFixed(1)}ms`);
    console.log(`   • 元数据提取: ${avgMeta.toFixed(1)}ms`);
    console.log(`   • 尺寸检测: ${avgSize.toFixed(1)}ms`);
    console.log(`   • 清理: ${avgClose.toFixed(1)}ms`);

    // 吞吐量统计
    const avgThroughput =
      successfulResults.reduce((sum, r) => sum + r.throughputMBps, 0) /
      successfulResults.length;
    const maxThroughput = Math.max(
      ...successfulResults.map((r) => r.throughputMBps)
    );
    const minThroughput = Math.min(
      ...successfulResults.map((r) => r.throughputMBps)
    );

    console.log("\n🚀 吞吐量分析:");
    console.log(`   • 平均: ${avgThroughput.toFixed(1)} MB/s`);
    console.log(`   • 峰值: ${maxThroughput.toFixed(1)} MB/s`);
    console.log(`   • 最低: ${minThroughput.toFixed(1)} MB/s`);

    // 格式对比
    const formatStats = {};
    successfulResults.forEach((r) => {
      if (!formatStats[r.format]) {
        formatStats[r.format] = { count: 0, totalTime: 0, totalSize: 0 };
      }
      formatStats[r.format].count++;
      formatStats[r.format].totalTime += r.totalTime;
      formatStats[r.format].totalSize += r.fileSizeMB;
    });

    console.log("\n📁 格式性能:");
    Object.entries(formatStats).forEach(([format, stats]) => {
      const avgTime = stats.totalTime / stats.count;
      const avgSize = stats.totalSize / stats.count;
      const avgThroughput = avgSize / (avgTime / 1000);
      console.log(
        `   • ${format}: ${avgTime.toFixed(1)}ms 平均 (${avgThroughput.toFixed(
          1
        )} MB/s)`
      );
    });

    // 分辨率影响
    console.log("\n📐 分辨率影响:");
    const resolutionGroups = {
      "低分辨率 (< 16MP)": successfulResults.filter((r) => r.megapixels < 16),
      "中等分辨率 (16-24MP)": successfulResults.filter(
        (r) => r.megapixels >= 16 && r.megapixels < 24
      ),
      "高分辨率 (≥ 24MP)": successfulResults.filter((r) => r.megapixels >= 24),
    };

    Object.entries(resolutionGroups).forEach(([group, files]) => {
      if (files.length > 0) {
        const avgTime =
          files.reduce((sum, f) => sum + f.totalTime, 0) / files.length;
        const avgPixelThroughput =
          files.reduce((sum, f) => sum + f.pixelThroughput, 0) / files.length;
        console.log(
          `   • ${group}: ${avgTime.toFixed(
            1
          )}ms 平均 (${avgPixelThroughput.toFixed(1)} MP/s)`
        );
      }
    });

    // 性能建议
    console.log("\n💡 性能洞察:");
    if (avgLoad > avgMeta * 2) {
      console.log("   • 文件加载是主要瓶颈");
    }
    if (maxThroughput > avgThroughput * 1.5) {
      console.log("   • 性能因格式/尺寸差异很大");
    }
    if (avgThroughput > 50) {
      console.log(
        "   • ✅ 优秀吞吐量 - 适合批量处理"
      );
    } else if (avgThroughput > 20) {
      console.log(
        "   • ✅ 良好吞吐量 - 适合实时应用"
      );
    } else {
      console.log("   • ⚠️  考虑针对高容量场景进行优化");
    }

    console.log(
      `\n🎉 基准测试完成！总共处理了 ${totalTime.toFixed(1)}ms`
    );
  } catch (error) {
    console.error("❌ 基准测试错误:", error.message);
    process.exit(1);
  }
}

// 导出供其他测试使用
module.exports = performanceBenchmark;

// 如果直接执行则运行基准测试
if (require.main === module) {
  performanceBenchmark().catch(console.error);
}
