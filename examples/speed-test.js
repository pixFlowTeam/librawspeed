#!/usr/bin/env node

const LibRaw = require("../lib/index.js");
const path = require("path");

async function speedTest() {
  console.log("⚡ 性能速度测试 - 缓存优势");
  console.log("============================================\n");

  const rawFile = "sample-images/012A0459.CR3";
  const outputDir = "examples/speed-test";

  // 确保输出目录存在
  const fs = require("fs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const libraw = new LibRaw();
    await libraw.loadFile(rawFile);

    console.log("📁 已加载 RAW 文件:", rawFile);
    console.log("📷 测试转换速度与缓存优势...\n");

    // 测试 1：第一次转换（包含 RAW 处理）
    console.log("🔄 测试 1：第一次转换（带 RAW 处理）");
    const start1 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test1.jpg"), {
      quality: 80,
      fastMode: true,
    });
    const time1 = Date.now() - start1;
    console.log(`   ⚡ 时间: ${time1}ms\n`);

    // 测试 2：第二次转换（使用缓存数据）
    console.log("🔄 测试 2：第二次转换（缓存数据）");
    const start2 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test2.jpg"), {
      quality: 85,
      fastMode: true,
    });
    const time2 = Date.now() - start2;
    console.log(`   ⚡ 时间: ${time2}ms\n`);

    // 测试 3：不同尺寸（缓存数据）
    console.log("🔄 测试 3：调整大小转换（缓存数据）");
    const start3 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test3_web.jpg"), {
      quality: 80,
      width: 1920,
      fastMode: true,
    });
    const time3 = Date.now() - start3;
    console.log(`   ⚡ 时间: ${time3}ms\n`);

    // 测试 4：缩略图（缓存数据）
    console.log("🔄 测试 4：缩略图转换（缓存数据）");
    const start4 = Date.now();
    await libraw.convertToJPEGFast(path.join(outputDir, "test4_thumb.jpg"), {
      quality: 75,
      width: 400,
      fastMode: true,
    });
    const time4 = Date.now() - start4;
    console.log(`   ⚡ 时间: ${time4}ms\n`);

    await libraw.close();

    console.log("📊 性能汇总:");
    console.log("======================");
    console.log(`🔄 第一次转换（带处理）: ${time1}ms`);
    console.log(
      `⚡ 第二次转换（缓存）: ${time2}ms - 快 ${(time1 / time2).toFixed(
        1
      )} 倍`
    );
    console.log(
      `📐 调整大小转换（缓存）: ${time3}ms - 快 ${(time1 / time3).toFixed(
        1
      )} 倍`
    );
    console.log(
      `📱 缩略图转换（缓存）: ${time4}ms - 快 ${(time1 / time4).toFixed(
        1
      )} 倍`
    );

    const avgCachedTime = (time2 + time3 + time4) / 3;
    console.log(
      `\n🎯 平均缓存性能: ${avgCachedTime.toFixed(0)}ms`
    );
    console.log(
      `🚀 缓存提供: ${(time1 / avgCachedTime).toFixed(
        1
      )} 倍速度提升！`
    );
  } catch (error) {
    console.error("❌ 错误:", error.message);
    process.exit(1);
  }
}

speedTest();
