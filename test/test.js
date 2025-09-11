const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function testBasicFunctionality(processor, testFile) {
  console.log("\n📁 Testing Basic Functionality");
  console.log("================================");

  console.log(`加载文件: ${testFile}`);
  const loaded = await processor.loadFile(testFile);
  console.log("✓ 文件加载成功:", loaded);

  console.log("\n检查是否已加载...");
  const isLoaded = await processor.checkLoaded();
  console.log("✓ 文件已加载:", isLoaded);

  console.log("\n获取文件信息...");
  const fileInfo = await processor.getFileInfo();
  console.log("✓ 文件信息已提取");
  console.log(JSON.stringify(fileInfo, null, 2));

  console.log("\n获取图像参数...");
  const imageParams = await processor.getImageParams();
  console.log("✓ 图像参数已提取");
  console.log(JSON.stringify(imageParams, null, 2));

  return true;
}

async function testExtendedUtility(processor) {
  console.log("\n🔧 Testing Extended Utility Functions");
  console.log("=====================================");

  try {
    console.log("检查是否为 Nikon sRAW...");
    const isNikonSRAW = await processor.isNikonSRAW();
    console.log("✓ Nikon sRAW 检查:", isNikonSRAW);

    console.log("检查是否为 Coolscan NEF...");
    const isCoolscanNEF = await processor.isCoolscanNEF();
    console.log("✓ Coolscan NEF 检查:", isCoolscanNEF);

    console.log("检查浮点数据...");
    const haveFPData = await processor.haveFPData();
    console.log("✓ FP 数据可用:", haveFPData);

    console.log("获取 sRAW 中点...");
    const srawMidpoint = await processor.srawMidpoint();
    console.log("✓ sRAW 中点:", srawMidpoint);

    console.log("检查缩略图...");
    const thumbOK = await processor.thumbOK();
    console.log("✓ 缩略图状态:", thumbOK);

    console.log("获取解包函数名称...");
    const unpackFunctionName = await processor.unpackFunctionName();
    console.log("✓ 解包函数:", unpackFunctionName);

    console.log("获取解码器信息...");
    const decoderInfo = await processor.getDecoderInfo();
    console.log("✓ 解码器信息:", decoderInfo);

    return true;
  } catch (error) {
    console.log("⚠️  Extended utility test partial failure:", error.message);
    return false;
  }
}

async function testAdvancedProcessing(processor) {
  console.log("\n⚙️  Testing Advanced Processing");
  console.log("===============================");

  try {
    console.log("解包 RAW 数据...");
    const unpacked = await processor.unpack();
    console.log("✓ RAW 数据已解包:", unpacked);

    console.log("转换 RAW 为图像...");
    const raw2image = await processor.raw2Image();
    console.log("✓ RAW 到图像转换:", raw2image);

    console.log("获取内存图像格式...");
    const memFormat = await processor.getMemImageFormat();
    console.log("✓ 内存图像格式:", memFormat);

    console.log("调整尺寸（仅信息）...");
    const adjustedSizes = await processor.adjustSizesInfoOnly();
    console.log("✓ 尺寸已调整:", adjustedSizes);

    return true;
  } catch (error) {
    console.log("⚠️  Advanced processing test partial failure:", error.message);
    return false;
  }
}

async function testColorOperations(processor) {
  console.log("\n🎨 Testing Color Operations");
  console.log("===========================");

  try {
    console.log("获取颜色矩阵...");
    const cameraMatrix = await processor.getCameraColorMatrix();
    console.log("✓ 相机颜色矩阵已获取");

    const rgbMatrix = await processor.getRGBCameraMatrix();
    console.log("✓ RGB 相机矩阵已获取");

    // 测试特定位置的颜色（如果图像已加载）
    console.log("获取位置 (0,0) 的颜色...");
    const colorAt = await processor.getColorAt(0, 0);
    console.log("✓ (0,0) 位置的颜色:", colorAt);

    return true;
  } catch (error) {
    console.log("⚠️  Color operations test partial failure:", error.message);
    return false;
  }
}

async function testCancellationSupport(processor) {
  console.log("\n🛑 Testing Cancellation Support");
  console.log("===============================");

  try {
    console.log("设置取消标志...");
    const setCancelResult = await processor.setCancelFlag();
    console.log("✓ 取消标志已设置:", setCancelResult);

    console.log("清除取消标志...");
    const clearCancelResult = await processor.clearCancelFlag();
    console.log("✓ 取消标志已清除:", clearCancelResult);

    return true;
  } catch (error) {
    console.log(
      "⚠️  Cancellation support test partial failure:",
      error.message
    );
    return false;
  }
}

async function testMemoryOperations(processor) {
  console.log("\n💾 Testing Memory Operations");
  console.log("============================");

  try {
    console.log("获取内存需求...");
    const memReq = await processor.getMemoryRequirements();
    console.log("✓ 内存需求:", memReq, "字节");

    console.log("获取 RAW 图像缓冲区...");
    const rawBuffer = await processor.getRawImageBuffer();
    console.log(
      "✓ RAW 缓冲区大小:",
      rawBuffer ? rawBuffer.length : "null",
      "字节"
    );

    console.log("获取已处理图像缓冲区...");
    const processedBuffer = await processor.getProcessedImageBuffer();
    console.log(
      "✓ 已处理缓冲区大小:",
      processedBuffer ? processedBuffer.length : "null",
      "字节"
    );

    return true;
  } catch (error) {
    console.log("⚠️  Memory operations test partial failure:", error.message);
    return false;
  }
}

async function testStaticMethods() {
  console.log("\n📚 Testing Static Methods");
  console.log("=========================");

  try {
    console.log("获取版本...");
    const version = LibRaw.getVersion();
    console.log("✓ LibRaw 版本:", version);

    console.log("获取相机列表...");
    const cameraList = LibRaw.getCameraList();
    console.log("✓ 相机列表长度:", cameraList.length);

    console.log("获取相机计数...");
    const cameraCount = LibRaw.getCameraCount();
    console.log("✓ 相机计数:", cameraCount);

    console.log("获取功能...");
    const capabilities = LibRaw.getCapabilities();
    console.log("✓ 功能:", capabilities);

    return true;
  } catch (error) {
    console.log("⚠️  Static methods test partial failure:", error.message);
    return false;
  }
}

async function testThumbnailExtraction(processor) {
  console.log("\n🖼️  Testing Thumbnail Extraction");
  console.log("=================================");

  try {
    console.log("提取缩略图...");
    const thumbnail = await processor.getThumbnail();
    console.log(
      "✓ 缩略图已提取，大小:",
      thumbnail ? thumbnail.length : "null",
      "字节"
    );

    return true;
  } catch (error) {
    console.log(
      "⚠️  Thumbnail extraction test partial failure:",
      error.message
    );
    return false;
  }
}

async function testErrorHandling(processor) {
  console.log("\n❌ Testing Error Handling");
  console.log("=========================");

  try {
    // 测试无效文件
    console.log("测试无效文件...");
    try {
      await processor.loadFile("nonexistent.raw");
      console.log("⚠️  预期错误未抛出");
    } catch (error) {
      console.log("✓ 无效文件错误已捕获:", error.message);
    }

    // 测试错误字符串转换
    console.log("测试错误消息...");
    const errorStr = processor.getLastError();
    console.log("✓ 最后错误:", errorStr);

    return true;
  } catch (error) {
    console.log("⚠️  Error handling test partial failure:", error.message);
    return false;
  }
}

async function testLibRaw() {
  console.log("LibRaw Node.js 综合测试套件");
  console.log("=======================================");
  console.log("LibRaw 版本:", LibRaw.getVersion());

  const processor = new LibRaw();
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  try {
    // Test with a sample RAW file (you'll need to provide one)
    const testFile = process.argv[2];

    if (!testFile) {
      console.log("\n用法: node test.js <raw文件路径>");
      console.log("示例: node test.js sample.cr2");
      console.log("\n仅运行静态测试...\n");

      // 仅运行静态测试
      const staticResult = await testStaticMethods();
      testResults.total++;
      if (staticResult) testResults.passed++;
      else testResults.failed++;

      const errorResult = await testErrorHandling(processor);
      testResults.total++;
      if (errorResult) testResults.passed++;
      else testResults.failed++;
    } else {
      // 检查文件是否存在
      if (!fs.existsSync(testFile)) {
        console.log(`❌ 文件未找到: ${testFile}`);
        return;
      }

      // 运行所有测试
      const tests = [
        () => testBasicFunctionality(processor, testFile),
        () => testExtendedUtility(processor),
        () => testAdvancedProcessing(processor),
        () => testColorOperations(processor),
        () => testCancellationSupport(processor),
        () => testMemoryOperations(processor),
        () => testStaticMethods(),
        () => testThumbnailExtraction(processor),
        () => testErrorHandling(processor),
      ];

      for (const test of tests) {
        testResults.total++;
        try {
          const result = await test();
          if (result) testResults.passed++;
          else testResults.failed++;
        } catch (error) {
          console.log(`❌ 测试失败，错误: ${error.message}`);
          testResults.failed++;
        }
      }
    }

    // 清理
    try {
      await processor.close();
      console.log("\n🧹 清理完成");
    } catch (error) {
      console.log("⚠️  清理警告:", error.message);
    }

    // 结果总结
    console.log("\n📊 测试结果总结");
    console.log("=======================");
    console.log(`总测试数: ${testResults.total}`);
    console.log(`通过: ${testResults.passed}`);
    console.log(`失败: ${testResults.failed}`);
    console.log(
      `成功率: ${((testResults.passed / testResults.total) * 100).toFixed(
        1
      )}%`
    );

    if (testResults.failed === 0) {
      console.log("\n🎉 所有测试通过！");
    } else {
      console.log(
        "\n⚠️  部分测试失败 - 这对于某些文件类型或 LibRaw 版本可能是正常的"
      );
    }
  } catch (error) {
    console.error("❌ 致命错误:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 如果直接执行此文件则运行测试
if (require.main === module) {
  testLibRaw().catch(console.error);
}

module.exports = testLibRaw;
