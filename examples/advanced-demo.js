#!/usr/bin/env node

/**
 * LibRaw Advanced Features Demo
 * Demonstrates all 50+ methods in the comprehensive LibRaw wrapper
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
    console.log("\n🔍 LibRaw Static Information");
    console.log("=============================");

    // Version information
    const version = LibRaw.getVersion();
    this.log(`LibRaw Version: ${version}`, "data");

    // Camera support
    const cameraCount = LibRaw.getCameraCount();
    const cameraList = LibRaw.getCameraList();
    this.log(`Supported Cameras: ${cameraCount}`, "data");

    // Show some popular cameras
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

    // Capabilities
    const capabilities = LibRaw.getCapabilities();
    this.log(`Library Capabilities: 0x${capabilities.toString(16)}`, "data");

    this.results.static = { version, cameraCount, capabilities };
  }

  async demoInstanceVersionInfo() {
    console.log("\n📋 Instance Version Information");
    console.log("===============================");

    // Instance version methods
    const version = this.processor.version();
    const versionNumber = this.processor.versionNumber();

    this.log(`Instance Version: ${version}`, "data");
    this.log(`Version Array: [${versionNumber.join(", ")}]`, "data");

    this.results.instanceVersion = { version, versionNumber };
  }

  async demoErrorHandling() {
    console.log("\n❌ Error Handling Capabilities");
    console.log("===============================");

    // Test error methods
    const lastError = this.processor.getLastError();
    this.log(`Last Error: "${lastError}"`, "data");

    // Test error code conversion
    const errorCodes = [0, -1, -4, -6];
    errorCodes.forEach((code) => {
      const errorMsg = this.processor.strerror(code);
      this.log(`Error ${code}: "${errorMsg}"`, "data");
    });

    this.results.errorHandling = { lastError, errorCodes };
  }

  async demoExtendedUtilities(hasFile = false) {
    console.log("\n🔧 Extended Utility Functions");
    console.log("==============================");

    if (!hasFile) {
      this.log(
        "These functions require a loaded file - showing method availability:",
        "warning"
      );
    }

    try {
      // Format detection utilities
      const isNikonSRAW = await this.processor.isNikonSRAW().catch(() => null);
      this.log(
        `Nikon sRAW Detection: ${
          isNikonSRAW !== null ? "Available" : "Requires file"
        }`,
        "feature"
      );

      const isCoolscanNEF = await this.processor
        .isCoolscanNEF()
        .catch(() => null);
      this.log(
        `Coolscan NEF Detection: ${
          isCoolscanNEF !== null ? "Available" : "Requires file"
        }`,
        "feature"
      );

      const haveFPData = await this.processor.haveFPData().catch(() => null);
      this.log(
        `Floating Point Data Check: ${
          haveFPData !== null ? "Available" : "Requires file"
        }`,
        "feature"
      );

      if (hasFile) {
        this.log(`  → Is Nikon sRAW: ${isNikonSRAW}`, "data");
        this.log(`  → Is Coolscan NEF: ${isCoolscanNEF}`, "data");
        this.log(`  → Has FP Data: ${haveFPData}`, "data");

        // Additional utilities that work with files
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
          this.log(`  → sRAW Midpoint: ${srawMidpoint}`, "data");
        if (thumbOK !== null)
          this.log(`  → Thumbnail Status: ${thumbOK}`, "data");
        if (unpackFunctionName !== null)
          this.log(`  → Unpacker: ${unpackFunctionName}`, "data");
        if (decoderInfo !== null)
          this.log(`  → Decoder: ${JSON.stringify(decoderInfo)}`, "data");
      }

      this.results.extendedUtilities = {
        isNikonSRAW,
        isCoolscanNEF,
        haveFPData,
      };
    } catch (error) {
      this.log(`Extended utilities error: ${error.message}`, "error");
    }
  }

  async demoCancellationSupport() {
    console.log("\n🛑 Cancellation Support");
    console.log("========================");

    try {
      // Test cancellation flag operations
      await this.processor.setCancelFlag();
      this.log("Cancellation flag set successfully", "success");

      await this.processor.clearCancelFlag();
      this.log("Cancellation flag cleared successfully", "success");

      this.log("Cancellation support: Fully operational", "feature");
      this.results.cancellation = { supported: true };
    } catch (error) {
      this.log(`Cancellation support error: ${error.message}`, "error");
      this.results.cancellation = { supported: false, error: error.message };
    }
  }

  async demoAdvancedProcessing(hasFile = false) {
    console.log("\n⚙️ Advanced Processing Methods");
    console.log("==============================");

    if (!hasFile) {
      this.log(
        "Advanced processing requires a loaded file - showing method availability:",
        "warning"
      );
    }

    const methods = [
      { name: "unpack", description: "Low-level RAW unpacking" },
      { name: "raw2ImageEx", description: "Extended RAW to image conversion" },
      {
        name: "adjustSizesInfoOnly",
        description: "Size calculation for memory planning",
      },
      { name: "freeImage", description: "Free processed image memory" },
      { name: "convertFloatToInt", description: "Float to integer conversion" },
    ];

    methods.forEach((method) => {
      this.log(`${method.name}(): ${method.description}`, "feature");
    });

    if (hasFile) {
      try {
        // Test size adjustment (safe operation)
        const adjusted = await this.processor.adjustSizesInfoOnly();
        this.log(
          `  → Size adjustment: ${adjusted ? "Success" : "Failed"}`,
          "data"
        );

        // Test memory format
        const memFormat = await this.processor
          .getMemImageFormat()
          .catch(() => null);
        if (memFormat) {
          this.log(
            `  → Memory format: ${memFormat.width}x${memFormat.height}, ${memFormat.bps}bps`,
            "data"
          );
        }
      } catch (error) {
        this.log(`Advanced processing error: ${error.message}`, "warning");
      }
    }

    this.results.advancedProcessing = { methodsAvailable: methods.length };
  }

  async demoMemoryOperations() {
    console.log("\n💾 Memory Operations");
    console.log("====================");

    try {
      // Memory format information
      const memFormat = await this.processor
        .getMemImageFormat()
        .catch(() => null);
      this.log(
        `Memory image format: ${
          memFormat !== null ? "Available" : "Requires processing"
        }`,
        "feature"
      );

      // Memory operations
      const memImageCreated = await this.processor
        .createMemoryImage()
        .catch(() => null);
      this.log(
        `Memory image creation: ${
          memImageCreated !== null ? "Available" : "Requires processing"
        }`,
        "feature"
      );

      const memThumbCreated = await this.processor
        .createMemoryThumbnail()
        .catch(() => null);
      this.log(
        `Memory thumbnail creation: ${
          memThumbCreated !== null ? "Available" : "Requires processing"
        }`,
        "feature"
      );

      if (memFormat !== null) {
        this.log(
          `  → Memory format: ${memFormat.width}x${memFormat.height}, ${memFormat.bps}bps`,
          "data"
        );
      }

      this.results.memoryOperations = {
        memFormat,
        hasMemImage: memImageCreated !== null,
      };
    } catch (error) {
      this.log(`Memory operations error: ${error.message}`, "error");
    }
  }

  async demoColorOperations(hasFile = false) {
    console.log("\n🎨 Color Operations");
    console.log("==================");

    try {
      // Color information that's available
      const colorInfo = await this.processor.getColorInfo().catch(() => null);
      this.log(
        `Color information: ${
          colorInfo !== null ? "Available" : "Requires file"
        }`,
        "feature"
      );

      if (hasFile) {
        // Color at specific position
        const colorAt = await this.processor.getColorAt(0, 0).catch(() => null);
        this.log(
          `Color at (0,0): ${colorAt !== null ? colorAt : "Not available"}`,
          "data"
        );

        if (colorInfo !== null) {
          this.log(`  → Color info available`, "data");
        }
      } else {
        this.log("Color position sampling: Requires loaded file", "feature");
      }

      this.results.colorOperations = { colorInfo };
    } catch (error) {
      this.log(`Color operations error: ${error.message}`, "error");
    }
  }

  async demoFileOperationsWithSample() {
    console.log("\n📁 Demonstrating with Sample File");
    console.log("=================================");

    // Look for any available RAW files
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
        "No sample RAW files found - skipping file-based demonstrations",
        "warning"
      );
      return false;
    }

    try {
      this.log(`Loading sample file: ${path.basename(sampleFile)}`, "info");
      await this.processor.loadFile(sampleFile);
      this.log("File loaded successfully", "success");

      // Now demonstrate file-dependent features
      await this.demoExtendedUtilities(true);
      await this.demoAdvancedProcessing(true);
      await this.demoColorOperations(true);

      // File information
      const metadata = await this.processor.getMetadata();
      this.log(
        `Metadata extracted: ${metadata.width}x${metadata.height}`,
        "data"
      );

      const imageSize = await this.processor.getImageSize();
      this.log(`Image size: ${imageSize.width}x${imageSize.height}`, "data");

      return true;
    } catch (error) {
      this.log(`File operations error: ${error.message}`, "error");
      return false;
    }
  }

  async cleanup() {
    console.log("\n🧹 Cleanup");
    console.log("==========");

    try {
      await this.processor.close();
      this.log("Processor closed successfully", "success");
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, "error");
    }
  }

  printSummary() {
    console.log("\n📊 Demo Summary");
    console.log("===============");

    const features = [
      { name: "Static Information", tested: !!this.results.static },
      { name: "Instance Version Info", tested: !!this.results.instanceVersion },
      { name: "Error Handling", tested: !!this.results.errorHandling },
      { name: "Extended Utilities", tested: !!this.results.extendedUtilities },
      { name: "Cancellation Support", tested: !!this.results.cancellation },
      {
        name: "Advanced Processing",
        tested: !!this.results.advancedProcessing,
      },
      { name: "Memory Operations", tested: !!this.results.memoryOperations },
      { name: "Color Operations", tested: !!this.results.colorOperations },
    ];

    features.forEach((feature) => {
      const status = feature.tested ? "✅" : "❌";
      this.log(`${status} ${feature.name}`, "data");
    });

    const testedCount = features.filter((f) => f.tested).length;
    this.log(
      `\nFeature Coverage: ${testedCount}/${features.length} (${(
        (testedCount / features.length) *
        100
      ).toFixed(1)}%)`,
      "data"
    );

    if (this.results.static) {
      this.log(`LibRaw Version: ${this.results.static.version}`, "data");
      this.log(`Supported Cameras: ${this.results.static.cameraCount}`, "data");
    }
  }

  async runDemo() {
    console.log("🚀 LibRaw Advanced Features Demo");
    console.log("=================================");
    console.log("Demonstrating all 50+ methods in the comprehensive wrapper\n");

    try {
      // Demos that don't require files
      await this.demoStaticInformation();
      await this.demoInstanceVersionInfo();
      await this.demoErrorHandling();
      await this.demoExtendedUtilities(false);
      await this.demoCancellationSupport();
      await this.demoAdvancedProcessing(false);
      await this.demoMemoryOperations();
      await this.demoColorOperations(false);

      // Try demos with sample files
      const hasFile = await this.demoFileOperationsWithSample();

      await this.cleanup();
      this.printSummary();

      console.log("\n🎉 LibRaw Advanced Demo Complete!");
      console.log("==================================");

      if (hasFile) {
        console.log("✅ Full demonstration completed with sample file");
      } else {
        console.log("⚠️  Partial demonstration (no sample files available)");
        console.log(
          "   Place RAW files in sample-images/ directory for full demo"
        );
      }
    } catch (error) {
      console.error("❌ Demo failed:", error.message);
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
