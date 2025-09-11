const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function jpegConversionExample() {
  console.log("LibRaw JPEG Conversion Example");
  console.log("===============================\n");

  const processor = new LibRaw();

  try {
    // Replace with your RAW file path
    const rawFile = process.argv[2] || "sample.cr2";

    if (!fs.existsSync(rawFile)) {
      console.log("❌ RAW file not found:", rawFile);
      console.log(
        "\nUsage: node jpeg-conversion-example.js <path-to-raw-file>"
      );
      console.log(
        "Example: node jpeg-conversion-example.js C:\\photos\\IMG_1234.CR2"
      );
      return;
    }

    console.log(`📁 Loading RAW file: ${rawFile}`);
    await processor.loadFile(rawFile);

    console.log("📊 Analyzing image for optimal settings...");
    const metadata = await processor.getMetadata();

    console.log(`\n📷 Image Information:`);
    console.log(`   Camera: ${metadata.make} ${metadata.model}`);
    console.log(`   Dimensions: ${metadata.width} x ${metadata.height}`);
    console.log(
      `   Megapixels: ${((metadata.width * metadata.height) / 1000000).toFixed(
        1
      )}MP`
    );

    // Create output directory
    const outputDir = path.join(__dirname, "jpeg-examples");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const baseName = path.basename(rawFile, path.extname(rawFile));

    // Example 1: Basic JPEG conversion with default settings
    console.log("\n🖼️  Example 1: Basic JPEG conversion (default quality)");
    const basicOutput = path.join(outputDir, `${baseName}_basic.jpg`);
    const basicResult = await processor.convertToJPEG(basicOutput);
    console.log(`   ✅ Saved: ${basicOutput}`);
    console.log(
      `   📊 Size: ${(basicResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(`   ⚡ Time: ${basicResult.metadata.processing.timeMs}ms`);
    console.log(
      `   📉 Compression: ${basicResult.metadata.fileSize.compressionRatio}x`
    );

    // Example 2: High-quality JPEG for print
    console.log("\n🖼️  Example 2: High-quality JPEG for print");
    const printOutput = path.join(outputDir, `${baseName}_print.jpg`);
    const printResult = await processor.convertToJPEG(printOutput, {
      quality: 95,
      chromaSubsampling: "4:2:2", // Better chroma for print
      trellisQuantisation: true, // Better compression
      optimizeCoding: true,
    });
    console.log(`   ✅ Saved: ${printOutput}`);
    console.log(
      `   📊 Size: ${(printResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(`   ⚡ Time: ${printResult.metadata.processing.timeMs}ms`);

    // Example 3: Web-optimized JPEG with resize
    console.log("\n🖼️  Example 3: Web-optimized JPEG (1920px wide)");
    const webOutput = path.join(outputDir, `${baseName}_web.jpg`);
    const webResult = await processor.convertToJPEG(webOutput, {
      quality: 80,
      width: 1920, // Resize to 1920px width
      progressive: true, // Progressive loading
      mozjpeg: true, // Better compression
      optimizeScans: true,
    });
    console.log(`   ✅ Saved: ${webOutput}`);
    console.log(
      `   📊 Size: ${(webResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(
      `   📐 Dimensions: ${webResult.metadata.outputDimensions.width}x${webResult.metadata.outputDimensions.height}`
    );
    console.log(`   ⚡ Time: ${webResult.metadata.processing.timeMs}ms`);

    // Example 4: Thumbnail creation
    console.log("\n🖼️  Example 4: Thumbnail creation (400x300)");
    const thumbOutput = path.join(outputDir, `${baseName}_thumb.jpg`);
    const thumbResult = await processor.convertToJPEG(thumbOutput, {
      quality: 85,
      width: 400,
      height: 300,
      chromaSubsampling: "4:2:2", // Better quality for small images
    });
    console.log(`   ✅ Saved: ${thumbOutput}`);
    console.log(
      `   📊 Size: ${(thumbResult.metadata.fileSize.compressed / 1024).toFixed(
        1
      )}KB`
    );
    console.log(
      `   📐 Dimensions: ${thumbResult.metadata.outputDimensions.width}x${thumbResult.metadata.outputDimensions.height}`
    );

    // Example 5: Get optimal settings recommendations
    console.log("\n🧠 Example 5: AI-optimized settings analysis");
    const webSettings = await processor.getOptimalJPEGSettings({
      usage: "web",
    });
    console.log(`   🎯 Recommended for web:`);
    console.log(`      Quality: ${webSettings.recommended.quality}`);
    console.log(`      Progressive: ${webSettings.recommended.progressive}`);
    console.log(`      Chroma: ${webSettings.recommended.chromaSubsampling}`);
    console.log(`      Category: ${webSettings.imageAnalysis.category}`);

    // Apply the recommended settings
    const optimizedOutput = path.join(outputDir, `${baseName}_optimized.jpg`);
    const optimizedResult = await processor.convertToJPEG(
      optimizedOutput,
      webSettings.recommended
    );
    console.log(
      `   ✅ Applied optimal settings: ${(
        optimizedResult.metadata.fileSize.compressed / 1024
      ).toFixed(1)}KB`
    );

    console.log("\n📊 Performance Summary:");
    console.log("   ========================");
    console.log(`   📁 Total files created: 5`);
    console.log(`   📂 Output directory: ${outputDir}`);

    // Show file size comparison
    const outputs = [
      { name: "Basic (Q85)", path: basicOutput },
      { name: "Print (Q95)", path: printOutput },
      { name: "Web (1920px)", path: webOutput },
      { name: "Thumbnail", path: thumbOutput },
      { name: "Optimized", path: optimizedOutput },
    ];

    console.log("\n   📋 File Size Comparison:");
    outputs.forEach((output) => {
      if (fs.existsSync(output.path)) {
        const stats = fs.statSync(output.path);
        console.log(
          `      ${output.name}: ${(stats.size / 1024).toFixed(1)}KB`
        );
      }
    });

    console.log("\n🧹 Cleaning up...");
    await processor.close();

    console.log("\n✅ JPEG conversion examples completed!");
    console.log("🎉 Check the output files to see the quality differences");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nMake sure you have:");
    console.error("1. Built the addon with: npm run build");
    console.error("2. Installed Sharp: npm install sharp");
    console.error("3. Provided a valid RAW file path");
    console.error("4. The RAW file is accessible and not corrupted");

    // Show available sample files if no argument provided
    if (!process.argv[2]) {
      const sampleDir = path.join(__dirname, "..", "sample-images");
      if (fs.existsSync(sampleDir)) {
        const files = fs
          .readdirSync(sampleDir)
          .filter((f) =>
            [".cr2", ".cr3", ".nef", ".arw", ".dng", ".raf", ".rw2"].includes(
              path.extname(f).toLowerCase()
            )
          );
        if (files.length > 0) {
          console.error("\nAvailable sample files:");
          files.forEach((file) => {
            console.error(`   ${path.join(sampleDir, file)}`);
          });
        }
      }
    }
  }
}

// Usage instructions
if (process.argv.length < 3) {
  console.log("LibRaw JPEG Conversion Example");
  console.log("Usage: node jpeg-conversion-example.js <path-to-raw-file>");
  console.log("");
  console.log("Examples:");
  console.log("  node jpeg-conversion-example.js C:\\photos\\IMG_1234.CR2");
  console.log(
    "  node jpeg-conversion-example.js /home/user/photos/DSC_0001.NEF"
  );
  console.log("  node jpeg-conversion-example.js ./sample-images/photo.ARW");
  console.log("");
  console.log("This example will create 5 different JPEG versions:");
  console.log("  1. Basic quality (default settings)");
  console.log("  2. High quality for print");
  console.log("  3. Web-optimized with resize");
  console.log("  4. Thumbnail version");
  console.log("  5. AI-optimized settings");
  process.exit(1);
}

jpegConversionExample();
