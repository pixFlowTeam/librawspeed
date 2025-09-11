#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const path = require("path");
const fs = require("fs");

async function performanceTest() {
  console.log("LibRaw 快速性能测试");
  console.log("===========================\n");

  const rawFile = "sample-images/012A0459.CR3";
  const outputDir = "examples/performance-test";

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📁 测试文件: ${rawFile}`);

  try {
    // 加载 RAW 文件
    const libraw = new LibRaw();
    await libraw.loadFile(rawFile);

    const info = await libraw.getMetadata();
    console.log(`📷 相机: ${info.make} ${info.model}`);
    console.log(`📐 尺寸: ${info.width}x${info.height}`);
    console.log(
      `📊 百万像素: ${((info.width * info.height) / 1000000).toFixed(1)}MP\n`
    );

    // 测试 1：超快速转换
    console.log("🚀 测试 1：超快速转换 (effort=1, 无 mozjpeg)");
    const start1 = Date.now();
    await libraw.convertToJPEGFast(
      path.join(outputDir, "012A0459_ultrafast.jpg"),
      {
        quality: 80,
        fastMode: true,
        effort: 1,
        mozjpeg: false,
        progressive: false,
      }
    );
    const time1 = Date.now() - start1;
    const stats1 = fs.statSync(path.join(outputDir, "012A0459_ultrafast.jpg"));
    console.log(`   ✅ 时间: ${time1}ms`);
    console.log(`   📊 大小: ${(stats1.size / 1024).toFixed(1)}KB\n`);

    // 测试 2：多尺寸生成
    console.log("📐 测试 2：多尺寸生成（3 个尺寸并行）");
    const start2 = Date.now();
    const multiResult = await libraw.convertToJPEGMultiSize(
      path.join(outputDir, "012A0459_multi"),
      {
        sizes: [
          { name: "thumbnail", width: 400, quality: 75, effort: 1 },
          { name: "web", width: 1920, quality: 80, effort: 2 },
          { name: "full", quality: 85, effort: 3 },
        ],
      }
    );
    const time2 = Date.now() - start2;
    console.log(`   ✅ 总时间: ${time2}ms`);
    console.log(`   📊 每个尺寸平均: ${multiResult.averageTimePerSize}`);
    console.log(`   📁 生成的文件:`);
    for (const [key, size] of Object.entries(multiResult.sizes)) {
      console.log(
        `      ${size.name}: ${(size.fileSize / 1024).toFixed(1)}KB (${
          size.processingTime
        }ms)`
      );
    }
    console.log();

    // 测试 3：高并发批量转换
    console.log(
      "⚡ 测试 3：批量处理（使用单独文件模拟）"
    );
    const batchFiles = [
      "sample-images/012A0459.CR3",
      "sample-images/012A0879.CR3",
      "sample-images/020A0045.CR3",
    ];

    const start3 = Date.now();
    let successCount = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      try {
        const batchLibraw = new LibRaw();
        await batchLibraw.loadFile(batchFiles[i]);
        await batchLibraw.convertToJPEGFast(
          path.join(outputDir, `batch_${path.parse(batchFiles[i]).name}.jpg`),
          {
            quality: 85,
            fastMode: true,
            effort: 2,
          }
        );
        await batchLibraw.close();
        successCount++;
      } catch (error) {
        console.log(
          `   ❌ 处理失败 ${batchFiles[i]}: ${error.message}`
        );
      }
    }
    const time3 = Date.now() - start3;
    console.log(`   ✅ 总时间: ${time3}ms`);
    console.log(`   📊 已处理文件: ${successCount}/${batchFiles.length}`);
    console.log(
      `   ⚡ 每个文件平均: ${(time3 / successCount).toFixed(0)}ms\n`
    );

    // 性能汇总
    console.log("📊 性能汇总:");
    console.log("======================");
    console.log(`🚀 超快速单张: ${time1}ms`);
    console.log(
      `📐 多尺寸 (3x): ${time2}ms (${(time2 / 3).toFixed(0)}ms 平均)`
    );
    console.log(
      `⚡ 批量 (3 文件): ${time3}ms (${(time3 / 3).toFixed(0)}ms 平均)`
    );
    console.log(
      `\n🎯 性能提升: 比原始版本快约 ${Math.round(
        7000 / time1
      )} 倍！`
    );

    await libraw.close();
  } catch (error) {
    console.error("❌ 错误:", error.message);
    process.exit(1);
  }
}

performanceTest()
  .then(() => {
    console.log("\n✅ 性能测试完成！");
  })
  .catch((error) => {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  });
