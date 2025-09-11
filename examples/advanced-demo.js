#!/usr/bin/env node

/**
 * LibRaw 高级功能演示
 * 演示综合 LibRaw 包装器中的所有 50+ 方法
 */

const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");

class LibRawAdvancedDemo {
  constructor() {
    this.processor = new LibRaw();
    this.results = {};
  }

  log(message, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      feature: "🎯",
      data: "📊",
    };
    console.log(`${icons[type]} ${message}`);
  }

  async demoStaticInformation() {
    console.log("\n🔍 LibRaw 静态信息");
    console.log("=============================");

    // 版本信息
    const version = LibRaw.getVersion();
    this.log(`LibRaw 版本: ${version}`, "data");

    // 相机支持
    const cameraCount = LibRaw.getCameraCount();
    const cameraList = LibRaw.getCameraList();
    this.log(`支持的相机: ${cameraCount}`, "data");

    // 显示一些热门相机
    const popularBrands = ["Canon", "Nikon", "Sony", "Fujifilm", "Leica"];
    popularBrands.forEach((brand) => {
      const brandCameras = cameraList.filter((camera) =>
        camera.includes(brand)
      );
      if (brandCameras.length > 0) {
        this.log(
          `${brand}: ${brandCameras.length} models (e.g., ${brandCameras[0]})`,
          "data"
        );
      }
    });

    // 功能
    const capabilities = LibRaw.getCapabilities();
    this.log(`库功能: 0x${capabilities.toString(16)}`, "data");

    this.results.static = { version, cameraCount, capabilities };
  }

  async demoInstanceVersionInfo() {
    console.log("\n📋 实例版本信息");
    console.log("===============================");

    // 实例版本方法
    const version = this.processor.version();
    const versionNumber = this.processor.versionNumber();

    this.log(`实例版本: ${version}`, "data");
    this.log(`版本数组: [${versionNumber.join(", ")}]`, "data");

    this.results.instanceVersion = { version, versionNumber };
  }

  async demoErrorHandling() {
    console.log("\n❌ 错误处理功能");
    console.log("===============================");

    // 测试错误方法
    const lastError = this.processor.getLastError();
    this.log(`最后错误: "${lastError}"`, "data");

    // 测试错误代码转换
    const errorCodes = [0, -1, -4, -6];
    errorCodes.forEach((code) => {
      const errorMsg = this.processor.strerror(code);
      this.log(`错误 ${code}: "${errorMsg}"`, "data");
    });

    this.results.errorHandling = { lastError, errorCodes };
  }

  async demoExtendedUtilities(hasFile = false) {
    console.log("\n🔧 扩展实用函数");
    console.log("==============================");

    if (!hasFile) {
      this.log(
        "这些函数需要加载文件 - 显示方法可用性:",
        "warning"
      );
    }

    try {
      // 格式检测实用程序
      const isNikonSRAW = await this.processor.isNikonSRAW().catch(() => null);
      this.log(
        `Nikon sRAW 检测: ${
          isNikonSRAW !== null ? "可用" : "需要文件"
        }`,
        "feature"
      );

      const isCoolscanNEF = await this.processor
        .isCoolscanNEF()
        .catch(() => null);
      this.log(
        `Coolscan NEF 检测: ${
          isCoolscanNEF !== null ? "可用" : "需要文件"
        }`,
        "feature"
      );

      const haveFPData = await this.processor.haveFPData().catch(() => null);
      this.log(
        `浮点数据检查: ${
          haveFPData !== null ? "可用" : "需要文件"
        }`,
        "feature"
      );

      if (hasFile) {
        this.log(`  → 是 Nikon sRAW: ${isNikonSRAW}`, "data");
        this.log(`  → 是 Coolscan NEF: ${isCoolscanNEF}`, "data");
        this.log(`  → 有 FP 数据: ${haveFPData}`, "data");

        // 与文件一起工作的其他实用程序
        const srawMidpoint = await this.processor
          .srawMidpoint()
          .catch(() => null);
        const thumbOK = await this.processor.thumbOK().catch(() => null);
        const unpackFunctionName = await this.processor
          .unpackFunctionName()
          .catch(() => null);
        const decoderInfo = await this.processor
          .getDecoderInfo()
          .catch(() => null);

        if (srawMidpoint !== null)
          this.log(`  → sRAW 中点: ${srawMidpoint}`, "data");
        if (thumbOK !== null)
          this.log(`  → 缩略图状态: ${thumbOK}`, "data");
        if (unpackFunctionName !== null)
          this.log(`  → 解包器: ${unpackFunctionName}`, "data");
        if (decoderInfo !== null)
          this.log(`  → 解码器: ${JSON.stringify(decoderInfo)}`, "data");
      }

      this.results.extendedUtilities = {
        isNikonSRAW,
        isCoolscanNEF,
        haveFPData,
      };
    } catch (error) {
      this.log(`扩展实用程序错误: ${error.message}`, "error");
    }
  }

  async demoCancellationSupport() {
    console.log("\n🛑 取消支持");
    console.log("========================");

    try {
      // 测试取消标志操作
      await this.processor.setCancelFlag();
      this.log("取消标志设置成功", "success");

      await this.processor.clearCancelFlag();
      this.log("取消标志清除成功", "success");

      this.log("取消支持: 完全可操作", "feature");
      this.results.cancellation = { supported: true };
    } catch (error) {
      this.log(`取消支持错误: ${error.message}`, "error");
      this.results.cancellation = { supported: false, error: error.message };
    }
  }

  async demoAdvancedProcessing(hasFile = false) {
    console.log("\n⚙️ 高级处理方法");
    console.log("==============================");

    if (!hasFile) {
      this.log(
        "高级处理需要加载文件 - 显示方法可用性:",
        "warning"
      );
    }

    const methods = [
      { name: "unpack", description: "低级 RAW 解包" },
      { name: "raw2ImageEx", description: "扩展 RAW 到图像转换" },
      {
        name: "adjustSizesInfoOnly",
        description: "内存规划的尺寸计算",
      },
      { name: "freeImage", description: "释放处理后的图像内存" },
      { name: "convertFloatToInt", description: "浮点到整数转换" },
    ];

    methods.forEach((method) => {
      this.log(`${method.name}(): ${method.description}`, "feature");
    });

    if (hasFile) {
      try {
        // 测试尺寸调整（安全操作）
        const adjusted = await this.processor.adjustSizesInfoOnly();
        this.log(
          `  → 尺寸调整: ${adjusted ? "成功" : "失败"}`,
          "data"
        );

        // 测试内存格式
        const memFormat = await this.processor
          .getMemImageFormat()
          .catch(() => null);
        if (memFormat) {
          this.log(
            `  → 内存格式: ${memFormat.width}x${memFormat.height}, ${memFormat.bps}bps`,
            "data"
          );
        }
      } catch (error) {
        this.log(`高级处理错误: ${error.message}`, "warning");
      }
    }

    this.results.advancedProcessing = { methodsAvailable: methods.length };
  }

  async demoMemoryOperations() {
    console.log("\n💾 内存操作");
    console.log("====================");

    try {
      // 内存格式信息
      const memFormat = await this.processor
        .getMemImageFormat()
        .catch(() => null);
      this.log(
        `内存图像格式: ${
          memFormat !== null ? "可用" : "需要处理"
        }`,
        "feature"
      );

      // 内存操作
      const memImageCreated = await this.processor
        .createMemoryImage()
        .catch(() => null);
      this.log(
        `内存图像创建: ${
          memImageCreated !== null ? "可用" : "需要处理"
        }`,
        "feature"
      );

      const memThumbCreated = await this.processor
        .createMemoryThumbnail()
        .catch(() => null);
      this.log(
        `内存缩略图创建: ${
          memThumbCreated !== null ? "可用" : "需要处理"
        }`,
        "feature"
      );

      if (memFormat !== null) {
        this.log(
          `  → 内存格式: ${memFormat.width}x${memFormat.height}, ${memFormat.bps}bps`,
          "data"
        );
      }

      this.results.memoryOperations = {
        memFormat,
        hasMemImage: memImageCreated !== null,
      };
    } catch (error) {
      this.log(`内存操作错误: ${error.message}`, "error");
    }
  }

  async demoColorOperations(hasFile = false) {
    console.log("\n🎨 颜色操作");
    console.log("==================");

    try {
      // 可用的颜色信息
      const colorInfo = await this.processor.getColorInfo().catch(() => null);
      this.log(
        `颜色信息: ${
          colorInfo !== null ? "可用" : "需要文件"
        }`,
        "feature"
      );

      if (hasFile) {
        // 特定位置的颜色
        const colorAt = await this.processor.getColorAt(0, 0).catch(() => null);
        this.log(
          `(0,0) 处的颜色: ${colorAt !== null ? colorAt : "不可用"}`,
          "data"
        );

        if (colorInfo !== null) {
          this.log(`  → 颜色信息可用`, "data");
        }
      } else {
        this.log("颜色位置采样: 需要加载文件", "feature");
      }

      this.results.colorOperations = { colorInfo };
    } catch (error) {
      this.log(`颜色操作错误: ${error.message}`, "error");
    }
  }

  async demoFileOperationsWithSample() {
    console.log("\n📁 使用示例文件演示");
    console.log("=================================");

    // 查找任何可用的 RAW 文件
    const sampleDir = path.join(__dirname, "..", "sample-images");
    let sampleFile = null;

    if (fs.existsSync(sampleDir)) {
      const files = fs.readdirSync(sampleDir);
      const rawExtensions = [
        ".cr2",
        ".cr3",
        ".nef",
        ".arw",
        ".dng",
        ".raf",
        ".rw2",
      ];
      sampleFile = files.find((file) =>
        rawExtensions.some((ext) => file.toLowerCase().endsWith(ext))
      );

      if (sampleFile) {
        sampleFile = path.join(sampleDir, sampleFile);
      }
    }

    if (!sampleFile) {
      this.log(
        "未找到示例 RAW 文件 - 跳过基于文件的演示",
        "warning"
      );
      return false;
    }

    try {
      this.log(`加载示例文件: ${path.basename(sampleFile)}`, "info");
      await this.processor.loadFile(sampleFile);
      this.log("文件加载成功", "success");

      // 现在演示依赖于文件的功能
      await this.demoExtendedUtilities(true);
      await this.demoAdvancedProcessing(true);
      await this.demoColorOperations(true);

      // 文件信息
      const metadata = await this.processor.getMetadata();
      this.log(
        `元数据提取: ${metadata.width}x${metadata.height}`,
        "data"
      );

      const imageSize = await this.processor.getImageSize();
      this.log(`图像尺寸: ${imageSize.width}x${imageSize.height}`, "data");

      return true;
    } catch (error) {
      this.log(`文件操作错误: ${error.message}`, "error");
      return false;
    }
  }

  async cleanup() {
    console.log("\n🧹 清理");
    console.log("==========");

    try {
      await this.processor.close();
      this.log("处理器关闭成功", "success");
    } catch (error) {
      this.log(`清理错误: ${error.message}`, "error");
    }
  }

  printSummary() {
    console.log("\n📊 演示总结");
    console.log("===============");

    const features = [
      { name: "静态信息", tested: !!this.results.static },
      { name: "实例版本信息", tested: !!this.results.instanceVersion },
      { name: "错误处理", tested: !!this.results.errorHandling },
      { name: "扩展实用程序", tested: !!this.results.extendedUtilities },
      { name: "取消支持", tested: !!this.results.cancellation },
      {
        name: "高级处理",
        tested: !!this.results.advancedProcessing,
      },
      { name: "内存操作", tested: !!this.results.memoryOperations },
      { name: "颜色操作", tested: !!this.results.colorOperations },
    ];

    features.forEach((feature) => {
      const status = feature.tested ? "✅" : "❌";
      this.log(`${status} ${feature.name}`, "data");
    });

    const testedCount = features.filter((f) => f.tested).length;
    this.log(
      `\n功能覆盖率: ${testedCount}/${features.length} (${(
        (testedCount / features.length) *
        100
      ).toFixed(1)}%)`,
      "data"
    );

    if (this.results.static) {
      this.log(`LibRaw 版本: ${this.results.static.version}`, "data");
      this.log(`支持的相机: ${this.results.static.cameraCount}`, "data");
    }
  }

  async runDemo() {
    console.log("🚀 LibRaw 高级功能演示");
    console.log("=================================");
    console.log("演示综合包装器中的所有 50+ 方法\n");

    try {
      // 不需要文件的演示
      await this.demoStaticInformation();
      await this.demoInstanceVersionInfo();
      await this.demoErrorHandling();
      await this.demoExtendedUtilities(false);
      await this.demoCancellationSupport();
      await this.demoAdvancedProcessing(false);
      await this.demoMemoryOperations();
      await this.demoColorOperations(false);

      // 尝试使用示例文件的演示
      const hasFile = await this.demoFileOperationsWithSample();

      await this.cleanup();
      this.printSummary();

      console.log("\n🎉 LibRaw 高级演示完成！");
      console.log("==================================");

      if (hasFile) {
        console.log("✅ 使用示例文件完成完整演示");
      } else {
        console.log("⚠️  部分演示（无示例文件可用）");
        console.log(
          "   将 RAW 文件放在 sample-images/ 目录中以进行完整演示"
        );
      }
    } catch (error) {
      console.error("❌ 演示失败:", error.message);
      console.error(error.stack);
      await this.cleanup();
      process.exit(1);
    }
  }
}

async function main() {
  const demo = new LibRawAdvancedDemo();
  await demo.runDemo();
}

if (require.main === module) {
  main();
}

module.exports = { LibRawAdvancedDemo };
