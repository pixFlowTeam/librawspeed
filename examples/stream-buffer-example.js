const LibRaw = require("../lib/index");
const fs = require("fs");

/**
 * Stream/Buffer Operations Example
 *
 * This example demonstrates the new buffer/stream API that returns data directly
 * instead of writing to files. This is useful when you want to:
 * - Process images in memory without filesystem I/O
 * - Send images directly to HTTP responses
 * - Upload processed images to cloud storage
 * - Build image processing pipelines
 */

async function streamBufferExample(inputFile, outputDir) {
  console.log("🚀 LibRaw Stream/Buffer Operations Example");
  console.log("==========================================");
  console.log(`📁 Input: ${inputFile}`);
  console.log(`📂 Output Directory: ${outputDir}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const processor = new LibRaw();
  const startTime = Date.now();

  try {
    // ============== STEP 1: LOAD AND PROCESS RAW ==============
    console.log("\n🔄 Loading RAW Image...");
    await processor.loadFile(inputFile);

    console.log("⚙️ Processing RAW data...");
    await processor.processImage();

    console.log("✅ RAW processing complete");

    // ============== STEP 2: CREATE DIFFERENT FORMAT BUFFERS ==============
    console.log("\n🎨 Creating image buffers in different formats...");

    // Create JPEG buffer (most common use case)
    console.log("📸 Creating JPEG buffer...");
    const jpegResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920, // Resize to web resolution
      progressive: true,
    });
    console.log(`   ✅ JPEG buffer created: ${jpegResult.buffer.length} bytes`);
    console.log(
      `   📐 Dimensions: ${jpegResult.metadata.outputDimensions.width}x${jpegResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${jpegResult.metadata.processing.timeMs}ms`
    );

    // Create PNG buffer (lossless)
    console.log("🖼️ Creating PNG buffer...");
    const pngResult = await processor.createPNGBuffer({
      width: 800, // Smaller for PNG
      compressionLevel: 6,
    });
    console.log(`   ✅ PNG buffer created: ${pngResult.buffer.length} bytes`);
    console.log(
      `   📐 Dimensions: ${pngResult.metadata.outputDimensions.width}x${pngResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${pngResult.metadata.processing.timeMs}ms`
    );

    // Create WebP buffer (modern format)
    console.log("🌐 Creating WebP buffer...");
    const webpResult = await processor.createWebPBuffer({
      quality: 80,
      width: 1200,
      effort: 4,
    });
    console.log(`   ✅ WebP buffer created: ${webpResult.buffer.length} bytes`);
    console.log(
      `   📐 Dimensions: ${webpResult.metadata.outputDimensions.width}x${webpResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${webpResult.metadata.processing.timeMs}ms`
    );

    // Create AVIF buffer (next-gen format)
    console.log("🚀 Creating AVIF buffer...");
    const avifResult = await processor.createAVIFBuffer({
      quality: 50,
      width: 1200,
      effort: 4,
    });
    console.log(`   ✅ AVIF buffer created: ${avifResult.buffer.length} bytes`);
    console.log(
      `   📐 Dimensions: ${avifResult.metadata.outputDimensions.width}x${avifResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${avifResult.metadata.processing.timeMs}ms`
    );

    // Create TIFF buffer (archival)
    console.log("📄 Creating TIFF buffer...");
    const tiffResult = await processor.createTIFFBuffer({
      compression: "lzw",
      width: 2400,
    });
    console.log(`   ✅ TIFF buffer created: ${tiffResult.buffer.length} bytes`);
    console.log(
      `   📐 Dimensions: ${tiffResult.metadata.outputDimensions.width}x${tiffResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${tiffResult.metadata.processing.timeMs}ms`
    );

    // Create thumbnail JPEG buffer
    console.log("🔍 Creating thumbnail JPEG buffer...");
    const thumbResult = await processor.createThumbnailJPEGBuffer({
      quality: 85,
      maxSize: 300,
    });
    console.log(
      `   ✅ Thumbnail buffer created: ${thumbResult.buffer.length} bytes`
    );
    console.log(
      `   📐 Dimensions: ${thumbResult.metadata.outputDimensions.width}x${thumbResult.metadata.outputDimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${thumbResult.metadata.processing.timeMs}ms`
    );

    // Create raw PPM buffer
    console.log("📋 Creating PPM buffer...");
    const ppmResult = await processor.createPPMBuffer();
    console.log(`   ✅ PPM buffer created: ${ppmResult.buffer.length} bytes`);
    console.log(
      `   📐 Dimensions: ${ppmResult.metadata.dimensions.width}x${ppmResult.metadata.dimensions.height}`
    );
    console.log(
      `   ⏱️ Processing time: ${ppmResult.metadata.processing.timeMs}ms`
    );

    // ============== STEP 3: SAVE BUFFERS TO FILES (OPTIONAL) ==============
    console.log("\n💾 Saving buffers to files for demonstration...");

    const baseName = inputFile.split(/[/\\]/).pop().split(".")[0];

    fs.writeFileSync(`${outputDir}/${baseName}_buffer.jpg`, jpegResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.png`, pngResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.webp`, webpResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.avif`, avifResult.buffer);
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.tiff`, tiffResult.buffer);
    fs.writeFileSync(
      `${outputDir}/${baseName}_thumb_buffer.jpg`,
      thumbResult.buffer
    );
    fs.writeFileSync(`${outputDir}/${baseName}_buffer.ppm`, ppmResult.buffer);

    console.log("✅ All buffers saved to files");

    // ============== STEP 4: DEMONSTRATE PRACTICAL USE CASES ==============
    console.log("\n🔧 Practical use case examples:");

    // Example 1: HTTP Response (Express.js style)
    console.log("\n📡 Example 1: HTTP Response");
    console.log("```javascript");
    console.log('app.get("/image/:id", async (req, res) => {');
    console.log("    const processor = new LibRaw();");
    console.log(
      "    await processor.loadFile(`/photos/${req.params.id}.raw`);"
    );
    console.log(
      "    const result = await processor.createJPEGBuffer({ quality: 85, width: 1920 });"
    );
    console.log('    res.set("Content-Type", "image/jpeg");');
    console.log("    res.send(result.buffer);");
    console.log("});");
    console.log("```");

    // Example 2: Cloud Storage Upload
    console.log("\n☁️ Example 2: Cloud Storage Upload");
    console.log("```javascript");
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 90 });"
    );
    console.log("await cloudStorage.upload({");
    console.log('    fileName: "processed-image.jpg",');
    console.log("    buffer: result.buffer,");
    console.log('    contentType: "image/jpeg"');
    console.log("});");
    console.log("```");

    // Example 3: Image Processing Pipeline
    console.log("\n🔄 Example 3: Processing Pipeline");
    console.log("```javascript");
    console.log("// Create multiple sizes for responsive images");
    console.log("const sizes = [");
    console.log('    { name: "large", width: 1920 },');
    console.log('    { name: "medium", width: 1200 },');
    console.log('    { name: "small", width: 800 },');
    console.log('    { name: "thumb", width: 300 }');
    console.log("];");
    console.log("");
    console.log("const results = await Promise.all(");
    console.log("    sizes.map(size => processor.createJPEGBuffer({");
    console.log("        width: size.width,");
    console.log("        quality: 85");
    console.log("    }))");
    console.log(");");
    console.log("```");

    // ============== STEP 5: PERFORMANCE SUMMARY ==============
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log("\n📊 Performance Summary:");
    console.log(`   ⏱️ Total processing time: ${totalTime}ms`);

    const formats = [
      { name: "JPEG", result: jpegResult },
      { name: "PNG", result: pngResult },
      { name: "WebP", result: webpResult },
      { name: "AVIF", result: avifResult },
      { name: "TIFF", result: tiffResult },
      { name: "Thumbnail", result: thumbResult },
      { name: "PPM", result: ppmResult },
    ];

    formats.forEach(({ name, result }) => {
      const compressionRatio =
        result.metadata.fileSize.compressionRatio || "N/A";
      console.log(
        `   📸 ${name}: ${result.buffer.length} bytes (ratio: ${compressionRatio})`
      );
    });

    // Size comparison
    const sizes = formats.map((f) => f.result.buffer.length);
    const smallest = Math.min(...sizes);
    const largest = Math.max(...sizes);
    console.log(`   📏 Size range: ${smallest} - ${largest} bytes`);
    console.log(
      `   📈 Compression efficiency: AVIF < WebP < JPEG < PNG < TIFF < PPM`
    );

    // ============== CLEANUP ==============
    console.log("\n🧹 Cleaning up...");
    await processor.close();

    console.log("\n✅ Stream/Buffer example complete!");
    console.log("\n💡 Key Benefits:");
    console.log("   • No filesystem I/O required");
    console.log("   • Direct memory-to-memory processing");
    console.log("   • Perfect for web services and APIs");
    console.log("   • Enables streaming and real-time processing");
    console.log("   • Reduces disk space usage");
    console.log("   • Faster for cloud deployments");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nMake sure you have:");
    console.error("1. Built the addon with: npm run build");
    console.error("2. Provided a valid RAW file path");
    console.error("3. The RAW file is accessible and not corrupted");
    console.error("4. Sharp is installed: npm install sharp");
  }
}

// Usage instructions
if (process.argv.length < 3) {
  console.log(
    "Usage: node stream-buffer-example.js <path-to-raw-file> [output-dir]"
  );
  console.log(
    "Example: node stream-buffer-example.js C:\\photos\\IMG_1234.CR2 ./output"
  );
  process.exit(1);
}

const inputFile = process.argv[2];
const outputDir = process.argv[3] || "./buffer-output";

streamBufferExample(inputFile, outputDir);
