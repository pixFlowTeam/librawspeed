const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * Batch RAW Processing Example
 *
 * Processes multiple RAW files in a directory with:
 * - Progress tracking
 * - Error handling per file
 * - Parallel processing with concurrency control
 * - Summary statistics
 */

async function processFile(inputPath, outputDir, options = {}) {
  const processor = new LibRaw();
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const startTime = Date.now();

  try {
    await processor.loadFile(inputPath);

    // Configure processing
    if (options.outputParams) {
      await processor.setOutputParams(options.outputParams);
    }

    // Process image
    await processor.raw2Image();
    await processor.processImage();

    // Get metadata for summary
    const metadata = await processor.getMetadata();

    // Save outputs based on options
    const outputs = [];

    if (options.outputFormats?.includes("tiff")) {
      const tiffPath = path.join(outputDir, `${baseName}.tiff`);
      await processor.writeTIFF(tiffPath);
      outputs.push(
        `TIFF: ${(fs.statSync(tiffPath).size / 1024 / 1024).toFixed(1)}MB`
      );
    }

    if (options.outputFormats?.includes("ppm")) {
      const ppmPath = path.join(outputDir, `${baseName}.ppm`);
      await processor.writePPM(ppmPath);
      outputs.push(
        `PPM: ${(fs.statSync(ppmPath).size / 1024 / 1024).toFixed(1)}MB`
      );
    }

    if (options.outputFormats?.includes("thumbnail")) {
      const thumbPath = path.join(outputDir, `${baseName}_thumb.jpg`);
      await processor.writeThumbnail(thumbPath);
      outputs.push(
        `Thumb: ${(fs.statSync(thumbPath).size / 1024).toFixed(1)}KB`
      );
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      file: inputPath,
      metadata: {
        camera: `${metadata.make || "Unknown"} ${metadata.model || "Unknown"}`,
        resolution: `${metadata.width}×${metadata.height}`,
        iso: metadata.iso,
        aperture: metadata.aperture,
        shutterSpeed: metadata.shutterSpeed,
      },
      outputs,
      processingTime,
      fileSize: fs.statSync(inputPath).size,
    };
  } catch (error) {
    return {
      success: false,
      file: inputPath,
      error: error.message,
      processingTime: Date.now() - startTime,
    };
  } finally {
    await processor.close();
  }
}

async function processFilesInBatches(files, outputDir, options = {}) {
  const concurrency = options.concurrency || 3;
  const results = [];
  const stats = {
    total: files.length,
    processed: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    totalInputSize: 0,
    cameras: new Set(),
  };

  console.log(
    `🚀 Starting batch processing: ${files.length} files with concurrency ${concurrency}`
  );

  // Process files in batches
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    console.log(
      `\n📦 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(
        files.length / concurrency
      )} (${batch.length} files)`
    );

    const batchPromises = batch.map((file) =>
      processFile(file, outputDir, options)
    );
    const batchResults = await Promise.all(batchPromises);

    // Update stats and display results
    for (const result of batchResults) {
      results.push(result);
      stats.processed++;
      stats.totalTime += result.processingTime;

      if (result.success) {
        stats.successful++;
        stats.totalInputSize += result.fileSize;
        stats.cameras.add(result.metadata.camera);

        console.log(`  ✅ ${path.basename(result.file)}`);
        console.log(
          `     📷 ${result.metadata.camera} | 📐 ${result.metadata.resolution}`
        );
        if (result.metadata.iso)
          console.log(
            `     🎯 ISO ${result.metadata.iso} | 🔍 f/${
              result.metadata.aperture
            } | ⏱️ 1/${Math.round(1 / result.metadata.shutterSpeed)}s`
          );
        console.log(
          `     💾 ${result.outputs.join(", ")} | ⏱️ ${result.processingTime}ms`
        );
      } else {
        stats.failed++;
        console.log(`  ❌ ${path.basename(result.file)}: ${result.error}`);
      }
    }

    // Progress update
    const progress = ((stats.processed / stats.total) * 100).toFixed(1);
    console.log(
      `\n📊 Progress: ${stats.processed}/${stats.total} (${progress}%) | ✅ ${stats.successful} | ❌ ${stats.failed}`
    );
  }

  return { results, stats };
}

async function batchProcess(inputDir, outputDir, options = {}) {
  console.log("🎯 Batch RAW Processing");
  console.log("=======================");

  const startTime = Date.now();

  // Default options
  const defaultOptions = {
    outputFormats: ["tiff", "thumbnail"],
    concurrency: 3,
    outputParams: {
      bright: 1.0,
      gamma: [2.2, 4.5],
      output_bps: 16,
      no_auto_bright: false,
      highlight: 1,
      output_color: 1,
    },
    extensions: [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".raf",
      ".orf",
      ".dng",
      ".raw",
    ],
  };

  const config = { ...defaultOptions, ...options };

  console.log(`📁 Input Directory: ${inputDir}`);
  console.log(`📂 Output Directory: ${outputDir}`);
  console.log(`🔧 Formats: ${config.outputFormats.join(", ")}`);
  console.log(`⚙️ Concurrency: ${config.concurrency}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find RAW files
  const allFiles = fs.readdirSync(inputDir);
  const rawFiles = allFiles
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return config.extensions.includes(ext);
    })
    .map((file) => path.join(inputDir, file));

  if (rawFiles.length === 0) {
    console.log(`❌ No RAW files found in ${inputDir}`);
    console.log(`   Supported extensions: ${config.extensions.join(", ")}`);
    return;
  }

  console.log(`📸 Found ${rawFiles.length} RAW files`);

  // Process files
  const { results, stats } = await processFilesInBatches(
    rawFiles,
    outputDir,
    config
  );

  // Final summary
  const totalTime = Date.now() - startTime;
  console.log("\n🎉 Batch Processing Complete!");
  console.log("===============================");
  console.log(
    `📊 Files: ${stats.successful}/${stats.total} successful (${(
      (stats.successful / stats.total) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `⏱️ Total Time: ${(totalTime / 1000).toFixed(1)}s (avg: ${(
      stats.totalTime / stats.successful
    ).toFixed(0)}ms per file)`
  );
  console.log(
    `💽 Total Input: ${(stats.totalInputSize / 1024 / 1024).toFixed(1)} MB`
  );
  console.log(`📷 Cameras: ${Array.from(stats.cameras).join(", ")}`);
  console.log(
    `🚀 Throughput: ${(
      stats.totalInputSize /
      1024 /
      1024 /
      (totalTime / 1000)
    ).toFixed(1)} MB/s`
  );

  if (stats.failed > 0) {
    console.log("\n❌ Failed Files:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   ${path.basename(r.file)}: ${r.error}`);
      });
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "Usage: node batch-example.js <input-directory> <output-directory> [options]"
    );
    console.log("");
    console.log("Options:");
    console.log(
      "  --formats tiff,ppm,thumbnail  Output formats (default: tiff,thumbnail)"
    );
    console.log(
      "  --concurrency 3               Parallel processing limit (default: 3)"
    );
    console.log(
      "  --bright 1.1                  Brightness adjustment (default: 1.0)"
    );
    console.log("");
    console.log(
      "Example: node batch-example.js ./input ./output --formats tiff,thumbnail --concurrency 2"
    );
    return;
  }

  const inputDir = args[0];
  const outputDir = args[1];

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Input directory not found: ${inputDir}`);
    return;
  }

  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case "--formats":
        options.outputFormats = value.split(",");
        break;
      case "--concurrency":
        options.concurrency = parseInt(value);
        break;
      case "--bright":
        options.outputParams = { bright: parseFloat(value) };
        break;
    }
  }

  try {
    await batchProcess(inputDir, outputDir, options);
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    console.error(error.stack);
  }
}

// Export for use as a module
module.exports = {
  batchProcess,
  processFile,
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
