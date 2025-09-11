/**
 * 从 RAW 文件提取缩略图
 * 从 sample-images 目录中的所有 RAW 文件提取缩略图
 * 并保存到 sample-images/thumbnails 文件夹
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
        `已创建缩略图目录: ${this.thumbnailsDir}`,
        "success"
      );
    }
  }

  findRawFiles() {
    if (!fs.existsSync(this.sampleDir)) {
      this.log(`未找到示例图像目录: ${this.sampleDir}`, "error");
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
      this.log(`处理中: ${rawFile.fileName}`, "processing");

      // 加载 RAW 文件
      await processor.loadFile(rawFile.fullPath);

      // 检查缩略图是否存在
      const thumbOK = await processor.thumbOK();
      if (!thumbOK) {
        this.log(`  ${rawFile.fileName} 中没有可用的缩略图`, "warning");
        this.results.skipped++;
        return false;
      }

      // 解包缩略图
      const unpacked = await processor.unpackThumbnail();
      if (!unpacked) {
        this.log(
          `  从 ${rawFile.fileName} 解包缩略图失败`,
          "error"
        );
        this.results.failed++;
        return false;
      }

      // 创建内存缩略图以获取信息
      const memThumb = await processor.createMemoryThumbnail();
      if (!memThumb || !memThumb.data) {
        this.log(
          `  从 ${rawFile.fileName} 创建内存缩略图失败`,
          "error"
        );
        this.results.failed++;
        return false;
      }

      // 生成缩略图文件名
      const thumbnailFileName = `${rawFile.baseName}_thumb.jpg`;
      const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFileName);

      // 写入缩略图文件
      await processor.writeThumbnail(thumbnailPath);

      // 验证文件是否已创建
      if (fs.existsSync(thumbnailPath)) {
        const stats = fs.statSync(thumbnailPath);
        this.log(
          `  ✓ 已提取: ${thumbnailFileName} (${this.formatFileSize(
            stats.size
          )})`,
          "success"
        );

        // 记录缩略图详情
        if (memThumb.width && memThumb.height) {
          this.log(
            `    尺寸: ${memThumb.width}x${memThumb.height}`,
            "info"
          );
        }

        this.results.extracted++;
        return true;
      } else {
        this.log(`  写入缩略图文件失败: ${thumbnailPath}`, "error");
        this.results.failed++;
        return false;
      }
    } catch (error) {
      this.log(
        `  处理 ${rawFile.fileName} 时出错: ${error.message}`,
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
    console.log("\n📊 缩略图提取报告");
    console.log("===============================");
    console.log(`找到的 RAW 文件总数: ${this.results.total}`);
    console.log(`✅ 成功提取: ${this.results.extracted}`);
    console.log(`⚠️  跳过 (无缩略图): ${this.results.skipped}`);
    console.log(`❌ 失败: ${this.results.failed}`);

    if (this.results.total > 0) {
      const successRate = (
        (this.results.extracted / this.results.total) *
        100
      ).toFixed(1);
      console.log(`📈 成功率: ${successRate}%`);
    }

    if (this.results.extracted > 0) {
      console.log(`\n📁 缩略图已保存到: ${this.thumbnailsDir}`);

      // List generated thumbnails
      try {
        const thumbnails = fs
          .readdirSync(this.thumbnailsDir)
          .filter((file) => file.endsWith("_thumb.jpg"));

        if (thumbnails.length > 0) {
          console.log("\n📋 生成的缩略图:");
          thumbnails.forEach((thumb) => {
            const thumbPath = path.join(this.thumbnailsDir, thumb);
            const stats = fs.statSync(thumbPath);
            console.log(`   • ${thumb} (${this.formatFileSize(stats.size)})`);
          });
        }
      } catch (error) {
        this.log(`列出缩略图时出错: ${error.message}`, "warning");
      }
    }
  }

  async extractAllThumbnails() {
    console.log("🖼️  LibRaw 缩略图提取器");
    console.log("===============================");

    // 确保缩略图目录存在
    this.ensureThumbnailsDir();

    // 查找所有 RAW 文件
    const rawFiles = this.findRawFiles();
    this.results.total = rawFiles.length;

    if (rawFiles.length === 0) {
      this.log("在 sample-images 目录中未找到 RAW 文件", "warning");
      this.log("支持的格式: CR2, CR3, NEF, ARW, DNG, RAF, RW2", "info");
      return false;
    }

    this.log(`找到 ${rawFiles.length} 个 RAW 文件需要处理`, "success");

    // 处理每个 RAW 文件
    for (const rawFile of rawFiles) {
      await this.extractThumbnail(rawFile);
    }

    // 生成最终报告
    this.generateReport();

    return this.results.extracted > 0;
  }
}

async function main() {
  const extractor = new ThumbnailExtractor();

  try {
    const success = await extractor.extractAllThumbnails();

    if (success) {
      console.log("\n🎉 缩略图提取成功完成!");
      process.exit(0);
    } else {
      console.log("\n⚠️  未提取到任何缩略图");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ 缩略图提取失败:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ThumbnailExtractor };
