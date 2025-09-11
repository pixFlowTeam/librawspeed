const LibRaw = require("../lib/index.js");

/**
 * Test all static methods of LibRaw
 */

async function testStaticMethods() {
  console.log("🔧 LibRaw Static Methods Test");
  console.log("=".repeat(40));

  console.log("\n📊 Library Information:");

  // Test getVersion
  try {
    const version = LibRaw.getVersion();
    console.log(`   ✅ Version: ${version}`);

    // Validate version format
    if (typeof version !== "string" || version.length === 0) {
      throw new Error("Invalid version format");
    }

    console.log(`   ✅ Version validation passed`);
  } catch (error) {
    console.log(`   ❌ Version test failed: ${error.message}`);
  }

  // Test getCapabilities
  try {
    const capabilities = LibRaw.getCapabilities();
    console.log(
      `   ✅ Capabilities: 0x${capabilities.toString(16)} (${capabilities})`
    );

    // Validate capabilities is a number
    if (typeof capabilities !== "number" || isNaN(capabilities)) {
      throw new Error("Invalid capabilities format");
    }

    console.log(`   ✅ Capabilities validation passed`);
  } catch (error) {
    console.log(`   ❌ Capabilities test failed: ${error.message}`);
  }

  // Test getCameraCount
  try {
    const count = LibRaw.getCameraCount();
    console.log(`   ✅ Camera Count: ${count}`);

    // Validate count is a positive number
    if (typeof count !== "number" || count <= 0) {
      throw new Error("Invalid camera count");
    }

    // Expect at least 1000 cameras in LibRaw 0.21.4
    if (count < 1000) {
      console.log(
        `   ⚠️ Warning: Camera count seems low (${count}), expected 1000+`
      );
    } else {
      console.log(`   ✅ Camera count validation passed`);
    }
  } catch (error) {
    console.log(`   ❌ Camera count test failed: ${error.message}`);
  }

  // Test getCameraList
  try {
    const cameras = LibRaw.getCameraList();
    console.log(`   ✅ Camera List Length: ${cameras.length}`);

    // Validate cameras is an array
    if (!Array.isArray(cameras)) {
      throw new Error("Camera list is not an array");
    }

    // Check array length matches count
    const count = LibRaw.getCameraCount();
    if (cameras.length !== count) {
      throw new Error(
        `Camera list length (${cameras.length}) doesn't match count (${count})`
      );
    }

    // Check first few cameras
    console.log(`   📷 First 10 cameras:`);
    for (let i = 0; i < Math.min(10, cameras.length); i++) {
      if (typeof cameras[i] !== "string" || cameras[i].length === 0) {
        throw new Error(`Invalid camera name at index ${i}: ${cameras[i]}`);
      }
      console.log(`      ${i + 1}. ${cameras[i]}`);
    }

    // Look for some well-known cameras
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

    console.log(`   ✅ Found major brands: ${foundCameras.join(", ")}`);

    if (foundCameras.length < 3) {
      console.log(`   ⚠️ Warning: Few major camera brands found`);
    } else {
      console.log(`   ✅ Camera list validation passed`);
    }
  } catch (error) {
    console.log(`   ❌ Camera list test failed: ${error.message}`);
  }

  // Test specific camera searches
  console.log("\n🔍 Camera Search Tests:");

  try {
    const cameras = LibRaw.getCameraList();

    // Search for Canon cameras
    const canonCameras = cameras.filter((camera) =>
      camera.toLowerCase().includes("canon")
    );
    console.log(`   📷 Canon cameras found: ${canonCameras.length}`);
    if (canonCameras.length > 0) {
      console.log(`      Examples: ${canonCameras.slice(0, 3).join(", ")}`);
    }

    // Search for Nikon cameras
    const nikonCameras = cameras.filter((camera) =>
      camera.toLowerCase().includes("nikon")
    );
    console.log(`   📷 Nikon cameras found: ${nikonCameras.length}`);
    if (nikonCameras.length > 0) {
      console.log(`      Examples: ${nikonCameras.slice(0, 3).join(", ")}`);
    }

    // Search for Sony cameras
    const sonyCameras = cameras.filter((camera) =>
      camera.toLowerCase().includes("sony")
    );
    console.log(`   📷 Sony cameras found: ${sonyCameras.length}`);
    if (sonyCameras.length > 0) {
      console.log(`      Examples: ${sonyCameras.slice(0, 3).join(", ")}`);
    }

    console.log(`   ✅ Camera search tests passed`);
  } catch (error) {
    console.log(`   ❌ Camera search failed: ${error.message}`);
  }

  // Test capability flags
  console.log("\n🚩 Capability Flags Analysis:");

  try {
    const caps = LibRaw.getCapabilities();

    // Define known capability flags (from libraw.h)
    const capabilityFlags = {
      LIBRAW_CAPS_RAWSPEED: 0x1,
      LIBRAW_CAPS_DNG: 0x2,
      LIBRAW_CAPS_DEMOSAIC_PACK_GPL2: 0x4,
      LIBRAW_CAPS_DEMOSAIC_PACK_GPL3: 0x8,
      LIBRAW_CAPS_CRXDEC: 0x10,
    };

    console.log("   Available capabilities:");
    Object.entries(capabilityFlags).forEach(([name, flag]) => {
      const hasCapability = (caps & flag) !== 0;
      console.log(`      ${name}: ${hasCapability ? "✅ Yes" : "❌ No"}`);
    });

    console.log(`   ✅ Capability analysis completed`);
  } catch (error) {
    console.log(`   ❌ Capability analysis failed: ${error.message}`);
  }

  console.log("\n🎉 Static methods test completed!");
  console.log("=".repeat(40));
}

// Run the test
if (require.main === module) {
  testStaticMethods().catch(console.error);
}

module.exports = { testStaticMethods };
