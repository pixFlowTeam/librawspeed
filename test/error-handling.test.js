const LibRaw = require("../lib/index.js");

/**
 * Test error handling and edge cases
 */

async function testErrorHandling() {
  console.log("⚠️ LibRaw Error Handling Test");
  console.log("=".repeat(40));

  // Test constructor
  console.log("\n🏗️ Constructor Tests:");
  try {
    const processor = new LibRaw();
    console.log("   ✅ Constructor succeeded");
    await processor.close(); // Clean up
  } catch (error) {
    console.log(`   ❌ Constructor failed: ${error.message}`);
  }

  // Test methods without loading file
  console.log("\n🚫 Methods Without File Loaded:");
  const processor = new LibRaw();

  const methodsRequiringFile = [
    "getMetadata",
    "getImageSize",
    "getAdvancedMetadata",
    "getLensInfo",
    "getColorInfo",
    "unpackThumbnail",
    "processImage",
    "subtractBlack",
    "raw2Image",
    "adjustMaximum",
    "createMemoryImage",
    "createMemoryThumbnail",
    "writePPM",
    "writeTIFF",
    "writeThumbnail",
    "setOutputParams",
    "getOutputParams",
    "isFloatingPoint",
    "isFujiRotated",
    "isSRAW",
    "isJPEGThumb",
    "errorCount",
  ];

  for (const method of methodsRequiringFile) {
    try {
      if (method.startsWith("write") || method === "setOutputParams") {
        // These methods need parameters
        await processor[method]("test.txt");
      } else if (method === "setOutputParams") {
        await processor[method]({});
      } else {
        await processor[method]();
      }
      console.log(`   ❌ ${method}: Should have thrown error but didn't`);
    } catch (error) {
      if (error.message.includes("No file loaded")) {
        console.log(`   ✅ ${method}: Correctly throws 'No file loaded' error`);
      } else {
        console.log(`   ⚠️ ${method}: Unexpected error: ${error.message}`);
      }
    }
  }

  // Test invalid file loading
  console.log("\n📁 Invalid File Loading Tests:");

  // Test non-existent file
  try {
    await processor.loadFile("nonexistent-file.cr2");
    console.log("   ❌ Non-existent file: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ Non-existent file: ${error.message}`);
  }

  // Test invalid file type
  try {
    await processor.loadFile(__filename); // This JavaScript file
    console.log("   ❌ Invalid file type: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ Invalid file type: ${error.message}`);
  }

  // Test empty filename
  try {
    await processor.loadFile("");
    console.log("   ❌ Empty filename: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ Empty filename: ${error.message}`);
  }

  // Test invalid parameter types
  console.log("\n🔢 Invalid Parameter Types:");

  try {
    await processor.loadFile(123); // Number instead of string
    console.log("   ❌ loadFile with number: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ loadFile with number: ${error.message}`);
  }

  try {
    await processor.loadFile(null);
    console.log("   ❌ loadFile with null: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ loadFile with null: ${error.message}`);
  }

  try {
    await processor.loadFile(undefined);
    console.log("   ❌ loadFile with undefined: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ loadFile with undefined: ${error.message}`);
  }

  // Test invalid buffer loading
  console.log("\n📦 Invalid Buffer Loading Tests:");

  try {
    await processor.loadBuffer("not a buffer");
    console.log("   ❌ loadBuffer with string: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ loadBuffer with string: ${error.message}`);
  }

  try {
    await processor.loadBuffer(null);
    console.log("   ❌ loadBuffer with null: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ loadBuffer with null: ${error.message}`);
  }

  // Test empty buffer
  try {
    const emptyBuffer = Buffer.alloc(0);
    await processor.loadBuffer(emptyBuffer);
    console.log("   ❌ Empty buffer: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ Empty buffer: ${error.message}`);
  }

  // Test invalid buffer content
  try {
    const invalidBuffer = Buffer.from("This is not a RAW file");
    await processor.loadBuffer(invalidBuffer);
    console.log("   ❌ Invalid buffer content: Should have thrown error");
  } catch (error) {
    console.log(`   ✅ Invalid buffer content: ${error.message}`);
  }

  // Test multiple operations on same processor
  console.log("\n🔄 Multiple Operations Tests:");

  try {
    // Multiple close calls should not error
    await processor.close();
    await processor.close();
    console.log("   ✅ Multiple close calls: OK");
  } catch (error) {
    console.log(`   ❌ Multiple close calls: ${error.message}`);
  }

  // Test invalid output parameters
  console.log("\n⚙️ Invalid Output Parameters:");

  const processor2 = new LibRaw();

  // Create a dummy RAW-like file for testing parameters
  const fs = require("fs");
  const path = require("path");
  const tempFile = path.join(__dirname, "temp-test.raw");

  try {
    // Create a small buffer that might look like RAW data
    const testBuffer = Buffer.alloc(1024);
    testBuffer.fill(0x42); // Fill with some pattern
    fs.writeFileSync(tempFile, testBuffer);

    try {
      await processor2.loadFile(tempFile);
      console.log("   📁 Loaded temp file for parameter testing");

      // Test invalid parameter types
      try {
        await processor2.setOutputParams("not an object");
        console.log(
          "   ❌ setOutputParams with string: Should have thrown error"
        );
      } catch (error) {
        console.log(`   ✅ setOutputParams with string: ${error.message}`);
      }

      try {
        await processor2.setOutputParams(null);
        console.log(
          "   ❌ setOutputParams with null: Should have thrown error"
        );
      } catch (error) {
        console.log(`   ✅ setOutputParams with null: ${error.message}`);
      }

      // Test valid but edge case parameters
      try {
        await processor2.setOutputParams({
          bright: -1, // Negative brightness
          output_bps: 32, // Invalid bit depth
          output_color: 999, // Invalid color space
        });
        console.log(
          "   ⚠️ Edge case parameters: Accepted (LibRaw may clamp values)"
        );
      } catch (error) {
        console.log(`   ✅ Edge case parameters: ${error.message}`);
      }
    } catch (loadError) {
      console.log(`   ⚠️ Could not load temp file: ${loadError.message}`);
    }
  } catch (fsError) {
    console.log(`   ⚠️ Could not create temp file: ${fsError.message}`);
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    await processor2.close();
  }

  // Test memory stress
  console.log("\n💾 Memory Management Tests:");

  try {
    // Create multiple processors
    const processors = [];
    for (let i = 0; i < 10; i++) {
      processors.push(new LibRaw());
    }

    // Close all processors
    for (const proc of processors) {
      await proc.close();
    }

    console.log("   ✅ Multiple processor creation/cleanup: OK");
  } catch (error) {
    console.log(`   ❌ Multiple processor test: ${error.message}`);
  }

  await processor.close();

  console.log("\n🎉 Error handling test completed!");
  console.log("=".repeat(40));
}

// Run the test
if (require.main === module) {
  testErrorHandling().catch(console.error);
}

module.exports = { testErrorHandling };
