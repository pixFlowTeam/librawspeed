const LibRaw = require("../lib/index.js");
const fs = require("fs");
const path = require("path");

/**
 * 缓冲区创建方法与现有测试框架的集成测试
 * 此文件将新的缓冲区方法与现有测试结构集成
 */

describe("Buffer Creation Methods", function () {
  this.timeout(30000); // 30 秒

  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");
  const outputDir = path.join(__dirname, "buffer-integration-output");
  let testFile;

  // 确保输出目录存在
  before(function () {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 查找测试文件
    const rawExtensions = [
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".raf",
      ".rw2",
      ".dng",
    ];
    const files = fs.readdirSync(sampleImagesDir);

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (rawExtensions.includes(ext)) {
        testFile = path.join(sampleImagesDir, file);
        break;
      }
    }

    if (!testFile) {
      throw new Error("未找到用于缓冲区创建测试的 RAW 测试文件");
    }
  });

  describe("createJPEGBuffer()", function () {
    let processor;

    beforeEach(async function () {
      processor = new LibRaw();
      await processor.loadFile(testFile);
      await processor.processImage();
    });

    afterEach(async function () {
      if (processor) {
        await processor.close();
      }
    });

    it("should create a basic JPEG buffer", async function () {
      const result = await processor.createJPEGBuffer();

      result.should.have.property("success", true);
      result.should.have.property("buffer");
      Buffer.isBuffer(result.buffer).should.be.true;
      result.buffer.length.should.be.greaterThan(1000);
      result.should.have.property("metadata");
      result.metadata.should.have.property("outputDimensions");

      // Save for visual inspection
      fs.writeFileSync(path.join(outputDir, "basic.jpg"), result.buffer);
    });

    it("should create JPEG with custom quality", async function () {
      const result = await processor.createJPEGBuffer({ quality: 95 });

      result.success.should.be.true;
      Buffer.isBuffer(result.buffer).should.be.true;
      result.buffer.length.should.be.greaterThan(1000);

      // Higher quality should generally produce larger files
      const basicResult = await processor.createJPEGBuffer({ quality: 50 });
      result.buffer.length.should.be.greaterThan(basicResult.buffer.length);

      fs.writeFileSync(path.join(outputDir, "quality_95.jpg"), result.buffer);
    });

    it("should resize image when width specified", async function () {
      const targetWidth = 800;
      const result = await processor.createJPEGBuffer({ width: targetWidth });

      result.success.should.be.true;
      result.metadata.outputDimensions.width.should.equal(targetWidth);

      fs.writeFileSync(path.join(outputDir, "resized_800.jpg"), result.buffer);
    });

    it("should create progressive JPEG", async function () {
      const result = await processor.createJPEGBuffer({
        progressive: true,
        width: 600,
      });

      result.success.should.be.true;
      Buffer.isBuffer(result.buffer).should.be.true;

      fs.writeFileSync(path.join(outputDir, "progressive.jpg"), result.buffer);
    });

    it("should throw error for invalid quality", async function () {
      try {
        await processor.createJPEGBuffer({ quality: 150 });
        throw new Error("Should have thrown error for invalid quality");
      } catch (error) {
        error.message.should.match(/quality|range|invalid/i);
      }
    });
  });

  describe("createPNGBuffer()", function () {
    let processor;

    beforeEach(async function () {
      processor = new LibRaw();
      await processor.loadFile(testFile);
      await processor.processImage();
    });

    afterEach(async function () {
      if (processor) {
        await processor.close();
      }
    });

    it("should create a basic PNG buffer", async function () {
      const result = await processor.createPNGBuffer();

      result.should.have.property("success", true);
      result.should.have.property("buffer");
      Buffer.isBuffer(result.buffer).should.be.true;
      result.buffer.length.should.be.greaterThan(1000);

      // Verify PNG magic bytes
      result.buffer[0].should.equal(0x89);
      result.buffer[1].should.equal(0x50);
      result.buffer[2].should.equal(0x4e);
      result.buffer[3].should.equal(0x47);

      fs.writeFileSync(path.join(outputDir, "basic.png"), result.buffer);
    });

    it("should handle different compression levels", async function () {
      const lowCompression = await processor.createPNGBuffer({
        compressionLevel: 1,
        width: 600,
      });
      const highCompression = await processor.createPNGBuffer({
        compressionLevel: 9,
        width: 600,
      });

      lowCompression.success.should.be.true;
      highCompression.success.should.be.true;

      // High compression should generally produce smaller files
      highCompression.buffer.length.should.be.lessThan(
        lowCompression.buffer.length
      );

      fs.writeFileSync(
        path.join(outputDir, "low_compression.png"),
        lowCompression.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "high_compression.png"),
        highCompression.buffer
      );
    });
  });

  describe("createWebPBuffer()", function () {
    let processor;

    beforeEach(async function () {
      processor = new LibRaw();
      await processor.loadFile(testFile);
      await processor.processImage();
    });

    afterEach(async function () {
      if (processor) {
        await processor.close();
      }
    });

    it("should create a basic WebP buffer", async function () {
      const result = await processor.createWebPBuffer();

      result.should.have.property("success", true);
      result.should.have.property("buffer");
      Buffer.isBuffer(result.buffer).should.be.true;
      result.buffer.length.should.be.greaterThan(1000);

      // Verify WebP magic bytes
      result.buffer.toString("ascii", 0, 4).should.equal("RIFF");
      result.buffer.toString("ascii", 8, 12).should.equal("WEBP");

      fs.writeFileSync(path.join(outputDir, "basic.webp"), result.buffer);
    });

    it("should create lossless WebP", async function () {
      const result = await processor.createWebPBuffer({
        lossless: true,
        width: 400,
      });

      result.success.should.be.true;
      Buffer.isBuffer(result.buffer).should.be.true;

      fs.writeFileSync(path.join(outputDir, "lossless.webp"), result.buffer);
    });
  });

  describe("createThumbnailJPEGBuffer()", function () {
    let processor;

    beforeEach(async function () {
      processor = new LibRaw();
      await processor.loadFile(testFile);
      // Note: Don't process the full image for thumbnail extraction
    });

    afterEach(async function () {
      if (processor) {
        await processor.close();
      }
    });

    it("should create a thumbnail from RAW file", async function () {
      const result = await processor.createThumbnailJPEGBuffer();

      result.should.have.property("success", true);
      result.should.have.property("buffer");
      Buffer.isBuffer(result.buffer).should.be.true;
      result.buffer.length.should.be.greaterThan(500);
      result.should.have.property("metadata");
      result.metadata.should.have.property("outputDimensions");

      // Verify JPEG magic bytes
      result.buffer[0].should.equal(0xff);
      result.buffer[1].should.equal(0xd8);

      fs.writeFileSync(path.join(outputDir, "thumbnail.jpg"), result.buffer);
    });

    it("should respect size constraints", async function () {
      const maxSize = 200;
      const result = await processor.createThumbnailJPEGBuffer({ maxSize });

      result.success.should.be.true;

      const maxDimension = Math.max(
        result.metadata.outputDimensions.width,
        result.metadata.outputDimensions.height
      );

      maxDimension.should.be.lessThanOrEqual(maxSize);

      fs.writeFileSync(
        path.join(outputDir, "thumbnail_200.jpg"),
        result.buffer
      );
    });

    it("should work with different quality settings", async function () {
      const lowQuality = await processor.createThumbnailJPEGBuffer({
        quality: 50,
        maxSize: 300,
      });
      const highQuality = await processor.createThumbnailJPEGBuffer({
        quality: 95,
        maxSize: 300,
      });

      lowQuality.success.should.be.true;
      highQuality.success.should.be.true;

      // Higher quality should generally produce larger files
      highQuality.buffer.length.should.be.greaterThan(lowQuality.buffer.length);

      fs.writeFileSync(
        path.join(outputDir, "thumbnail_quality_50.jpg"),
        lowQuality.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "thumbnail_quality_95.jpg"),
        highQuality.buffer
      );
    });
  });

  describe("Multiple Format Creation", function () {
    let processor;

    beforeEach(async function () {
      processor = new LibRaw();
      await processor.loadFile(testFile);
      await processor.processImage();
    });

    afterEach(async function () {
      if (processor) {
        await processor.close();
      }
    });

    it("should create multiple formats from same processed image", async function () {
      const width = 800;

      const [jpegResult, pngResult, webpResult] = await Promise.all([
        processor.createJPEGBuffer({ quality: 85, width }),
        processor.createPNGBuffer({ width, compressionLevel: 6 }),
        processor.createWebPBuffer({ quality: 80, width }),
      ]);

      jpegResult.success.should.be.true;
      pngResult.success.should.be.true;
      webpResult.success.should.be.true;

      // All should have the same dimensions
      jpegResult.metadata.outputDimensions.width.should.equal(width);
      pngResult.metadata.outputDimensions.width.should.equal(width);
      webpResult.metadata.outputDimensions.width.should.equal(width);

      // PNG is typically largest, WebP smallest for photos
      pngResult.buffer.length.should.be.greaterThan(jpegResult.buffer.length);
      webpResult.buffer.length.should.be.lessThan(jpegResult.buffer.length);

      fs.writeFileSync(
        path.join(outputDir, "multi_format.jpg"),
        jpegResult.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "multi_format.png"),
        pngResult.buffer
      );
      fs.writeFileSync(
        path.join(outputDir, "multi_format.webp"),
        webpResult.buffer
      );
    });

    it("should maintain consistent quality across multiple creations", async function () {
      const options = { quality: 90, width: 600 };

      const result1 = await processor.createJPEGBuffer(options);
      const result2 = await processor.createJPEGBuffer(options);

      result1.success.should.be.true;
      result2.success.should.be.true;

      // Results should be identical for same options
      result1.buffer.length.should.equal(result2.buffer.length);
      result1.metadata.outputDimensions.width.should.equal(
        result2.metadata.outputDimensions.width
      );
      result1.metadata.outputDimensions.height.should.equal(
        result2.metadata.outputDimensions.height
      );

      // Buffer contents should be identical
      Buffer.compare(result1.buffer, result2.buffer).should.equal(0);
    });
  });

  describe("Error Handling", function () {
    it("should throw error when creating buffer without loading file", async function () {
      const processor = new LibRaw();

      try {
        await processor.createJPEGBuffer();
        throw new Error("Should have thrown error");
      } catch (error) {
        error.message.should.match(/load|file|initialize/i);
      } finally {
        await processor.close();
      }
    });

    it("should throw error when creating buffer without processing", async function () {
      const processor = new LibRaw();

      try {
        await processor.loadFile(testFile);
        await processor.createJPEGBuffer();
        throw new Error("Should have thrown error");
      } catch (error) {
        error.message.should.match(/process|unpack/i);
      } finally {
        await processor.close();
      }
    });

    it("should handle invalid parameters gracefully", async function () {
      const processor = new LibRaw();

      try {
        await processor.loadFile(testFile);
        await processor.processImage();

        // Test various invalid parameters
        const invalidTests = [
          () => processor.createJPEGBuffer({ quality: -1 }),
          () => processor.createJPEGBuffer({ quality: 101 }),
          () => processor.createJPEGBuffer({ width: -100 }),
          () => processor.createPNGBuffer({ compressionLevel: -1 }),
          () => processor.createPNGBuffer({ compressionLevel: 10 }),
        ];

        for (const test of invalidTests) {
          try {
            await test();
            throw new Error("Should have thrown error for invalid parameter");
          } catch (error) {
            error.message.should.match(/invalid|range|parameter/i);
          }
        }
      } finally {
        await processor.close();
      }
    });
  });
});

module.exports = {};
