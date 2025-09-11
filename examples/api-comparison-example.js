const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");

/**
 * API Comparison: File-based vs Buffer-based
 *
 * This example demonstrates the difference between the traditional
 * file-based API and the new buffer-based API, highlighting the
 * benefits of each approach.
 */

async function apiComparisonExample(inputFile, outputDir) {
  console.log("🔄 API Comparison: File vs Buffer Operations");
  console.log("============================================");
  console.log(`📁 Input: ${inputFile}`);
  console.log(`📂 Output Directory: ${outputDir}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const processor = new LibRaw();
  const baseName = path.basename(inputFile, path.extname(inputFile));

  try {
    // Load the RAW file once
    console.log("🔄 Loading RAW file...");
    await processor.loadFile(inputFile);
    console.log("✅ RAW file loaded\n");

    // ============== OLD WAY: FILE-BASED API ==============
    console.log("📁 OLD WAY: File-based Operations");
    console.log("==================================");

    const fileStartTime = Date.now();

    // Traditional approach: process and write to files
    console.log("1️⃣ Processing image...");
    await processor.processImage();

    console.log("2️⃣ Writing TIFF file...");
    const tiffPath = path.join(outputDir, `${baseName}_traditional.tiff`);
    await processor.writeTIFF(tiffPath);

    console.log("3️⃣ Writing PPM file...");
    const ppmPath = path.join(outputDir, `${baseName}_traditional.ppm`);
    await processor.writePPM(ppmPath);

    console.log("4️⃣ Writing thumbnail...");
    const thumbPath = path.join(outputDir, `${baseName}_traditional_thumb.jpg`);
    await processor.writeThumbnail(thumbPath);

    // Traditional JPEG conversion
    console.log("5️⃣ Converting to JPEG...");
    const jpegPath = path.join(outputDir, `${baseName}_traditional.jpg`);
    await processor.convertToJPEG(jpegPath, {
      quality: 85,
      width: 1920,
    });

    const fileEndTime = Date.now();
    const fileProcessingTime = fileEndTime - fileStartTime;

    console.log(`✅ File-based processing complete in ${fileProcessingTime}ms`);

    // Check file sizes
    const fileSizes = {
      tiff: fs.statSync(tiffPath).size,
      ppm: fs.statSync(ppmPath).size,
      thumb: fs.statSync(thumbPath).size,
      jpeg: fs.statSync(jpegPath).size,
    };

    console.log("📊 File sizes:");
    Object.entries(fileSizes).forEach(([format, size]) => {
      console.log(
        `   ${format.toUpperCase()}: ${(size / 1024 / 1024).toFixed(2)} MB`
      );
    });

    // ============== NEW WAY: BUFFER-BASED API ==============
    console.log("\n🚀 NEW WAY: Buffer-based Operations");
    console.log("===================================");

    const bufferStartTime = Date.now();

    // Modern approach: create buffers in memory
    console.log("1️⃣ Creating TIFF buffer...");
    const tiffBuffer = await processor.createTIFFBuffer({
      compression: "lzw",
    });

    console.log("2️⃣ Creating PPM buffer...");
    const ppmBuffer = await processor.createPPMBuffer();

    console.log("3️⃣ Creating thumbnail buffer...");
    const thumbBuffer = await processor.createThumbnailJPEGBuffer({
      quality: 85,
    });

    console.log("4️⃣ Creating JPEG buffer...");
    const jpegBuffer = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920,
    });

    // Bonus: Create multiple formats in parallel
    console.log("5️⃣ Creating additional formats in parallel...");
    const [webpBuffer, avifBuffer, pngBuffer] = await Promise.all([
      processor.createWebPBuffer({ quality: 80, width: 1920 }),
      processor.createAVIFBuffer({ quality: 50, width: 1920 }),
      processor.createPNGBuffer({ width: 800, compressionLevel: 6 }),
    ]);

    const bufferEndTime = Date.now();
    const bufferProcessingTime = bufferEndTime - bufferStartTime;

    console.log(
      `✅ Buffer-based processing complete in ${bufferProcessingTime}ms`
    );

    // Save buffers to files for comparison (optional step)
    console.log("6️⃣ Saving buffers to files for comparison...");
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.tiff`),
      tiffBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.ppm`),
      ppmBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer_thumb.jpg`),
      thumbBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.jpg`),
      jpegBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.webp`),
      webpBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.avif`),
      avifBuffer.buffer
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}_buffer.png`),
      pngBuffer.buffer
    );

    console.log("📊 Buffer sizes:");
    const buffers = {
      TIFF: tiffBuffer.buffer,
      PPM: ppmBuffer.buffer,
      Thumbnail: thumbBuffer.buffer,
      JPEG: jpegBuffer.buffer,
      WebP: webpBuffer.buffer,
      AVIF: avifBuffer.buffer,
      PNG: pngBuffer.buffer,
    };

    Object.entries(buffers).forEach(([format, buffer]) => {
      console.log(
        `   ${format}: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
      );
    });

    // ============== PERFORMANCE COMPARISON ==============
    console.log("\n⚡ Performance Comparison");
    console.log("========================");
    console.log(`📁 File-based approach: ${fileProcessingTime}ms`);
    console.log(`🚀 Buffer-based approach: ${bufferProcessingTime}ms`);

    const speedImprovement =
      ((fileProcessingTime - bufferProcessingTime) / fileProcessingTime) * 100;
    if (speedImprovement > 0) {
      console.log(
        `🏆 Buffer approach is ${speedImprovement.toFixed(1)}% faster!`
      );
    } else {
      console.log(
        `📊 Performance difference: ${Math.abs(speedImprovement).toFixed(1)}%`
      );
    }

    // ============== USE CASE RECOMMENDATIONS ==============
    console.log("\n💡 When to Use Each Approach");
    console.log("=============================");

    console.log("\n📁 Use File-based API when:");
    console.log("   • You need to save final images to disk");
    console.log("   • Working with large images (memory constraints)");
    console.log("   • Building traditional desktop applications");
    console.log("   • Creating permanent archives");
    console.log("   • Integrating with file-based workflows");

    console.log("\n🚀 Use Buffer-based API when:");
    console.log("   • Building web services and APIs");
    console.log("   • Uploading to cloud storage");
    console.log("   • Creating image processing pipelines");
    console.log("   • Real-time image processing");
    console.log("   • Serverless/lambda functions");
    console.log("   • Streaming image data");
    console.log("   • Creating multiple formats from one source");

    // ============== CODE EXAMPLES ==============
    console.log("\n📝 Code Examples");
    console.log("================");

    console.log("\n📁 File-based approach:");
    console.log("```javascript");
    console.log("// Traditional way");
    console.log('await processor.loadFile("input.raw");');
    console.log("await processor.processImage();");
    console.log(
      'await processor.convertToJPEG("output.jpg", { quality: 85 });'
    );
    console.log('// File is now on disk at "output.jpg"');
    console.log("```");

    console.log("\n🚀 Buffer-based approach:");
    console.log("```javascript");
    console.log("// Modern way");
    console.log('await processor.loadFile("input.raw");');
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 85 });"
    );
    console.log("// result.buffer contains the JPEG data");
    console.log("// Use it directly without file I/O");
    console.log("```");

    console.log("\n🌐 Web service example:");
    console.log("```javascript");
    console.log('app.post("/convert", async (req, res) => {');
    console.log("    const processor = new LibRaw();");
    console.log("    await processor.loadBuffer(req.body);");
    console.log("    const result = await processor.createJPEGBuffer({");
    console.log("        quality: 85,");
    console.log("        width: 1920");
    console.log("    });");
    console.log('    res.set("Content-Type", "image/jpeg");');
    console.log("    res.send(result.buffer);");
    console.log("});");
    console.log("```");

    console.log("\n☁️ Cloud storage example:");
    console.log("```javascript");
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 90 });"
    );
    console.log(
      'await cloudBucket.file("processed.jpg").save(result.buffer, {'
    );
    console.log("    metadata: {");
    console.log('        contentType: "image/jpeg",');
    console.log('        cacheControl: "public, max-age=31536000"');
    console.log("    }");
    console.log("});");
    console.log("```");

    // ============== FORMAT COMPARISON ==============
    console.log("\n🎨 Format Efficiency Comparison");
    console.log("===============================");

    const formats = [
      { name: "AVIF", buffer: avifBuffer.buffer, extension: ".avif" },
      { name: "WebP", buffer: webpBuffer.buffer, extension: ".webp" },
      { name: "JPEG", buffer: jpegBuffer.buffer, extension: ".jpg" },
      { name: "PNG", buffer: pngBuffer.buffer, extension: ".png" },
      { name: "TIFF", buffer: tiffBuffer.buffer, extension: ".tiff" },
    ];

    // Sort by file size (smallest first)
    formats.sort((a, b) => a.buffer.length - b.buffer.length);

    console.log("📊 Formats ranked by file size (smallest to largest):");
    formats.forEach((format, index) => {
      const sizeMB = (format.buffer.length / 1024 / 1024).toFixed(2);
      const emoji =
        index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : "📊";
      console.log(`   ${emoji} ${format.name}: ${sizeMB} MB`);
    });

    // Cleanup
    await processor.close();

    console.log("\n✅ API comparison complete!");
    console.log("\n🎯 Key Takeaway: Choose the right API for your use case");
    console.log("   • File-based: Traditional workflows, disk storage");
    console.log("   • Buffer-based: Modern web services, cloud applications");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nMake sure you have:");
    console.error("1. Built the addon: npm run build");
    console.error("2. Installed Sharp: npm install sharp");
    console.error("3. Provided a valid RAW file");
  }
}

// Usage instructions
if (process.argv.length < 3) {
  console.log(
    "Usage: node api-comparison-example.js <path-to-raw-file> [output-dir]"
  );
  console.log(
    "Example: node api-comparison-example.js ../sample-images/IMG_1234.CR2 ./comparison-output"
  );
  process.exit(1);
}

const inputFile = process.argv[2];
const outputDir = process.argv[3] || "./comparison-output";

apiComparisonExample(inputFile, outputDir);
