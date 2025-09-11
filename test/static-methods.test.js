const LibRaw = require("../lib/index.js");

/**
 * 测试 LibRaw 的所有静态方法
 */

async function testStaticMethods() {
  console.log("🔧 LibRaw Static Methods Test");
  console.log("=".repeat(40));

  console.log("\n📊 Library Information:");

  // 测试 getVersion
  try {
    const version = LibRaw.getVersion();
    console.log(`   ✅ Version: ${version}`);

    // 验证版本格式
    if (typeof version !== "string" || version.length === 0) {
      throw new Error("无效的版本格式");
    }

    console.log(`   ✅ 版本验证通过`);
  } catch (error) {
    console.log(`   ❌ 版本测试失败: ${error.message}`);
  }

  // 测试 getCapabilities
  try {
    const capabilities = LibRaw.getCapabilities();
    console.log(
      `   ✅ Capabilities: 0x${capabilities.toString(16)} (${capabilities})`
    );

    // 验证功能是数字
    if (typeof capabilities !== "number" || isNaN(capabilities)) {
      throw new Error("无效的功能格式");
    }

    console.log(`   ✅ 功能验证通过`);
  } catch (error) {
    console.log(`   ❌ 功能测试失败: ${error.message}`);
  }

  // 测试 getCameraCount
  try {
    const count = LibRaw.getCameraCount();
    console.log(`   ✅ Camera Count: ${count}`);

    // 验证计数是正数
    if (typeof count !== "number" || count <= 0) {
      throw new Error("无效的相机计数");
    }

    // 在 LibRaw 0.21.4 中期望至少 1000 个相机
    if (count < 1000) {
      console.log(
        `   ⚠️ 警告: 相机计数似乎较低 (${count})，期望 1000+`
      );
    } else {
      console.log(`   ✅ 相机计数验证通过`);
    }
  } catch (error) {
    console.log(`   ❌ 相机计数测试失败: ${error.message}`);
  }

  // 测试 getCameraList
  try {
    const cameras = LibRaw.getCameraList();
    console.log(`   ✅ Camera List Length: ${cameras.length}`);

    // 验证相机是数组
    if (!Array.isArray(cameras)) {
      throw new Error("相机列表不是数组");
    }

    // 检查数组长度与计数匹配
    const count = LibRaw.getCameraCount();
    if (cameras.length !== count) {
      throw new Error(
        `相机列表长度 (${cameras.length}) 与计数 (${count}) 不匹配`
      );
    }

    // 检查前几个相机
    console.log(`   📷 前 10 个相机:`);
    for (let i = 0; i < Math.min(10, cameras.length); i++) {
      if (typeof cameras[i] !== "string" || cameras[i].length === 0) {
        throw new Error(`索引 ${i} 处的相机名称无效: ${cameras[i]}`);
      }
      console.log(`      ${i + 1}. ${cameras[i]}`);
    }

    // 查找一些知名相机
    const testCameras = [
      "Canon EOS",
      "Nikon D",
      "Sony Alpha",
      "Fujifilm",
      "Panasonic",
    ];
    const foundCameras = testCameras.filter((brand) =>
      cameras.some((camera) => camera.includes(brand))
    );

    console.log(`   ✅ 找到主要品牌: ${foundCameras.join(", ")}`);

    if (foundCameras.length < 3) {
      console.log(`   ⚠️ 警告: 找到的主要相机品牌较少`);
    } else {
      console.log(`   ✅ 相机列表验证通过`);
    }
  } catch (error) {
    console.log(`   ❌ 相机列表测试失败: ${error.message}`);
  }

  // 测试特定相机搜索
  console.log("\n🔍 相机搜索测试:");

  try {
    const cameras = LibRaw.getCameraList();

    // 搜索 Canon 相机
    const canonCameras = cameras.filter((camera) =>
      camera.toLowerCase().includes("canon")
    );
    console.log(`   📷 找到 Canon 相机: ${canonCameras.length}`);
    if (canonCameras.length > 0) {
      console.log(`      示例: ${canonCameras.slice(0, 3).join(", ")}`);
    }

    // 搜索 Nikon 相机
    const nikonCameras = cameras.filter((camera) =>
      camera.toLowerCase().includes("nikon")
    );
    console.log(`   📷 找到 Nikon 相机: ${nikonCameras.length}`);
    if (nikonCameras.length > 0) {
      console.log(`      示例: ${nikonCameras.slice(0, 3).join(", ")}`);
    }

    // 搜索 Sony 相机
    const sonyCameras = cameras.filter((camera) =>
      camera.toLowerCase().includes("sony")
    );
    console.log(`   📷 找到 Sony 相机: ${sonyCameras.length}`);
    if (sonyCameras.length > 0) {
      console.log(`      示例: ${sonyCameras.slice(0, 3).join(", ")}`);
    }

    console.log(`   ✅ 相机搜索测试通过`);
  } catch (error) {
    console.log(`   ❌ 相机搜索失败: ${error.message}`);
  }

  // 测试功能标志
  console.log("\n🚩 功能标志分析:");

  try {
    const caps = LibRaw.getCapabilities();

    // 定义已知的功能标志（来自 libraw.h）
    const capabilityFlags = {
      LIBRAW_CAPS_RAWSPEED: 0x1,
      LIBRAW_CAPS_DNG: 0x2,
      LIBRAW_CAPS_DEMOSAIC_PACK_GPL2: 0x4,
      LIBRAW_CAPS_DEMOSAIC_PACK_GPL3: 0x8,
      LIBRAW_CAPS_CRXDEC: 0x10,
    };

    console.log("   可用功能:");
    Object.entries(capabilityFlags).forEach(([name, flag]) => {
      const hasCapability = (caps & flag) !== 0;
      console.log(`      ${name}: ${hasCapability ? "✅ 是" : "❌ 否"}`);
    });

    console.log(`   ✅ 功能分析完成`);
  } catch (error) {
    console.log(`   ❌ 功能分析失败: ${error.message}`);
  }

  console.log("\n🎉 静态方法测试完成！");
  console.log("=".repeat(40));
}

// 运行测试
if (require.main === module) {
  testStaticMethods().catch(console.error);
}

module.exports = { testStaticMethods };
