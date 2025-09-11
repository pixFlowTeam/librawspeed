const LibRaw = require("../lib/index");
const fs = require("fs");

/**
 * Simple Buffer API Example
 *
 * Demonstrates the most common use cases for the new buffer API:
 * - Creating JPEG buffers for web use
 * - Creating thumbnails in memory
 * - Using buffers instead of files
 */

async function simpleBufferExample(inputFile) {
  console.log("📸 Simple Buffer API Example");
  console.log("============================");
  console.log(`📁 Processing: ${inputFile}\n`);

  const processor = new LibRaw();

  try {
    // Load and process the RAW file
    console.log("🔄 Loading RAW file...");
    await processor.loadFile(inputFile);

    console.log("⚙️ Processing image...");
    await processor.processImage();

    // ============== EXAMPLE 1: Create JPEG buffer for web use ==============
    console.log("\n📸 Creating web-optimized JPEG buffer...");
    const webJpeg = await processor.createJPEGBuffer({
      quality: 85,
      width: 1920, // Resize to 1920px wide
      progressive: true, // Better for web loading
    });

    console.log(`✅ Web JPEG created: ${webJpeg.buffer.length} bytes`);
    console.log(
      `   Size: ${webJpeg.metadata.outputDimensions.width}x${webJpeg.metadata.outputDimensions.height}`
    );
    console.log(
      `   Compression: ${webJpeg.metadata.fileSize.compressionRatio}:1`
    );

    // ============== EXAMPLE 2: Create thumbnail buffer ==============
    console.log("\n🔍 Creating thumbnail buffer...");
    const thumbnail = await processor.createThumbnailJPEGBuffer({
      quality: 85,
      maxSize: 300, // Max 300px on any side
    });

    console.log(`✅ Thumbnail created: ${thumbnail.buffer.length} bytes`);
    console.log(
      `   Size: ${thumbnail.metadata.outputDimensions.width}x${thumbnail.metadata.outputDimensions.height}`
    );

    // ============== EXAMPLE 3: Create high-quality buffer for storage ==============
    console.log("\n🎨 Creating high-quality buffer...");
    const highQuality = await processor.createJPEGBuffer({
      quality: 95, // High quality
      // No resizing - keep original dimensions
    });

    console.log(
      `✅ High-quality JPEG created: ${highQuality.buffer.length} bytes`
    );
    console.log(
      `   Size: ${highQuality.metadata.outputDimensions.width}x${highQuality.metadata.outputDimensions.height}`
    );

    // ============== PRACTICAL USAGE EXAMPLES ==============
    console.log("\n💡 Practical Usage Examples:\n");

    // Example 1: Save to file (if needed)
    console.log("1️⃣ Save buffer to file:");
    console.log("```javascript");
    console.log('fs.writeFileSync("output.jpg", webJpeg.buffer);');
    console.log("```\n");

    // Example 2: Send via HTTP (Express.js)
    console.log("2️⃣ Send via HTTP response:");
    console.log("```javascript");
    console.log('app.get("/image", async (req, res) => {');
    console.log(
      "    const result = await processor.createJPEGBuffer({ quality: 85 });"
    );
    console.log('    res.set("Content-Type", "image/jpeg");');
    console.log("    res.send(result.buffer);");
    console.log("});");
    console.log("```\n");

    // Example 3: Upload to cloud storage
    console.log("3️⃣ Upload to cloud storage:");
    console.log("```javascript");
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 90 });"
    );
    console.log('await bucket.file("image.jpg").save(result.buffer, {');
    console.log('    metadata: { contentType: "image/jpeg" }');
    console.log("});");
    console.log("```\n");

    // Example 4: Convert to Base64 for data URLs
    console.log("4️⃣ Convert to Base64 data URL:");
    console.log("```javascript");
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 85 });"
    );
    console.log('const base64 = result.buffer.toString("base64");');
    console.log("const dataUrl = `data:image/jpeg;base64,${base64}`;");
    console.log("```\n");

    // Example 5: Stream to another process
    console.log("5️⃣ Stream to another process:");
    console.log("```javascript");
    console.log('const { Readable } = require("stream");');
    console.log(
      "const result = await processor.createJPEGBuffer({ quality: 85 });"
    );
    console.log("const stream = Readable.from(result.buffer);");
    console.log("stream.pipe(otherProcess.stdin);");
    console.log("```\n");

    // ============== PERFORMANCE COMPARISON ==============
    console.log("⚡ Performance Benefits:");
    console.log("• No filesystem I/O - faster processing");
    console.log("• Direct memory operations");
    console.log("• Perfect for serverless/cloud functions");
    console.log("• Reduced disk space usage");
    console.log("• Better for concurrent processing\n");

    // ============== FORMAT COMPARISON ==============
    console.log("🎨 Try different formats:");
    console.log("```javascript");
    console.log("// Modern WebP format (smaller file size)");
    console.log(
      "const webp = await processor.createWebPBuffer({ quality: 80 });"
    );
    console.log("");
    console.log("// Next-gen AVIF format (even smaller)");
    console.log(
      "const avif = await processor.createAVIFBuffer({ quality: 50 });"
    );
    console.log("");
    console.log("// Lossless PNG");
    console.log(
      "const png = await processor.createPNGBuffer({ compressionLevel: 6 });"
    );
    console.log("```\n");

    // Save examples to files for testing
    const baseName = inputFile.split(/[/\\]/).pop().split(".")[0];
    fs.writeFileSync(`${baseName}_web.jpg`, webJpeg.buffer);
    fs.writeFileSync(`${baseName}_thumb.jpg`, thumbnail.buffer);
    fs.writeFileSync(`${baseName}_hq.jpg`, highQuality.buffer);

    console.log("💾 Example files saved:");
    console.log(`   • ${baseName}_web.jpg (${webJpeg.buffer.length} bytes)`);
    console.log(
      `   • ${baseName}_thumb.jpg (${thumbnail.buffer.length} bytes)`
    );
    console.log(`   • ${baseName}_hq.jpg (${highQuality.buffer.length} bytes)`);

    // Cleanup
    await processor.close();
    console.log("\n✅ Complete! Your images are ready to use in memory.");
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
  console.log("Usage: node simple-buffer-example.js <path-to-raw-file>");
  console.log(
    "Example: node simple-buffer-example.js ../sample-images/IMG_1234.CR2"
  );
  process.exit(1);
}

const inputFile = process.argv[2];
simpleBufferExample(inputFile);
