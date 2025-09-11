const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Demo test showing the buffer creation methods in action
 * This serves as both a test and documentation example
 */

async function demonstrateBufferMethods() {
  console.log("🎨 LibRaw Buffer Methods Demonstration");
  console.log("=".repeat(50));

  const processor = new LibRaw();
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  const outputDir = path.join(__dirname, "demo-output");

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Find a test file
    const files = fs.readdirSync(sampleImagesDir);
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".raf",
      ".rw2",
      ".dng",
    ];
    const testFile = files.find((file) => {
      const ext = path.extname(file).toLowerCase();
      return rawExtensions.includes(ext);
    });

    if (!testFile) {
      throw new Error("No RAW test file found");
    }

    const fullPath = path.join(sampleImagesDir, testFile);
    console.log(`📁 Processing: ${testFile}`);

    // Load and process the RAW file
    await processor.loadFile(fullPath);
    console.log("✅ File loaded successfully");

    await processor.processImage();
    console.log("✅ Image processed successfully");

    // Demonstrate each buffer method
    console.log("\n📸 Creating different format buffers...");

    // 1. JPEG Buffer
    console.log("  • Creating JPEG buffer...");
    const jpegResult = await processor.createJPEGBuffer({
      quality: 85,
      width: 1200,
    });
    if (jpegResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.jpg"), jpegResult.buffer);
      console.log(
        `    ✅ JPEG: ${(jpegResult.buffer.length / 1024).toFixed(1)}KB, ${
          jpegResult.metadata.outputDimensions.width
        }x${jpegResult.metadata.outputDimensions.height}`
      );
    }

    // 2. PNG Buffer
    console.log("  • Creating PNG buffer...");
    const pngResult = await processor.createPNGBuffer({
      width: 800,
      compressionLevel: 6,
    });
    if (pngResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.png"), pngResult.buffer);
      console.log(
        `    ✅ PNG: ${(pngResult.buffer.length / 1024).toFixed(1)}KB, ${
          pngResult.metadata.outputDimensions.width
        }x${pngResult.metadata.outputDimensions.height}`
      );
    }

    // 3. WebP Buffer
    console.log("  • Creating WebP buffer...");
    const webpResult = await processor.createWebPBuffer({
      quality: 80,
      width: 1000,
    });
    if (webpResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.webp"), webpResult.buffer);
      console.log(
        `    ✅ WebP: ${(webpResult.buffer.length / 1024).toFixed(1)}KB, ${
          webpResult.metadata.outputDimensions.width
        }x${webpResult.metadata.outputDimensions.height}`
      );
    }

    // 4. AVIF Buffer (next-gen format)
    console.log("  • Creating AVIF buffer...");
    try {
      const avifResult = await processor.createAVIFBuffer({
        quality: 50,
        width: 800,
      });
      if (avifResult.success) {
        fs.writeFileSync(path.join(outputDir, "demo.avif"), avifResult.buffer);
        console.log(
          `    ✅ AVIF: ${(avifResult.buffer.length / 1024).toFixed(1)}KB, ${
            avifResult.metadata.outputDimensions.width
          }x${avifResult.metadata.outputDimensions.height}`
        );
      }
    } catch (error) {
      console.log(`    ⚠️ AVIF not supported: ${error.message}`);
    }

    // 5. TIFF Buffer
    console.log("  • Creating TIFF buffer...");
    const tiffResult = await processor.createTIFFBuffer({
      compression: "lzw",
      width: 600,
    });
    if (tiffResult.success) {
      fs.writeFileSync(path.join(outputDir, "demo.tiff"), tiffResult.buffer);
      console.log(
        `    ✅ TIFF: ${(tiffResult.buffer.length / 1024).toFixed(1)}KB, ${
          tiffResult.metadata.outputDimensions.width
        }x${tiffResult.metadata.outputDimensions.height}`
      );
    }

    // 6. PPM Buffer (raw format)
    console.log("  • Creating PPM buffer...");
    try {
      const ppmResult = await processor.createPPMBuffer();
      if (ppmResult.success) {
        fs.writeFileSync(path.join(outputDir, "demo.ppm"), ppmResult.buffer);
        console.log(
          `    ✅ PPM: ${(ppmResult.buffer.length / 1024).toFixed(1)}KB, ${
            ppmResult.metadata.dimensions.width
          }x${ppmResult.metadata.dimensions.height}`
        );
      }
    } catch (error) {
      console.log(`    ⚠️ PPM creation failed: ${error.message}`);
    }

    // 7. Thumbnail JPEG (doesn't require full processing)
    console.log("  • Creating thumbnail buffer...");
    const processor2 = new LibRaw();
    await processor2.loadFile(fullPath);
    const thumbResult = await processor2.createThumbnailJPEGBuffer({
      maxSize: 300,
      quality: 90,
    });
    if (thumbResult.success) {
      fs.writeFileSync(
        path.join(outputDir, "demo_thumb.jpg"),
        thumbResult.buffer
      );
      console.log(
        `    ✅ Thumbnail: ${(thumbResult.buffer.length / 1024).toFixed(
          1
        )}KB, ${thumbResult.metadata.outputDimensions.width}x${
          thumbResult.metadata.outputDimensions.height
        }`
      );
    }
    await processor2.close();

    // Parallel creation demonstration
    console.log("\n🔄 Creating multiple formats in parallel...");
    const startTime = Date.now();

    const [parallelJpeg, parallelPng, parallelWebp] = await Promise.all([
      processor.createJPEGBuffer({ quality: 75, width: 400 }),
      processor.createPNGBuffer({ width: 400, compressionLevel: 3 }),
      processor.createWebPBuffer({ quality: 70, width: 400 }),
    ]);

    const endTime = Date.now();
    console.log(`    ⚡ Parallel creation took: ${endTime - startTime}ms`);

    if (parallelJpeg.success && parallelPng.success && parallelWebp.success) {
      fs.writeFileSync(
        path.join(outputDir, "parallel.jpg"),
        parallelJpeg.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "parallel.png"),
        parallelPng.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "parallel.webp"),
        parallelWebp.buffer
      );

      console.log(
        `    ✅ JPEG: ${(parallelJpeg.buffer.length / 1024).toFixed(1)}KB`
      );
      console.log(
        `    ✅ PNG: ${(parallelPng.buffer.length / 1024).toFixed(1)}KB`
      );
      console.log(
        `    ✅ WebP: ${(parallelWebp.buffer.length / 1024).toFixed(1)}KB`
      );
    }

    console.log(`\n🎉 Demo completed successfully!`);
    console.log(`📂 Output files saved to: ${outputDir}`);

    // List output files
    const outputFiles = fs.readdirSync(outputDir);
    console.log(`📋 Generated ${outputFiles.length} files:`);
    outputFiles.forEach((file) => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${file} (${(stats.size / 1024).toFixed(1)}KB)`);
    });
  } catch (error) {
    console.error(`❌ Demo failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    await processor.close();
  }
}

// Run demo if called directly
if (require.main === module) {
  demonstrateBufferMethods().catch(console.error);
}

module.exports = { demonstrateBufferMethods };
