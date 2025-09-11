/**
 * Extract Thumbnails from RAW Files
 * Extracts thumbnails from all RAW files in sample-images directory
 * and saves them in sample-images/thumbnails folder
 */

const LibRaw = require("../lib/index");
const fs = require("fs");
const path = require("path");

class ThumbnailExtractor {
  constructor() {
    this.sampleDir = path.join(__dirname, "..", "sample-images");
    this.thumbnailsDir = path.join(this.sampleDir, "thumbnails");
    this.results = {
      total: 0,
      extracted: 0,
      failed: 0,
      skipped: 0,
    };
  }

  log(message, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      processing: "🔄",
    };
    console.log(`${icons[type]} ${message}`);
  }

  ensureThumbnailsDir() {
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true });
      this.log(
        `Created thumbnails directory: ${this.thumbnailsDir}`,
        "success"
      );
    }
  }

  findRawFiles() {
    if (!fs.existsSync(this.sampleDir)) {
      this.log(`Sample images directory not found: ${this.sampleDir}`, "error");
      return [];
    }

    const files = fs.readdirSync(this.sampleDir);
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".dng",
      ".raf",
      ".rw2",
    ];

    const rawFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return rawExtensions.includes(ext);
      })
      .map((file) => ({
        fullPath: path.join(this.sampleDir, file),
        fileName: file,
        baseName: path.basename(file, path.extname(file)),
        extension: path.extname(file).toLowerCase(),
      }));

    return rawFiles;
  }

  async extractThumbnail(rawFile) {
    const processor = new LibRaw();

    try {
      this.log(`Processing: ${rawFile.fileName}`, "processing");

      // Load the RAW file
      await processor.loadFile(rawFile.fullPath);

      // Check if thumbnail exists
      const thumbOK = await processor.thumbOK();
      if (!thumbOK) {
        this.log(`  No thumbnail available in ${rawFile.fileName}`, "warning");
        this.results.skipped++;
        return false;
      }

      // Unpack thumbnail
      const unpacked = await processor.unpackThumbnail();
      if (!unpacked) {
        this.log(
          `  Failed to unpack thumbnail from ${rawFile.fileName}`,
          "error"
        );
        this.results.failed++;
        return false;
      }

      // Create memory thumbnail to get information
      const memThumb = await processor.createMemoryThumbnail();
      if (!memThumb || !memThumb.data) {
        this.log(
          `  Failed to create memory thumbnail from ${rawFile.fileName}`,
          "error"
        );
        this.results.failed++;
        return false;
      }

      // Generate thumbnail filename
      const thumbnailFileName = `${rawFile.baseName}_thumb.jpg`;
      const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFileName);

      // Write thumbnail file
      await processor.writeThumbnail(thumbnailPath);

      // Verify the file was created
      if (fs.existsSync(thumbnailPath)) {
        const stats = fs.statSync(thumbnailPath);
        this.log(
          `  ✓ Extracted: ${thumbnailFileName} (${this.formatFileSize(
            stats.size
          )})`,
          "success"
        );

        // Log thumbnail details
        if (memThumb.width && memThumb.height) {
          this.log(
            `    Dimensions: ${memThumb.width}x${memThumb.height}`,
            "info"
          );
        }

        this.results.extracted++;
        return true;
      } else {
        this.log(`  Failed to write thumbnail file: ${thumbnailPath}`, "error");
        this.results.failed++;
        return false;
      }
    } catch (error) {
      this.log(
        `  Error processing ${rawFile.fileName}: ${error.message}`,
        "error"
      );
      this.results.failed++;
      return false;
    } finally {
      await processor.close();
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  generateReport() {
    console.log("\n📊 Thumbnail Extraction Report");
    console.log("===============================");
    console.log(`Total RAW files found: ${this.results.total}`);
    console.log(`✅ Successfully extracted: ${this.results.extracted}`);
    console.log(`⚠️  Skipped (no thumbnail): ${this.results.skipped}`);
    console.log(`❌ Failed: ${this.results.failed}`);

    if (this.results.total > 0) {
      const successRate = (
        (this.results.extracted / this.results.total) *
        100
      ).toFixed(1);
      console.log(`📈 Success rate: ${successRate}%`);
    }

    if (this.results.extracted > 0) {
      console.log(`\n📁 Thumbnails saved to: ${this.thumbnailsDir}`);

      // List generated thumbnails
      try {
        const thumbnails = fs
          .readdirSync(this.thumbnailsDir)
          .filter((file) => file.endsWith("_thumb.jpg"));

        if (thumbnails.length > 0) {
          console.log("\n📋 Generated thumbnails:");
          thumbnails.forEach((thumb) => {
            const thumbPath = path.join(this.thumbnailsDir, thumb);
            const stats = fs.statSync(thumbPath);
            console.log(`   • ${thumb} (${this.formatFileSize(stats.size)})`);
          });
        }
      } catch (error) {
        this.log(`Error listing thumbnails: ${error.message}`, "warning");
      }
    }
  }

  async extractAllThumbnails() {
    console.log("🖼️  LibRaw Thumbnail Extractor");
    console.log("===============================");

    // Ensure thumbnails directory exists
    this.ensureThumbnailsDir();

    // Find all RAW files
    const rawFiles = this.findRawFiles();
    this.results.total = rawFiles.length;

    if (rawFiles.length === 0) {
      this.log("No RAW files found in sample-images directory", "warning");
      this.log("Supported formats: CR2, CR3, NEF, ARW, DNG, RAF, RW2", "info");
      return false;
    }

    this.log(`Found ${rawFiles.length} RAW files to process`, "success");

    // Process each RAW file
    for (const rawFile of rawFiles) {
      await this.extractThumbnail(rawFile);
    }

    // Generate final report
    this.generateReport();

    return this.results.extracted > 0;
  }
}

async function main() {
  const extractor = new ThumbnailExtractor();

  try {
    const success = await extractor.extractAllThumbnails();

    if (success) {
      console.log("\n🎉 Thumbnail extraction completed successfully!");
      process.exit(0);
    } else {
      console.log("\n⚠️  No thumbnails were extracted");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Thumbnail extraction failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ThumbnailExtractor };
