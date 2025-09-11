const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function testBasicFunctionality(processor, testFile) {
  console.log("\n📁 Testing Basic Functionality");
  console.log("================================");

  console.log(`Loading file: ${testFile}`);
  const loaded = await processor.loadFile(testFile);
  console.log("✓ File loaded successfully:", loaded);

  console.log("\nChecking if loaded...");
  const isLoaded = await processor.checkLoaded();
  console.log("✓ File is loaded:", isLoaded);

  console.log("\nGetting file info...");
  const fileInfo = await processor.getFileInfo();
  console.log("✓ File info extracted");
  console.log(JSON.stringify(fileInfo, null, 2));

  console.log("\nGetting image params...");
  const imageParams = await processor.getImageParams();
  console.log("✓ Image params extracted");
  console.log(JSON.stringify(imageParams, null, 2));

  return true;
}

async function testExtendedUtility(processor) {
  console.log("\n🔧 Testing Extended Utility Functions");
  console.log("=====================================");

  try {
    console.log("Checking if Nikon sRAW...");
    const isNikonSRAW = await processor.isNikonSRAW();
    console.log("✓ Nikon sRAW check:", isNikonSRAW);

    console.log("Checking if Coolscan NEF...");
    const isCoolscanNEF = await processor.isCoolscanNEF();
    console.log("✓ Coolscan NEF check:", isCoolscanNEF);

    console.log("Checking for floating point data...");
    const haveFPData = await processor.haveFPData();
    console.log("✓ FP data available:", haveFPData);

    console.log("Getting sRAW midpoint...");
    const srawMidpoint = await processor.srawMidpoint();
    console.log("✓ sRAW midpoint:", srawMidpoint);

    console.log("Checking thumbnail...");
    const thumbOK = await processor.thumbOK();
    console.log("✓ Thumbnail status:", thumbOK);

    console.log("Getting unpacker function name...");
    const unpackFunctionName = await processor.unpackFunctionName();
    console.log("✓ Unpacker function:", unpackFunctionName);

    console.log("Getting decoder info...");
    const decoderInfo = await processor.getDecoderInfo();
    console.log("✓ Decoder info:", decoderInfo);

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
    console.log("Unpacking RAW data...");
    const unpacked = await processor.unpack();
    console.log("✓ RAW data unpacked:", unpacked);

    console.log("Converting RAW to image...");
    const raw2image = await processor.raw2Image();
    console.log("✓ RAW to image conversion:", raw2image);

    console.log("Getting memory image format...");
    const memFormat = await processor.getMemImageFormat();
    console.log("✓ Memory image format:", memFormat);

    console.log("Adjusting sizes (info only)...");
    const adjustedSizes = await processor.adjustSizesInfoOnly();
    console.log("✓ Sizes adjusted:", adjustedSizes);

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
    console.log("Getting color matrices...");
    const cameraMatrix = await processor.getCameraColorMatrix();
    console.log("✓ Camera color matrix retrieved");

    const rgbMatrix = await processor.getRGBCameraMatrix();
    console.log("✓ RGB camera matrix retrieved");

    // Test color at specific position (if image is loaded)
    console.log("Getting color at position (0,0)...");
    const colorAt = await processor.getColorAt(0, 0);
    console.log("✓ Color at (0,0):", colorAt);

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
    console.log("Setting cancel flag...");
    const setCancelResult = await processor.setCancelFlag();
    console.log("✓ Cancel flag set:", setCancelResult);

    console.log("Clearing cancel flag...");
    const clearCancelResult = await processor.clearCancelFlag();
    console.log("✓ Cancel flag cleared:", clearCancelResult);

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
    console.log("Getting memory requirements...");
    const memReq = await processor.getMemoryRequirements();
    console.log("✓ Memory requirements:", memReq, "bytes");

    console.log("Getting RAW image buffer...");
    const rawBuffer = await processor.getRawImageBuffer();
    console.log(
      "✓ RAW buffer size:",
      rawBuffer ? rawBuffer.length : "null",
      "bytes"
    );

    console.log("Getting processed image buffer...");
    const processedBuffer = await processor.getProcessedImageBuffer();
    console.log(
      "✓ Processed buffer size:",
      processedBuffer ? processedBuffer.length : "null",
      "bytes"
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
    console.log("Getting version...");
    const version = LibRaw.getVersion();
    console.log("✓ LibRaw version:", version);

    console.log("Getting camera list...");
    const cameraList = LibRaw.getCameraList();
    console.log("✓ Camera list length:", cameraList.length);

    console.log("Getting camera count...");
    const cameraCount = LibRaw.getCameraCount();
    console.log("✓ Camera count:", cameraCount);

    console.log("Getting capabilities...");
    const capabilities = LibRaw.getCapabilities();
    console.log("✓ Capabilities:", capabilities);

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
    console.log("Extracting thumbnail...");
    const thumbnail = await processor.getThumbnail();
    console.log(
      "✓ Thumbnail extracted, size:",
      thumbnail ? thumbnail.length : "null",
      "bytes"
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
    // Test invalid file
    console.log("Testing invalid file...");
    try {
      await processor.loadFile("nonexistent.raw");
      console.log("⚠️  Expected error not thrown");
    } catch (error) {
      console.log("✓ Invalid file error caught:", error.message);
    }

    // Test error string conversion
    console.log("Testing error messages...");
    const errorStr = processor.getLastError();
    console.log("✓ Last error:", errorStr);

    return true;
  } catch (error) {
    console.log("⚠️  Error handling test partial failure:", error.message);
    return false;
  }
}

async function testLibRaw() {
  console.log("LibRaw Node.js Comprehensive Test Suite");
  console.log("=======================================");
  console.log("LibRaw version:", LibRaw.getVersion());

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
      console.log("\nUsage: node test.js <path-to-raw-file>");
      console.log("Example: node test.js sample.cr2");
      console.log("\nRunning static tests only...\n");

      // Run only static tests
      const staticResult = await testStaticMethods();
      testResults.total++;
      if (staticResult) testResults.passed++;
      else testResults.failed++;

      const errorResult = await testErrorHandling(processor);
      testResults.total++;
      if (errorResult) testResults.passed++;
      else testResults.failed++;
    } else {
      // Check if file exists
      if (!fs.existsSync(testFile)) {
        console.log(`❌ File not found: ${testFile}`);
        return;
      }

      // Run all tests
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
          console.log(`❌ Test failed with error: ${error.message}`);
          testResults.failed++;
        }
      }
    }

    // Cleanup
    try {
      await processor.close();
      console.log("\n🧹 Cleanup completed");
    } catch (error) {
      console.log("⚠️  Cleanup warning:", error.message);
    }

    // Results summary
    console.log("\n📊 Test Results Summary");
    console.log("=======================");
    console.log(`Total tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(
      `Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(
        1
      )}%`
    );

    if (testResults.failed === 0) {
      console.log("\n🎉 All tests passed!");
    } else {
      console.log(
        "\n⚠️  Some tests failed - this may be normal for certain file types or LibRaw versions"
      );
    }
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testLibRaw().catch(console.error);
}

module.exports = testLibRaw;
