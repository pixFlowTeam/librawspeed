const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Test buffer operations and memory handling
 */

async function testBufferOperations() {
  console.log("📦 LibRaw Buffer Operations Test");
  console.log("=".repeat(40));

  // Find a sample image to test with
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  if (!fs.existsSync(sampleImagesDir)) {
    console.log("\nℹ️ No sample images directory found");
    console.log("   Creating sample test data...");

    // Create test buffer data
    await testWithSyntheticData();
    return;
  }

  // Look for RAW files in subdirectories
  const sampleFiles = [];
  const subdirs = fs.readdirSync(sampleImagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const subdir of subdirs) {
    const subdirPath = path.join(sampleImagesDir, subdir);
    const files = fs.readdirSync(subdirPath)
      .filter(f => f.toLowerCase().match(/\.(cr2|cr3|nef|arw|raf|rw2|dng)$/))
      .map(f => path.join(subdir, f));
    sampleFiles.push(...files);
  }

  if (sampleFiles.length === 0) {
    console.log("\nℹ️ No RAW sample files found");
    console.log("   Creating sample test data...");

    await testWithSyntheticData();
    return;
  }

  const testFile = path.join(sampleImagesDir, sampleFiles[0]);
  console.log(`\n📁 Testing with: ${sampleFiles[0]}`);

  await testWithRealFile(testFile);
}

async function testWithRealFile(filePath) {
  console.log("\n📂 Real File Buffer Tests:");

  const processor1 = new LibRaw();
  const processor2 = new LibRaw();

  try {
    // Load same file via file path and buffer
    console.log("   🔄 Loading via file path...");
    await processor1.loadFile(filePath);

    console.log("   📦 Loading same file via buffer...");
    const buffer = fs.readFileSync(filePath);
    console.log(
      `   📊 Buffer size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
    );
    await processor2.loadBuffer(buffer);

    // Compare metadata from both methods
    console.log("   🔍 Comparing metadata...");
    const metadata1 = await processor1.getMetadata();
    const metadata2 = await processor2.getMetadata();

    const compareFields = [
      "make",
      "model",
      "width",
      "height",
      "rawWidth",
      "rawHeight",
      "colors",
      "iso",
    ];
    let differences = 0;

    for (const field of compareFields) {
      if (metadata1[field] !== metadata2[field]) {
        console.log(
          `   ⚠️ Difference in ${field}: file=${metadata1[field]}, buffer=${metadata2[field]}`
        );
        differences++;
      }
    }

    if (differences === 0) {
      console.log("   ✅ Metadata identical between file and buffer loading");
    } else {
      console.log(`   ⚠️ Found ${differences} metadata differences`);
    }

    // Compare image sizes
    const size1 = await processor1.getImageSize();
    const size2 = await processor2.getImageSize();

    if (size1.width === size2.width && size1.height === size2.height) {
      console.log("   ✅ Image sizes identical");
    } else {
      console.log("   ⚠️ Image sizes differ");
    }

    // Test processing both
    console.log("   🔄 Processing both images...");

    try {
      await processor1.raw2Image();
      await processor1.processImage();
      console.log("   ✅ File-loaded image processed");
    } catch (e) {
      console.log(`   ⚠️ File processing: ${e.message}`);
    }

    try {
      await processor2.raw2Image();
      await processor2.processImage();
      console.log("   ✅ Buffer-loaded image processed");
    } catch (e) {
      console.log(`   ⚠️ Buffer processing: ${e.message}`);
    }

    // Test memory image creation
    console.log("   💾 Testing memory image creation...");

    try {
      const image1 = await processor1.createMemoryImage();
      const image2 = await processor2.createMemoryImage();

      console.log(
        `   📊 File image: ${image1.width}x${image1.height}, ${image1.dataSize} bytes`
      );
      console.log(
        `   📊 Buffer image: ${image2.width}x${image2.height}, ${image2.dataSize} bytes`
      );

      if (
        image1.width === image2.width &&
        image1.height === image2.height &&
        image1.dataSize === image2.dataSize
      ) {
        console.log("   ✅ Memory images identical in size");
      } else {
        console.log("   ⚠️ Memory images differ in size");
      }
    } catch (e) {
      console.log(`   ⚠️ Memory image creation: ${e.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Real file test error: ${error.message}`);
  } finally {
    await processor1.close();
    await processor2.close();
  }
}

async function testWithSyntheticData() {
  console.log("\n🧪 Synthetic Buffer Tests:");

  const processor = new LibRaw();

  // Test various buffer sizes
  const testSizes = [0, 1, 100, 1024, 10240];

  for (const size of testSizes) {
    try {
      const buffer = Buffer.alloc(size);
      buffer.fill(0x42); // Fill with pattern

      await processor.loadBuffer(buffer);
      console.log(`   ❌ Buffer size ${size}: Should have failed but didn't`);
    } catch (error) {
      console.log(
        `   ✅ Buffer size ${size}: Correctly failed - ${error.message.substring(
          0,
          50
        )}...`
      );
    }
  }

  await processor.close();
}

async function testBufferMemoryManagement() {
  console.log("\n💾 Buffer Memory Management Tests:");

  const processor = new LibRaw();

  try {
    // Test with large buffers
    console.log("   🔄 Testing large buffer allocation...");

    const largeSizes = [1024 * 1024, 10 * 1024 * 1024, 50 * 1024 * 1024]; // 1MB, 10MB, 50MB

    for (const size of largeSizes) {
      try {
        console.log(
          `   📊 Allocating ${(size / 1024 / 1024).toFixed(1)}MB buffer...`
        );
        const largeBuffer = Buffer.alloc(size);

        // Fill with some pattern to ensure memory is actually allocated
        for (let i = 0; i < size; i += 1024) {
          largeBuffer[i] = i % 256;
        }

        console.log(
          `   ✅ ${(size / 1024 / 1024).toFixed(1)}MB buffer allocated`
        );

        // Try to load it (will fail, but tests memory handling)
        try {
          await processor.loadBuffer(largeBuffer);
          console.log(`   ⚠️ Large buffer unexpectedly loaded`);
        } catch (loadError) {
          console.log(`   ✅ Large buffer correctly rejected`);
        }

        // Clear reference
        // largeBuffer will be garbage collected
      } catch (allocError) {
        console.log(
          `   ⚠️ Could not allocate ${(size / 1024 / 1024).toFixed(1)}MB: ${
            allocError.message
          }`
        );
      }
    }

    // Test rapid buffer creation/destruction
    console.log("   🔄 Testing rapid buffer operations...");

    for (let i = 0; i < 100; i++) {
      try {
        const testBuffer = Buffer.alloc(1024);
        testBuffer.fill(i % 256);

        // Try to load (will fail, but tests rapid allocation)
        try {
          await processor.loadBuffer(testBuffer);
        } catch (e) {
          // Expected to fail
        }

        if (i % 20 === 0) {
          console.log(`   📊 Completed ${i}/100 rapid operations`);
        }
      } catch (error) {
        console.log(`   ⚠️ Rapid operation ${i} failed: ${error.message}`);
        break;
      }
    }

    console.log("   ✅ Rapid buffer operations completed");
  } catch (error) {
    console.log(`   ❌ Memory management test error: ${error.message}`);
  } finally {
    await processor.close();
  }
}

async function testBufferCornerCases() {
  console.log("\n🎯 Buffer Corner Cases:");

  const processor = new LibRaw();

  try {
    // Test buffer with different content patterns
    const patterns = [
      { name: "All zeros", fill: 0x00 },
      { name: "All ones", fill: 0xff },
      { name: "Alternating", fill: null },
      { name: "Random", fill: null },
    ];

    for (const pattern of patterns) {
      try {
        const buffer = Buffer.alloc(4096);

        if (pattern.fill !== null) {
          buffer.fill(pattern.fill);
        } else if (pattern.name === "Alternating") {
          for (let i = 0; i < buffer.length; i++) {
            buffer[i] = i % 2 === 0 ? 0x55 : 0xaa;
          }
        } else if (pattern.name === "Random") {
          for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
          }
        }

        await processor.loadBuffer(buffer);
        console.log(`   ❌ ${pattern.name} pattern: Should have failed`);
      } catch (error) {
        console.log(`   ✅ ${pattern.name} pattern: Correctly rejected`);
      }
    }

    // Test Buffer vs Uint8Array
    console.log("   🔄 Testing different buffer types...");

    try {
      const uint8Array = new Uint8Array(1024);
      uint8Array.fill(0x42);

      // Convert to Buffer
      const bufferFromUint8 = Buffer.from(uint8Array);

      await processor.loadBuffer(bufferFromUint8);
      console.log("   ❌ Uint8Array buffer: Should have failed");
    } catch (error) {
      console.log("   ✅ Uint8Array buffer: Correctly rejected");
    }
  } catch (error) {
    console.log(`   ❌ Corner cases test error: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// Main test function
async function runAllBufferTests() {
  await testBufferOperations();
  await testBufferMemoryManagement();
  await testBufferCornerCases();

  console.log("\n🎉 All buffer tests completed!");
  console.log("=".repeat(40));
}

// Run the test
if (require.main === module) {
  runAllBufferTests().catch(console.error);
}

module.exports = {
  testBufferOperations,
  testBufferMemoryManagement,
  testBufferCornerCases,
  runAllBufferTests,
};
