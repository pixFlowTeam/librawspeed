const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function performanceBenchmark() {
  console.log("⚡ LibRaw Node.js - Performance Benchmark");
  console.log("=========================================\n");

  const sampleDir = path.join(__dirname, "../raw-samples-repo");

  try {
    // Get all RAW files
    const rawFiles = fs
      .readdirSync(sampleDir, { withFileTypes: true })
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".nef", ".cr3", ".raf", ".dng", ".rw2", ".arw"].includes(ext);
      })
      .sort();

    if (rawFiles.length === 0) {
      console.log("❌ No RAW files found for benchmarking");
      return;
    }

    console.log(`🎯 Benchmarking with ${rawFiles.length} files\n`);

    const results = [];
    let totalTime = 0;

    for (let i = 0; i < rawFiles.length; i++) {
      const filename = rawFiles[i];
      const filepath = path.join(sampleDir, filename);
      const fileStats = fs.statSync(filepath);
      const fileSizeMB = fileStats.size / 1024 / 1024;

      console.log(
        `📊 ${i + 1}/${rawFiles.length}: ${filename} (${fileSizeMB.toFixed(
          2
        )} MB)`
      );

      const processor = new LibRaw();
      const startTime = process.hrtime.bigint();

      try {
        // Measure loading time
        const loadStart = process.hrtime.bigint();
        await processor.loadFile(filepath);
        const loadTime = Number(process.hrtime.bigint() - loadStart) / 1000000; // Convert to ms

        // Measure metadata extraction time
        const metaStart = process.hrtime.bigint();
        const metadata = await processor.getMetadata();
        const metaTime = Number(process.hrtime.bigint() - metaStart) / 1000000;

        // Measure size extraction time
        const sizeStart = process.hrtime.bigint();
        const size = await processor.getImageSize();
        const sizeTime = Number(process.hrtime.bigint() - sizeStart) / 1000000;

        // Measure close time
        const closeStart = process.hrtime.bigint();
        await processor.close();
        const closeTime =
          Number(process.hrtime.bigint() - closeStart) / 1000000;

        const totalOperationTime =
          Number(process.hrtime.bigint() - startTime) / 1000000;
        totalTime += totalOperationTime;

        // Calculate throughput
        const throughputMBps = fileSizeMB / (totalOperationTime / 1000);
        const pixelCount = size.width * size.height;
        const pixelThroughput = pixelCount / (totalOperationTime / 1000);

        results.push({
          filename,
          format: path.extname(filename).toUpperCase().substring(1),
          fileSizeMB,
          resolution: `${size.width}x${size.height}`,
          megapixels: pixelCount / 1000000,
          loadTime,
          metaTime,
          sizeTime,
          closeTime,
          totalTime: totalOperationTime,
          throughputMBps,
          pixelThroughput: pixelThroughput / 1000000, // Megapixels per second
          camera: `${metadata.make} ${metadata.model}`,
        });

        console.log(
          `   ⏱️  Load: ${loadTime.toFixed(1)}ms | Meta: ${metaTime.toFixed(
            1
          )}ms | Size: ${sizeTime.toFixed(1)}ms | Close: ${closeTime.toFixed(
            1
          )}ms`
        );
        console.log(
          `   🚀 Total: ${totalOperationTime.toFixed(
            1
          )}ms | Throughput: ${throughputMBps.toFixed(1)} MB/s | ${(
            pixelThroughput / 1000000
          ).toFixed(1)} MP/s`
        );
        console.log("   ✅ Success\n");
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results.push({
          filename,
          format: path.extname(filename).toUpperCase().substring(1),
          fileSizeMB,
          error: error.message,
        });
      }
    }

    // Calculate statistics
    const successfulResults = results.filter((r) => !r.error);
    if (successfulResults.length === 0) {
      console.log("❌ No successful operations for statistics");
      return;
    }

    console.log("📈 PERFORMANCE STATISTICS");
    console.log("═".repeat(50));
    console.log(
      `🎯 Success Rate: ${successfulResults.length}/${results.length} (${(
        (successfulResults.length / results.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`⏱️  Total Processing Time: ${totalTime.toFixed(1)}ms`);
    console.log(
      `📊 Average per File: ${(totalTime / successfulResults.length).toFixed(
        1
      )}ms`
    );

    // Timing breakdown
    const avgLoad =
      successfulResults.reduce((sum, r) => sum + r.loadTime, 0) /
      successfulResults.length;
    const avgMeta =
      successfulResults.reduce((sum, r) => sum + r.metaTime, 0) /
      successfulResults.length;
    const avgSize =
      successfulResults.reduce((sum, r) => sum + r.sizeTime, 0) /
      successfulResults.length;
    const avgClose =
      successfulResults.reduce((sum, r) => sum + r.closeTime, 0) /
      successfulResults.length;

    console.log("\n⚡ OPERATION BREAKDOWN (Average):");
    console.log(`   • File Loading: ${avgLoad.toFixed(1)}ms`);
    console.log(`   • Metadata Extraction: ${avgMeta.toFixed(1)}ms`);
    console.log(`   • Size Detection: ${avgSize.toFixed(1)}ms`);
    console.log(`   • Cleanup: ${avgClose.toFixed(1)}ms`);

    // Throughput statistics
    const avgThroughput =
      successfulResults.reduce((sum, r) => sum + r.throughputMBps, 0) /
      successfulResults.length;
    const maxThroughput = Math.max(
      ...successfulResults.map((r) => r.throughputMBps)
    );
    const minThroughput = Math.min(
      ...successfulResults.map((r) => r.throughputMBps)
    );

    console.log("\n🚀 THROUGHPUT ANALYSIS:");
    console.log(`   • Average: ${avgThroughput.toFixed(1)} MB/s`);
    console.log(`   • Peak: ${maxThroughput.toFixed(1)} MB/s`);
    console.log(`   • Minimum: ${minThroughput.toFixed(1)} MB/s`);

    // Format comparison
    const formatStats = {};
    successfulResults.forEach((r) => {
      if (!formatStats[r.format]) {
        formatStats[r.format] = { count: 0, totalTime: 0, totalSize: 0 };
      }
      formatStats[r.format].count++;
      formatStats[r.format].totalTime += r.totalTime;
      formatStats[r.format].totalSize += r.fileSizeMB;
    });

    console.log("\n📁 FORMAT PERFORMANCE:");
    Object.entries(formatStats).forEach(([format, stats]) => {
      const avgTime = stats.totalTime / stats.count;
      const avgSize = stats.totalSize / stats.count;
      const avgThroughput = avgSize / (avgTime / 1000);
      console.log(
        `   • ${format}: ${avgTime.toFixed(1)}ms avg (${avgThroughput.toFixed(
          1
        )} MB/s)`
      );
    });

    // Resolution impact
    console.log("\n📐 RESOLUTION IMPACT:");
    const resolutionGroups = {
      "Low (< 16MP)": successfulResults.filter((r) => r.megapixels < 16),
      "Medium (16-24MP)": successfulResults.filter(
        (r) => r.megapixels >= 16 && r.megapixels < 24
      ),
      "High (≥ 24MP)": successfulResults.filter((r) => r.megapixels >= 24),
    };

    Object.entries(resolutionGroups).forEach(([group, files]) => {
      if (files.length > 0) {
        const avgTime =
          files.reduce((sum, f) => sum + f.totalTime, 0) / files.length;
        const avgPixelThroughput =
          files.reduce((sum, f) => sum + f.pixelThroughput, 0) / files.length;
        console.log(
          `   • ${group}: ${avgTime.toFixed(
            1
          )}ms avg (${avgPixelThroughput.toFixed(1)} MP/s)`
        );
      }
    });

    // Performance recommendations
    console.log("\n💡 PERFORMANCE INSIGHTS:");
    if (avgLoad > avgMeta * 2) {
      console.log("   • File loading is the primary bottleneck");
    }
    if (maxThroughput > avgThroughput * 1.5) {
      console.log("   • Performance varies significantly by format/size");
    }
    if (avgThroughput > 50) {
      console.log(
        "   • ✅ Excellent throughput - suitable for batch processing"
      );
    } else if (avgThroughput > 20) {
      console.log(
        "   • ✅ Good throughput - suitable for real-time applications"
      );
    } else {
      console.log("   • ⚠️  Consider optimization for high-volume scenarios");
    }

    console.log(
      `\n🎉 Benchmark complete! Processed ${totalTime.toFixed(1)}ms total`
    );
  } catch (error) {
    console.error("❌ Benchmark Error:", error.message);
    process.exit(1);
  }
}

// Export for use in other tests
module.exports = performanceBenchmark;

// Run the benchmark if executed directly
if (require.main === module) {
  performanceBenchmark().catch(console.error);
}
