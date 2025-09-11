const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Test configuration and output parameters
 */

async function testConfiguration() {
  console.log("⚙️ LibRaw Configuration Test");
  console.log("=".repeat(40));

  // Create a dummy file for testing (since we need a loaded file for config tests)
  const testBuffer = Buffer.alloc(4096);
  testBuffer.fill(0x42);

  const tempFile = path.join(__dirname, "temp-config-test.raw");

  try {
    fs.writeFileSync(tempFile, testBuffer);

    const processor = new LibRaw();

    try {
      // Try to load the dummy file (will likely fail, but we'll handle it)
      await processor.loadFile(tempFile);
      console.log("   📁 Loaded test file (unexpected success)");
    } catch (loadError) {
      console.log(
        "   ⚠️ Could not load dummy file (expected), testing configuration without file..."
      );
    }

    await testOutputParameters(processor);
    await testParameterValidation(processor);
    await testParameterRanges(processor);

    await processor.close();
  } catch (error) {
    console.log(`   ❌ Configuration test setup error: ${error.message}`);
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  // Test with real file if available
  await testWithRealFile();

  console.log("\n🎉 Configuration test completed!");
  console.log("=".repeat(40));
}

async function testOutputParameters(processor) {
  console.log("\n📊 Output Parameters Tests:");

  // Test default parameters (this requires a loaded file)
  try {
    const defaultParams = await processor.getOutputParams();
    console.log("   ✅ Retrieved default parameters:");
    console.log(
      `      Gamma: [${defaultParams.gamma[0]}, ${defaultParams.gamma[1]}]`
    );
    console.log(`      Brightness: ${defaultParams.bright}`);
    console.log(`      Output Color: ${defaultParams.output_color}`);
    console.log(`      Output BPS: ${defaultParams.output_bps}`);
    console.log(`      Auto Brightness: ${!defaultParams.no_auto_bright}`);
    console.log(`      Highlight Mode: ${defaultParams.highlight}`);
    console.log(`      Output TIFF: ${defaultParams.output_tiff}`);
  } catch (error) {
    if (error.message.includes("No file loaded")) {
      console.log("   ℹ️ Default parameters require a loaded file (expected behavior)");
    } else {
      console.log(`   ⚠️ Could not get default parameters: ${error.message}`);
    }
  }

  // Test setting parameters
  const testConfigs = [
    {
      name: "Standard sRGB",
      params: {
        gamma: [2.2, 4.5],
        bright: 1.0,
        output_color: 1, // sRGB
        output_bps: 16,
        no_auto_bright: false,
        highlight: 0,
      },
    },
    {
      name: "Adobe RGB",
      params: {
        gamma: [2.2, 4.5],
        bright: 1.0,
        output_color: 2, // Adobe RGB
        output_bps: 16,
        no_auto_bright: false,
        highlight: 1,
      },
    },
    {
      name: "High brightness",
      params: {
        gamma: [1.8, 4.5],
        bright: 1.5,
        output_color: 1,
        output_bps: 8,
        no_auto_bright: true,
        highlight: 2,
      },
    },
    {
      name: "ProPhoto RGB",
      params: {
        gamma: [2.2, 4.5],
        bright: 1.0,
        output_color: 4, // ProPhoto RGB
        output_bps: 16,
        no_auto_bright: false,
        highlight: 1,
        output_tiff: true,
      },
    },
  ];

  for (const config of testConfigs) {
    try {
      await processor.setOutputParams(config.params);
      console.log(`   ✅ Set ${config.name} parameters`);

      // Verify parameters were set
      try {
        const retrievedParams = await processor.getOutputParams();

        // Check a few key parameters
        const gammaMatch =
          Math.abs(retrievedParams.gamma[0] - config.params.gamma[0]) < 0.01;
        const brightMatch =
          Math.abs(retrievedParams.bright - config.params.bright) < 0.01;
        const colorMatch =
          retrievedParams.output_color === config.params.output_color;

        if (gammaMatch && brightMatch && colorMatch) {
          console.log(`   ✅ ${config.name} parameters verified`);
        } else {
          console.log(
            `   ⚠️ ${config.name} parameters may not have been set correctly`
          );
        }
      } catch (getError) {
        if (getError.message.includes("No file loaded")) {
          console.log(`   ℹ️ ${config.name} parameters set (verification requires loaded file)`);
        } else {
          console.log(
            `   ⚠️ Could not verify ${config.name} parameters: ${getError.message}`
          );
        }
      }
    } catch (setError) {
      if (setError.message.includes("No file loaded")) {
        console.log(`   ℹ️ ${config.name} parameters require a loaded file (expected behavior)`);
      } else {
        console.log(
          `   ⚠️ Could not set ${config.name} parameters: ${setError.message}`
        );
      }
    }
  }
}

async function testParameterValidation(processor) {
  console.log("\n🔍 Parameter Validation Tests:");

  const invalidConfigs = [
    {
      name: "String instead of object",
      params: "invalid",
      expectedError: "Expected object",
    },
    {
      name: "Null parameters",
      params: null,
      expectedError: "Expected object",
    },
    {
      name: "Array instead of object",
      params: [1, 2, 3],
      expectedError: "Expected object",
    },
  ];

  for (const config of invalidConfigs) {
    try {
      await processor.setOutputParams(config.params);
      console.log(`   ❌ ${config.name}: Should have thrown error`);
    } catch (error) {
      if (error.message.includes("No file loaded")) {
        console.log(`   ℹ️ ${config.name}: Requires loaded file (expected behavior)`);
      } else if (
        error.message.includes(config.expectedError) ||
        error.message.includes("Expected object") ||
        error.message.includes("TypeError")
      ) {
        console.log(`   ✅ ${config.name}: Correctly rejected`);
      } else {
        console.log(`   ⚠️ ${config.name}: Unexpected error: ${error.message}`);
      }
    }
  }
}

async function testParameterRanges(processor) {
  console.log("\n📏 Parameter Range Tests:");

  const rangeTests = [
    {
      name: "Extreme brightness",
      params: { bright: 10.0 }, // Very high brightness
      acceptable: true, // LibRaw may clamp this
    },
    {
      name: "Negative brightness",
      params: { bright: -1.0 },
      acceptable: true, // LibRaw may clamp this
    },
    {
      name: "Zero brightness",
      params: { bright: 0.0 },
      acceptable: true,
    },
    {
      name: "High gamma",
      params: { gamma: [5.0, 10.0] },
      acceptable: true,
    },
    {
      name: "Low gamma",
      params: { gamma: [0.1, 0.1] },
      acceptable: true,
    },
    {
      name: "Invalid output_bps",
      params: { output_bps: 32 }, // Only 8 and 16 are typically valid
      acceptable: true, // LibRaw may handle this
    },
    {
      name: "Invalid color space",
      params: { output_color: 999 },
      acceptable: true, // LibRaw may clamp this
    },
    {
      name: "High highlight mode",
      params: { highlight: 20 }, // Typically 0-9
      acceptable: true, // LibRaw may clamp this
    },
    {
      name: "Negative highlight mode",
      params: { highlight: -5 },
      acceptable: true, // LibRaw may clamp this
    },
  ];

  for (const test of rangeTests) {
    try {
      await processor.setOutputParams(test.params);

      if (test.acceptable) {
        console.log(`   ✅ ${test.name}: Accepted (may be clamped by LibRaw)`);
      } else {
        console.log(`   ⚠️ ${test.name}: Unexpectedly accepted`);
      }
    } catch (error) {
      if (error.message.includes("No file loaded")) {
        console.log(`   ℹ️ ${test.name}: Requires loaded file (expected behavior)`);
      } else if (test.acceptable) {
        console.log(
          `   ⚠️ ${test.name}: Rejected (stricter validation): ${error.message}`
        );
      } else {
        console.log(`   ✅ ${test.name}: Correctly rejected`);
      }
    }
  }
}

async function testWithRealFile() {
  console.log("\n📁 Real File Configuration Tests:");

  // Look for a real RAW file
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  if (!fs.existsSync(sampleImagesDir)) {
    console.log("   ⚠️ No sample images directory found");
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
    console.log("   ℹ️ No RAW sample files found");
    return;
  }

  const testFile = path.join(sampleImagesDir, sampleFiles[0]);
  const processor = new LibRaw();

  try {
    await processor.loadFile(testFile);
    console.log(`   📁 Loaded real file: ${sampleFiles[0]}`);

    // Test configuration with loaded file
    console.log("   ⚙️ Testing configuration with loaded file...");

    // Get initial parameters
    const initialParams = await processor.getOutputParams();
    console.log("   📊 Initial parameters retrieved");

    // Test parameter changes
    const testParam = {
      bright: 1.2,
      gamma: [2.2, 4.5],
      output_color: 1,
      output_bps: 16,
    };

    await processor.setOutputParams(testParam);
    console.log("   ✅ Parameters updated successfully");

    // Verify changes
    const updatedParams = await processor.getOutputParams();

    if (Math.abs(updatedParams.bright - testParam.bright) < 0.01) {
      console.log("   ✅ Brightness parameter correctly updated");
    } else {
      console.log(
        `   ⚠️ Brightness mismatch: set ${testParam.bright}, got ${updatedParams.bright}`
      );
    }

    if (updatedParams.output_color === testParam.output_color) {
      console.log("   ✅ Output color parameter correctly updated");
    } else {
      console.log(
        `   ⚠️ Output color mismatch: set ${testParam.output_color}, got ${updatedParams.output_color}`
      );
    }

    // Test processing with custom parameters
    console.log("   🔄 Testing processing with custom parameters...");

    try {
      await processor.raw2Image();
      await processor.processImage();
      console.log("   ✅ Processing with custom parameters succeeded");

      // Test creating memory image with custom settings
      try {
        const imageData = await processor.createMemoryImage();
        console.log(
          `   ✅ Memory image created: ${imageData.width}x${imageData.height}, ${imageData.bits}-bit`
        );
      } catch (memError) {
        console.log(`   ⚠️ Memory image creation: ${memError.message}`);
      }
    } catch (processError) {
      console.log(
        `   ⚠️ Processing with custom parameters: ${processError.message}`
      );
    }
  } catch (error) {
    console.log(`   ⚠️ Real file test error: ${error.message}`);
  } finally {
    await processor.close();
  }
}

// Run the test
if (require.main === module) {
  testConfiguration().catch(console.error);
}

module.exports = {
  testConfiguration,
  testOutputParameters,
  testParameterValidation,
  testParameterRanges,
};
