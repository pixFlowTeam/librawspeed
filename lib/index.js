const path = require("path");
const sharp = require("sharp");

let librawAddon;
try {
  librawAddon = require("../build/Release/raw_addon");
} catch (err) {
  try {
    librawAddon = require("../build/Debug/raw_addon");
  } catch (err2) {
    throw new Error('LibRaw 插件未构建。请先运行 "npm run build"。');
  }
}

class LibRaw {
  constructor() {
    this._wrapper = new librawAddon.LibRawWrapper();
    this._isProcessed = false; // 跟踪是否已调用 processImage()
    this._processedImageData = null; // 缓存处理后的图像数据
  }

  // ============== FILE OPERATIONS ==============

  /**
   * 从文件系统加载 RAW 文件
   * @param {string} filename - RAW 文件路径
   * @returns {Promise<boolean>} - 成功状态
   */
  async loadFile(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.loadFile(filename);
        this._isProcessed = false; // 为新文件重置处理状态
        this._processedImageData = null; // 清除缓存数据
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 从内存缓冲区加载 RAW 文件
   * @param {Buffer} buffer - 包含 RAW 数据的缓冲区
   * @returns {Promise<boolean>} - 成功状态
   */
  async loadBuffer(buffer) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.loadBuffer(buffer);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 关闭并清理资源
   * @returns {Promise<boolean>} - 成功状态
   */
  async close() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.close();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== ERROR HANDLING ==============

  /**
   * 获取最后的错误消息
   * @returns {string} - 最后的错误消息
   */
  getLastError() {
    return this._wrapper.getLastError();
  }

  /**
   * 将错误代码转换为字符串
   * @param {number} errorCode - 错误代码
   * @returns {string} - 错误消息
   */
  strerror(errorCode) {
    return this._wrapper.strerror(errorCode);
  }

  // ============== METADATA & INFORMATION ==============

  /**
   * 从加载的 RAW 文件获取基本元数据
   * @returns {Promise<Object>} - 元数据对象
   */
  async getMetadata() {
    return new Promise((resolve, reject) => {
      try {
        const metadata = this._wrapper.getMetadata();
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取图像尺寸和大小信息
   * @returns {Promise<Object>} - 包含宽度/高度详情的尺寸对象
   */
  async getImageSize() {
    return new Promise((resolve, reject) => {
      try {
        const size = this._wrapper.getImageSize();
        resolve(size);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取高级元数据，包括色彩矩阵和校准数据
   * @returns {Promise<Object>} - 高级元数据对象
   */
  async getAdvancedMetadata() {
    return new Promise((resolve, reject) => {
      try {
        const metadata = this._wrapper.getAdvancedMetadata();
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取镜头信息
   * @returns {Promise<Object>} - 镜头元数据对象
   */
  async getLensInfo() {
    return new Promise((resolve, reject) => {
      try {
        const lensInfo = this._wrapper.getLensInfo();
        resolve(lensInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取色彩信息，包括白平衡和色彩矩阵
   * @returns {Promise<Object>} - 色彩信息对象
   */
  async getColorInfo() {
    return new Promise((resolve, reject) => {
      try {
        const colorInfo = this._wrapper.getColorInfo();
        resolve(colorInfo);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== IMAGE PROCESSING ==============

  /**
   * 解包缩略图数据
   * @returns {Promise<boolean>} - 成功状态
   */
  async unpackThumbnail() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.unpackThumbnail();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 使用当前设置处理 RAW 图像
   * @returns {Promise<boolean>} - 成功状态
   */
  async processImage() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.processImage();
        this._isProcessed = true; // 标记为已处理
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 从 RAW 数据中减去黑电平
   * @returns {Promise<boolean>} - 成功状态
   */
  async subtractBlack() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.subtractBlack();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 将 RAW 数据转换为图像格式
   * @returns {Promise<boolean>} - 成功状态
   */
  async raw2Image() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.raw2Image();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 调整图像中的最大值
   * @returns {Promise<boolean>} - 成功状态
   */
  async adjustMaximum() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.adjustMaximum();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== MEMORY IMAGE CREATION ==============

  /**
   * 在内存中创建处理后的图像
   * @returns {Promise<Object>} - 包含缓冲区的图像数据对象
   */
  async createMemoryImage() {
    return new Promise((resolve, reject) => {
      try {
        // 如果可用则返回缓存数据
        if (this._processedImageData) {
          resolve(this._processedImageData);
          return;
        }

        const imageData = this._wrapper.createMemoryImage();

        // 如果图像已处理则缓存结果
        if (this._isProcessed) {
          this._processedImageData = imageData;
        }

        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 在内存中创建缩略图
   * @returns {Promise<Object>} - 包含缓冲区的缩略图数据对象
   */
  async createMemoryThumbnail() {
    return new Promise((resolve, reject) => {
      try {
        const thumbData = this._wrapper.createMemoryThumbnail();
        resolve(thumbData);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== FILE WRITERS ==============

  /**
   * 将处理后的图像写入 PPM 文件
   * @param {string} filename - 输出文件名
   * @returns {Promise<boolean>} - 成功状态
   */
  async writePPM(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.writePPM(filename);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 将处理后的图像写入 TIFF 文件
   * @param {string} filename - 输出文件名
   * @returns {Promise<boolean>} - 成功状态
   */
  async writeTIFF(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.writeTIFF(filename);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 将缩略图写入文件
   * @param {string} filename - 输出文件名
   * @returns {Promise<boolean>} - 成功状态
   */
  async writeThumbnail(filename) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.writeThumbnail(filename);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== CONFIGURATION & SETTINGS ==============

  /**
   * 设置处理输出参数
   * @param {Object} params - 参数对象
   * @returns {Promise<boolean>} - 成功状态
   */
  async setOutputParams(params) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.setOutputParams(params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取当前输出参数
   * @returns {Promise<Object>} - 当前参数
   */
  async getOutputParams() {
    return new Promise((resolve, reject) => {
      try {
        const params = this._wrapper.getOutputParams();
        resolve(params);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== UTILITY FUNCTIONS ==============

  /**
   * 检查图像是否使用浮点数据
   * @returns {Promise<boolean>} - 浮点状态
   */
  async isFloatingPoint() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isFloatingPoint();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 检查图像是否为富士旋转
   * @returns {Promise<boolean>} - 富士旋转状态
   */
  async isFujiRotated() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isFujiRotated();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 检查图像是否为 sRAW 格式
   * @returns {Promise<boolean>} - sRAW 状态
   */
  async isSRAW() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isSRAW();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 检查缩略图是否为 JPEG 格式
   * @returns {Promise<boolean>} - JPEG 缩略图状态
   */
  async isJPEGThumb() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isJPEGThumb();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取处理过程中的错误计数
   * @returns {Promise<number>} - 错误数量
   */
  async errorCount() {
    return new Promise((resolve, reject) => {
      try {
        const count = this._wrapper.errorCount();
        resolve(count);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== EXTENDED UTILITY FUNCTIONS ==============

  /**
   * 检查图像是否为尼康 sRAW 格式
   * @returns {Promise<boolean>} - 如果是尼康 sRAW 则为 true
   */
  async isNikonSRAW() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isNikonSRAW();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 检查图像是否为 Coolscan NEF 格式
   * @returns {Promise<boolean>} - 如果是 Coolscan NEF 则为 true
   */
  async isCoolscanNEF() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.isCoolscanNEF();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 检查图像是否有浮点数据
   * @returns {Promise<boolean>} - 如果有浮点数据则为 true
   */
  async haveFPData() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.haveFPData();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取 sRAW 中点值
   * @returns {Promise<number>} - sRAW 中点
   */
  async srawMidpoint() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.srawMidpoint();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 检查缩略图是否正常
   * @param {number} [maxSize=-1] - 最大尺寸限制
   * @returns {Promise<number>} - 缩略图状态
   */
  async thumbOK(maxSize = -1) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.thumbOK(maxSize);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取解包器函数名称
   * @returns {Promise<string>} - 解包器函数名称
   */
  async unpackFunctionName() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.unpackFunctionName();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取解码器信息
   * @returns {Promise<Object>} - 包含名称和标志的解码器信息
   */
  async getDecoderInfo() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.getDecoderInfo();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== ADVANCED PROCESSING ==============

  /**
   * 解包 RAW 数据（低级操作）
   * @returns {Promise<boolean>} - 成功状态
   */
  async unpack() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.unpack();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 使用扩展选项将 RAW 转换为图像
   * @param {boolean} [subtractBlack=true] - 是否减去黑电平
   * @returns {Promise<boolean>} - 成功状态
   */
  async raw2ImageEx(subtractBlack = true) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.raw2ImageEx(subtractBlack);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 仅调整信息尺寸（不处理）
   * @returns {Promise<boolean>} - 成功状态
   */
  async adjustSizesInfoOnly() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.adjustSizesInfoOnly();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 释放处理后的图像数据
   * @returns {Promise<boolean>} - 成功状态
   */
  async freeImage() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.freeImage();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 将浮点数据转换为整数数据
   * @param {number} [dmin=4096] - 最小数据值
   * @param {number} [dmax=32767] - 最大数据值
   * @param {number} [dtarget=16383] - 目标值
   * @returns {Promise<boolean>} - 成功状态
   */
  async convertFloatToInt(dmin = 4096, dmax = 32767, dtarget = 16383) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.convertFloatToInt(dmin, dmax, dtarget);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== MEMORY OPERATIONS EXTENDED ==============

  /**
   * 获取内存图像格式信息
   * @returns {Promise<Object>} - 包含宽度、高度、颜色、位深度的格式信息
   */
  async getMemImageFormat() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.getMemImageFormat();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 将内存图像复制到缓冲区
   * @param {Buffer} buffer - 目标缓冲区
   * @param {number} stride - 行步长（字节）
   * @param {boolean} bgr - 是否使用 BGR 顺序
   * @returns {Promise<boolean>} - 成功状态
   */
  async copyMemImage(buffer, stride, bgr = false) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.copyMemImage(buffer, stride, bgr);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== COLOR OPERATIONS ==============

  /**
   * 获取特定位置的颜色滤镜
   * @param {number} row - 行位置
   * @param {number} col - 列位置
   * @returns {Promise<number>} - 颜色值
   */
  async getColorAt(row, col) {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.getColorAt(row, col);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== MEMORY STREAM OPERATIONS (NEW FEATURE) ==============

  /**
   * 在内存中创建处理后的图像作为 JPEG 缓冲区
   * @param {Object} options - JPEG 转换选项
   * @param {number} [options.quality=85] - JPEG 质量 (1-100)
   * @param {number} [options.width] - 目标宽度（如果未指定高度则保持宽高比）
   * @param {number} [options.height] - 目标高度（如果未指定宽度则保持宽高比）
   * @param {boolean} [options.progressive=false] - 使用渐进式 JPEG
   * @param {boolean} [options.mozjpeg=true] - 使用 mozjpeg 编码器获得更好的压缩
   * @param {number} [options.chromaSubsampling='4:2:0'] - 色度子采样 ('4:4:4', '4:2:2', '4:2:0')
   * @param {boolean} [options.trellisQuantisation=false] - 启用网格量化
   * @param {boolean} [options.optimizeScans=false] - 优化扫描顺序
   * @param {number} [options.overshootDeringing=false] - 过冲去振铃
   * @param {boolean} [options.optimizeCoding=true] - 优化霍夫曼编码
   * @param {string} [options.colorSpace='srgb'] - 输出色彩空间 ('srgb', 'rec2020', 'p3', 'cmyk')
   * @returns {Promise<Object>} - 包含元数据的 JPEG 缓冲区
   */
  async createJPEGBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // 设置具有性能优化值的默认选项
        const opts = {
          quality: options.quality || 85,
          progressive: options.progressive || false,
          mozjpeg: options.mozjpeg !== false, // 默认为 true 以获得更好的压缩
          chromaSubsampling: options.chromaSubsampling || "4:2:0",
          trellisQuantisation: options.trellisQuantisation || false,
          optimizeScans: options.optimizeScans || false,
          overshootDeringing: options.overshootDeringing || false,
          optimizeCoding: options.optimizeCoding !== false, // 默认为 true
          colorSpace: options.colorSpace || "srgb",
          ...options,
        };

        const startTime = process.hrtime.bigint();

        // 智能处理：仅在未处理时处理
        if (!this._isProcessed) {
          await this.processImage();
        }

        // 在内存中创建处理后的图像（如果可用则使用缓存）
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("从 RAW 数据创建内存图像失败");
        }

        // 将 LibRaw RGB 数据转换为 Sharp 兼容缓冲区
        let sharpInstance;

        // 确定这是否为大图像以进行性能优化
        const isLargeImage = imageData.width * imageData.height > 20_000_000; // > 20MP
        const fastMode = opts.fastMode !== false; // 默认为快速模式

        // 优化的 Sharp 配置
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          // 性能优化
          sequentialRead: true,
          limitInputPixels: false,
          density: fastMode ? 72 : 300, // 降低 DPI 以提高速度
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        sharpInstance = sharp(imageData.data, sharpConfig);

        // 如果指定则应用调整大小并进行性能优化
        if (opts.width || opts.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            // 对大图像或启用快速模式时使用更快的核
            kernel:
              isLargeImage || fastMode
                ? sharp.kernel.cubic
                : sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true, // 启用快速加载时缩小优化
          };

          if (opts.width && opts.height) {
            sharpInstance = sharpInstance.resize(
              opts.width,
              opts.height,
              resizeOptions
            );
          } else if (opts.width) {
            sharpInstance = sharpInstance.resize(
              opts.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              opts.height,
              resizeOptions
            );
          }
        }

        // 配置色彩空间
        switch (opts.colorSpace.toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "cmyk":
            sharpInstance = sharpInstance.toColorspace("cmyk");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // 配置 JPEG 选项并进行性能优化
        const jpegOptions = {
          quality: Math.max(1, Math.min(100, opts.quality)),
          progressive: fastMode ? false : opts.progressive, // 为速度禁用渐进式
          mozjpeg: fastMode ? false : opts.mozjpeg, // 为速度禁用 mozjpeg
          trellisQuantisation: fastMode ? false : opts.trellisQuantisation,
          optimizeScans: fastMode ? false : opts.optimizeScans,
          overshootDeringing: false, // 总是为速度禁用
          optimizeCoding: fastMode ? false : opts.optimizeCoding,
          // 为 JPEG 编码添加努力控制
          effort: fastMode ? 1 : Math.min(opts.effort || 4, 6),
        };

        // 设置色度子采样
        switch (opts.chromaSubsampling) {
          case "4:4:4":
            jpegOptions.chromaSubsampling = "4:4:4";
            break;
          case "4:2:2":
            jpegOptions.chromaSubsampling = "4:4:4"; // Sharp 不支持 4:2:2，改用 4:4:4
            break;
          case "4:2:0":
          default:
            jpegOptions.chromaSubsampling = "4:2:0";
            break;
        }

        // 转换为 JPEG 并获取缓冲区
        const jpegBuffer = await sharpInstance
          .jpeg(jpegOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000; // 转换为毫秒

        // 计算压缩比
        const originalSize = imageData.dataSize;
        const compressedSize = jpegBuffer.data.length;
        const compressionRatio = originalSize / compressedSize;

        const result = {
          success: true,
          buffer: jpegBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: jpegBuffer.info.width,
              height: jpegBuffer.info.height,
            },
            fileSize: {
              original: originalSize,
              compressed: compressedSize,
              compressionRatio: compressionRatio.toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                originalSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            jpegOptions: jpegOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`JPEG buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * 在内存中创建处理后的图像作为 PNG 缓冲区
   * @param {Object} options - PNG 转换选项
   * @param {number} [options.width] - 目标宽度
   * @param {number} [options.height] - 目标高度
   * @param {number} [options.compressionLevel=6] - PNG 压缩级别 (0-9)
   * @param {boolean} [options.progressive=false] - 使用渐进式 PNG
   * @param {string} [options.colorSpace='srgb'] - 输出色彩空间
   * @returns {Promise<Object>} - 包含元数据的 PNG 缓冲区
   */
  async createPNGBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // 智能处理：仅在未处理时处理
        if (!this._isProcessed) {
          await this.processImage();
        }

        // 在内存中创建处理后的图像（如果可用则使用缓存）
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("从 RAW 数据创建内存图像失败");
        }

        // 设置 Sharp 配置
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // 如果指定则应用调整大小
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // 配置色彩空间
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // 配置 PNG 选项
        const pngOptions = {
          compressionLevel: Math.max(
            0,
            Math.min(9, options.compressionLevel || 6)
          ),
          progressive: options.progressive || false,
          quality: 100, // PNG 是无损的
        };

        // 转换为 PNG 并获取缓冲区
        const pngBuffer = await sharpInstance
          .png(pngOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: pngBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: pngBuffer.info.width,
              height: pngBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: pngBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / pngBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            pngOptions: pngOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`PNG buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as TIFF buffer in memory
   * @param {Object} options - TIFF conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {string} [options.compression='lzw'] - TIFF compression ('none', 'lzw', 'jpeg', 'zip')
   * @param {number} [options.quality=90] - JPEG quality when using JPEG compression
   * @param {boolean} [options.pyramid=false] - Create pyramidal TIFF
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - TIFF buffer with metadata
   */
  async createTIFFBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // 智能处理：仅在未处理时处理
        if (!this._isProcessed) {
          await this.processImage();
        }

        // 在内存中创建处理后的图像（如果可用则使用缓存）
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("从 RAW 数据创建内存图像失败");
        }

        // 设置 Sharp 配置
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // 如果指定则应用调整大小
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // 配置色彩空间
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // 配置 TIFF 选项
        const tiffOptions = {
          compression: options.compression || "lzw",
          pyramid: options.pyramid || false,
          quality: options.quality || 90,
        };

        // 转换为 TIFF 并获取缓冲区
        const tiffBuffer = await sharpInstance
          .tiff(tiffOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: tiffBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: tiffBuffer.info.width,
              height: tiffBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: tiffBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / tiffBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            tiffOptions: tiffOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`TIFF buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as WebP buffer in memory
   * @param {Object} options - WebP conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {number} [options.quality=80] - WebP quality (1-100)
   * @param {boolean} [options.lossless=false] - Use lossless WebP
   * @param {number} [options.effort=4] - Encoding effort (0-6)
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - WebP buffer with metadata
   */
  async createWebPBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // 智能处理：仅在未处理时处理
        if (!this._isProcessed) {
          await this.processImage();
        }

        // 在内存中创建处理后的图像（如果可用则使用缓存）
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("从 RAW 数据创建内存图像失败");
        }

        // 设置 Sharp 配置
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // 如果指定则应用调整大小
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // 配置色彩空间
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // 配置 WebP 选项
        const webpOptions = {
          quality: Math.max(1, Math.min(100, options.quality || 80)),
          lossless: options.lossless || false,
          effort: Math.max(0, Math.min(6, options.effort || 4)),
        };

        // 转换为 WebP 并获取缓冲区
        const webpBuffer = await sharpInstance
          .webp(webpOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: webpBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: webpBuffer.info.width,
              height: webpBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: webpBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / webpBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            webpOptions: webpOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`WebP buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create processed image as AVIF buffer in memory
   * @param {Object} options - AVIF conversion options
   * @param {number} [options.width] - Target width
   * @param {number} [options.height] - Target height
   * @param {number} [options.quality=50] - AVIF quality (1-100)
   * @param {boolean} [options.lossless=false] - Use lossless AVIF
   * @param {number} [options.effort=4] - Encoding effort (0-9)
   * @param {string} [options.colorSpace='srgb'] - Output color space
   * @returns {Promise<Object>} - AVIF buffer with metadata
   */
  async createAVIFBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // 智能处理：仅在未处理时处理
        if (!this._isProcessed) {
          await this.processImage();
        }

        // 在内存中创建处理后的图像（如果可用则使用缓存）
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("从 RAW 数据创建内存图像失败");
        }

        // 设置 Sharp 配置
        const sharpConfig = {
          raw: {
            width: imageData.width,
            height: imageData.height,
            channels: imageData.colors,
            premultiplied: false,
          },
          sequentialRead: true,
          limitInputPixels: false,
        };

        if (imageData.bits === 16) {
          sharpConfig.raw.depth = "ushort";
        }

        let sharpInstance = sharp(imageData.data, sharpConfig);

        // 如果指定则应用调整大小
        if (options.width || options.height) {
          const resizeOptions = {
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
            fit: "inside",
            fastShrinkOnLoad: true,
          };

          if (options.width && options.height) {
            sharpInstance = sharpInstance.resize(
              options.width,
              options.height,
              resizeOptions
            );
          } else if (options.width) {
            sharpInstance = sharpInstance.resize(
              options.width,
              null,
              resizeOptions
            );
          } else {
            sharpInstance = sharpInstance.resize(
              null,
              options.height,
              resizeOptions
            );
          }
        }

        // 配置色彩空间
        switch ((options.colorSpace || "srgb").toLowerCase()) {
          case "rec2020":
            sharpInstance = sharpInstance.toColorspace("rec2020");
            break;
          case "p3":
            sharpInstance = sharpInstance.toColorspace("p3");
            break;
          case "srgb":
          default:
            sharpInstance = sharpInstance.toColorspace("srgb");
            break;
        }

        // 配置 AVIF 选项
        const avifOptions = {
          quality: Math.max(1, Math.min(100, options.quality || 50)),
          lossless: options.lossless || false,
          effort: Math.max(0, Math.min(9, options.effort || 4)),
        };

        // 转换为 AVIF 并获取缓冲区
        const avifBuffer = await sharpInstance
          .avif(avifOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: avifBuffer.data,
          metadata: {
            originalDimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            outputDimensions: {
              width: avifBuffer.info.width,
              height: avifBuffer.info.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: avifBuffer.data.length,
              compressionRatio: (
                imageData.dataSize / avifBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
            avifOptions: avifOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`AVIF buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create raw PPM buffer from processed image data
   * @returns {Promise<Object>} - PPM buffer with metadata
   */
  async createPPMBuffer() {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // 智能处理：仅在未处理时处理
        if (!this._isProcessed) {
          await this.processImage();
        }

        // 在内存中创建处理后的图像（如果可用则使用缓存）
        const imageData = await this.createMemoryImage();

        if (!imageData || !imageData.data) {
          throw new Error("从 RAW 数据创建内存图像失败");
        }

        // 创建 PPM 头部
        const header = `P6\n${imageData.width} ${imageData.height}\n255\n`;
        const headerBuffer = Buffer.from(header, "ascii");

        // 如果需要，将图像数据转换为 8 位 RGB
        let rgbData;
        if (imageData.bits === 16) {
          // 将 16 位转换为 8 位
          const pixels = imageData.width * imageData.height;
          const channels = imageData.colors;
          rgbData = Buffer.alloc(pixels * 3); // PPM 总是 RGB

          for (let i = 0; i < pixels; i++) {
            const srcOffset = i * channels * 2; // 16 位数据
            const dstOffset = i * 3;

            // 读取 16 位值并转换为 8 位
            rgbData[dstOffset] = Math.min(
              255,
              Math.floor((imageData.data.readUInt16LE(srcOffset) / 65535) * 255)
            ); // R
            rgbData[dstOffset + 1] = Math.min(
              255,
              Math.floor(
                (imageData.data.readUInt16LE(srcOffset + 2) / 65535) * 255
              )
            ); // G
            rgbData[dstOffset + 2] = Math.min(
              255,
              Math.floor(
                (imageData.data.readUInt16LE(srcOffset + 4) / 65535) * 255
              )
            ); // B
          }
        } else {
          // Already 8-bit, just copy RGB channels
          const pixels = imageData.width * imageData.height;
          const channels = imageData.colors;
          rgbData = Buffer.alloc(pixels * 3);

          for (let i = 0; i < pixels; i++) {
            const srcOffset = i * channels;
            const dstOffset = i * 3;

            rgbData[dstOffset] = imageData.data[srcOffset]; // R
            rgbData[dstOffset + 1] = imageData.data[srcOffset + 1]; // G
            rgbData[dstOffset + 2] = imageData.data[srcOffset + 2]; // B
          }
        }

        // Combine header and data
        const ppmBuffer = Buffer.concat([headerBuffer, rgbData]);

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: ppmBuffer,
          metadata: {
            format: "PPM",
            dimensions: {
              width: imageData.width,
              height: imageData.height,
            },
            fileSize: {
              original: imageData.dataSize,
              compressed: ppmBuffer.length,
              compressionRatio: (imageData.dataSize / ppmBuffer.length).toFixed(
                2
              ),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
              throughputMBps: (
                imageData.dataSize /
                1024 /
                1024 /
                (processingTime / 1000)
              ).toFixed(2),
            },
          },
        };

        resolve(result);
      } catch (error) {
        reject(new Error(`PPM buffer creation failed: ${error.message}`));
      }
    });
  }

  /**
   * Create thumbnail as JPEG buffer in memory
   * @param {Object} options - JPEG options for thumbnail
   * @param {number} [options.quality=85] - JPEG quality
   * @param {number} [options.maxSize] - Maximum dimension size
   * @returns {Promise<Object>} - Thumbnail JPEG buffer with metadata
   */
  async createThumbnailJPEGBuffer(options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = process.hrtime.bigint();

        // Unpack thumbnail if needed
        await this.unpackThumbnail();

        // Create thumbnail in memory
        const thumbData = await this.createMemoryThumbnail();

        if (!thumbData || !thumbData.data) {
          throw new Error("Failed to create memory thumbnail");
        }

        let sharpInstance;

        // Check if thumbnail is already JPEG
        if (await this.isJPEGThumb()) {
          // Thumbnail is already JPEG, return directly or reprocess if options specified
          if (!options.quality && !options.maxSize) {
            const result = {
              success: true,
              buffer: thumbData.data,
              metadata: {
                format: "JPEG",
                dimensions: {
                  width: thumbData.width,
                  height: thumbData.height,
                },
                fileSize: {
                  compressed: thumbData.data.length,
                },
                processing: {
                  timeMs: "0.00",
                  fromCache: true,
                },
              },
            };
            resolve(result);
            return;
          } else {
            // Reprocess existing JPEG with new options
            sharpInstance = sharp(thumbData.data);
          }
        } else {
          // Convert RAW thumbnail data
          const sharpConfig = {
            raw: {
              width: thumbData.width,
              height: thumbData.height,
              channels: thumbData.colors || 3,
              premultiplied: false,
            },
          };

          if (thumbData.bits === 16) {
            sharpConfig.raw.depth = "ushort";
          }

          sharpInstance = sharp(thumbData.data, sharpConfig);
        }

        // Apply max size constraint if specified
        if (options.maxSize) {
          sharpInstance = sharpInstance.resize(
            options.maxSize,
            options.maxSize,
            {
              fit: "inside",
              withoutEnlargement: true,
            }
          );
        }

        // Configure JPEG options
        const jpegOptions = {
          quality: Math.max(1, Math.min(100, options.quality || 85)),
          progressive: false, // Thumbnails typically don't need progressive
          mozjpeg: false, // Keep simple for speed
        };

        // Convert to JPEG buffer
        const jpegBuffer = await sharpInstance
          .jpeg(jpegOptions)
          .toBuffer({ resolveWithObject: true });

        const endTime = process.hrtime.bigint();
        const processingTime = Number(endTime - startTime) / 1000000;

        const result = {
          success: true,
          buffer: jpegBuffer.data,
          metadata: {
            format: "JPEG",
            originalDimensions: {
              width: thumbData.width,
              height: thumbData.height,
            },
            outputDimensions: {
              width: jpegBuffer.info.width,
              height: jpegBuffer.info.height,
            },
            fileSize: {
              original: thumbData.dataSize || thumbData.data.length,
              compressed: jpegBuffer.data.length,
              compressionRatio: (
                (thumbData.dataSize || thumbData.data.length) /
                jpegBuffer.data.length
              ).toFixed(2),
            },
            processing: {
              timeMs: processingTime.toFixed(2),
            },
            jpegOptions: jpegOptions,
          },
        };

        resolve(result);
      } catch (error) {
        reject(
          new Error(`Thumbnail JPEG buffer creation failed: ${error.message}`)
        );
      }
    });
  }

  // ============== JPEG CONVERSION (NEW FEATURE) ==============

  /**
   * Convert RAW to JPEG with advanced options
   * @param {string} inputPath - Input RAW file path (optional, uses currently loaded file if not provided)
   * @param {string} outputPath - Output JPEG file path
   * @param {Object} options - JPEG conversion options
   * @param {number} [options.quality=85] - JPEG quality (1-100)
   * @param {number} [options.width] - Target width (maintains aspect ratio if height not specified)
   * @param {number} [options.height] - Target height (maintains aspect ratio if width not specified)
   * @param {boolean} [options.progressive=false] - Use progressive JPEG
   * @param {boolean} [options.mozjpeg=true] - Use mozjpeg encoder for better compression
   * @param {number} [options.chromaSubsampling='4:2:0'] - Chroma subsampling ('4:4:4', '4:2:2', '4:2:0')
   * @param {boolean} [options.trellisQuantisation=false] - Enable trellis quantisation
   * @param {boolean} [options.optimizeScans=false] - Optimize scan order
   * @param {number} [options.overshootDeringing=false] - Overshoot deringing
   * @param {boolean} [options.optimizeCoding=true] - Optimize Huffman coding
   * @param {string} [options.colorSpace='srgb'] - Output color space ('srgb', 'rec2020', 'p3', 'cmyk')
   * @returns {Promise<Object>} - Conversion result with metadata
   */
  async convertToJPEG(inputPath, outputPath, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Handle parameter variations
        let actualInputPath, actualOutputPath, actualOptions;
        
        if (typeof inputPath === 'string' && typeof outputPath === 'string') {
          // Three parameters: inputPath, outputPath, options
          actualInputPath = inputPath;
          actualOutputPath = outputPath;
          actualOptions = options || {};
        } else if (typeof inputPath === 'string' && typeof outputPath === 'object') {
          // Two parameters: outputPath, options (backward compatibility)
          actualInputPath = null; // Use currently loaded file
          actualOutputPath = inputPath;
          actualOptions = outputPath || {};
        } else {
          throw new Error('Invalid parameters. Expected: convertToJPEG(inputPath, outputPath, options) or convertToJPEG(outputPath, options)');
        }

        // Load file if inputPath is provided and different from currently loaded file
        if (actualInputPath) {
          await this.loadFile(actualInputPath);
        }

        // Create JPEG buffer first
        const result = await this.createJPEGBuffer(actualOptions);

        // Write buffer to file
        const fs = require("fs");
        fs.writeFileSync(actualOutputPath, result.buffer);

        // Get output file stats
        const stats = fs.statSync(actualOutputPath);

        // Return result in the same format as before
        resolve({
          success: true,
          outputPath: actualOutputPath,
          metadata: {
            ...result.metadata,
            fileSize: {
              ...result.metadata.fileSize,
              compressed: stats.size,
            },
          },
        });
      } catch (error) {
        reject(new Error(`JPEG conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Batch convert multiple RAW files to JPEG
   * @param {string[]} inputPaths - Array of input RAW file paths
   * @param {string} outputDir - Output directory for JPEG files
   * @param {Object} options - JPEG conversion options (same as convertToJPEG)
   * @returns {Promise<Object>} - Batch conversion results
   */
  async batchConvertToJPEG(inputPaths, outputDir, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const fs = require("fs");
        const path = require("path");

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const results = {
          successful: [],
          failed: [],
          summary: {
            total: inputPaths.length,
            processed: 0,
            errors: 0,
            totalProcessingTime: 0,
            averageCompressionRatio: 0,
            totalOriginalSize: 0,
            totalCompressedSize: 0,
          },
        };

        const startTime = process.hrtime.bigint();

        for (const inputPath of inputPaths) {
          try {
            // Generate output filename
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const outputPath = path.join(outputDir, `${baseName}.jpg`);

            // Load the RAW file
            await this.close(); // Close any previous file
            await this.loadFile(inputPath);

            // Convert to JPEG
            const result = await this.convertToJPEG(outputPath, options);

            results.successful.push({
              input: inputPath,
              output: outputPath,
              result: result,
            });

            results.summary.processed++;
            results.summary.totalOriginalSize +=
              result.metadata.fileSize.original;
            results.summary.totalCompressedSize +=
              result.metadata.fileSize.compressed;
          } catch (error) {
            results.failed.push({
              input: inputPath,
              error: error.message,
            });
            results.summary.errors++;
          }
        }

        const endTime = process.hrtime.bigint();
        results.summary.totalProcessingTime =
          Number(endTime - startTime) / 1000000; // ms

        if (results.summary.totalOriginalSize > 0) {
          results.summary.averageCompressionRatio = (
            results.summary.totalOriginalSize /
            results.summary.totalCompressedSize
          ).toFixed(2);
        }

        results.summary.averageProcessingTimePerFile = (
          results.summary.totalProcessingTime / inputPaths.length
        ).toFixed(2);

        resolve(results);
      } catch (error) {
        reject(new Error(`Batch JPEG conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Get optimal JPEG conversion settings based on image analysis
   * @param {Object} analysisOptions - Options for image analysis
   * @returns {Promise<Object>} - Recommended JPEG settings
   */
  async getOptimalJPEGSettings(analysisOptions = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        // Get image metadata and process for analysis
        const metadata = await this.getMetadata();
        const imageSize = await this.getImageSize();

        // Analyze image characteristics
        const imageArea = metadata.width * metadata.height;
        const isHighRes = imageArea > 6000 * 4000; // > 24MP
        const isMediumRes = imageArea > 3000 * 2000; // > 6MP

        // Default settings based on image characteristics
        let recommendedSettings = {
          quality: 85,
          progressive: false,
          mozjpeg: true,
          chromaSubsampling: "4:2:0",
          optimizeCoding: true,
          trellisQuantisation: false,
          optimizeScans: false,
          reasoning: [],
        };

        // Adjust settings based on image size
        if (isHighRes) {
          recommendedSettings.quality = 80; // Slightly lower quality for large images
          recommendedSettings.progressive = true; // Progressive loading for large images
          recommendedSettings.trellisQuantisation = true; // Better compression for large images
          recommendedSettings.reasoning.push(
            "High resolution image detected - optimizing for file size"
          );
        } else if (isMediumRes) {
          recommendedSettings.quality = 85;
          recommendedSettings.reasoning.push(
            "Medium resolution image - balanced quality/size"
          );
        } else {
          recommendedSettings.quality = 90; // Higher quality for smaller images
          recommendedSettings.chromaSubsampling = "4:4:4"; // Better chroma for small images (Sharp compatible)
          recommendedSettings.reasoning.push(
            "Lower resolution image - prioritizing quality"
          );
        }

        // Adjust for different use cases
        if (analysisOptions.usage === "web") {
          recommendedSettings.quality = Math.min(
            recommendedSettings.quality,
            80
          );
          recommendedSettings.progressive = true;
          recommendedSettings.optimizeScans = true;
          recommendedSettings.reasoning.push(
            "Web usage - optimized for loading speed"
          );
        } else if (analysisOptions.usage === "print") {
          recommendedSettings.quality = Math.max(
            recommendedSettings.quality,
            90
          );
          recommendedSettings.chromaSubsampling = "4:4:4"; // Use 4:4:4 instead of 4:2:2 for Sharp compatibility
          recommendedSettings.reasoning.push(
            "Print usage - optimized for quality"
          );
        } else if (analysisOptions.usage === "archive") {
          recommendedSettings.quality = 95;
          recommendedSettings.chromaSubsampling = "4:4:4";
          recommendedSettings.trellisQuantisation = true;
          recommendedSettings.reasoning.push(
            "Archive usage - maximum quality preservation"
          );
        }

        // Camera-specific optimizations
        if (metadata.make) {
          const make = metadata.make.toLowerCase();
          if (make.includes("canon") || make.includes("nikon")) {
            // Professional cameras often benefit from slightly different settings
            recommendedSettings.reasoning.push(
              `${metadata.make} camera detected - professional settings`
            );
          }
        }

        resolve({
          recommended: recommendedSettings,
          imageAnalysis: {
            dimensions: {
              width: metadata.width,
              height: metadata.height,
              area: imageArea,
            },
            category: isHighRes
              ? "high-resolution"
              : isMediumRes
              ? "medium-resolution"
              : "low-resolution",
            camera: {
              make: metadata.make,
              model: metadata.model,
            },
          },
        });
      } catch (error) {
        reject(
          new Error(
            `Failed to analyze image for optimal settings: ${error.message}`
          )
        );
      }
    });
  }

  // ============== CANCELLATION SUPPORT ==============

  /**
   * Set cancellation flag to stop processing
   * @returns {Promise<boolean>} - Success status
   */
  async setCancelFlag() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.setCancelFlag();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear cancellation flag
   * @returns {Promise<boolean>} - Success status
   */
  async clearCancelFlag() {
    return new Promise((resolve, reject) => {
      try {
        const result = this._wrapper.clearCancelFlag();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============== VERSION INFORMATION (INSTANCE METHODS) ==============

  /**
   * Get LibRaw version string
   * @returns {string} - Version string
   */
  version() {
    return this._wrapper.version();
  }

  /**
   * Get LibRaw version as array [major, minor, patch]
   * @returns {number[]} - Version number array
   */
  versionNumber() {
    return this._wrapper.versionNumber();
  }

  // ============== STATIC METHODS ==============

  /**
   * Get LibRaw version
   * @returns {string} - Version string
   */
  static getVersion() {
    return librawAddon.LibRawWrapper.getVersion();
  }

  /**
   * Get LibRaw capabilities
   * @returns {number} - Capabilities flags
   */
  static getCapabilities() {
    return librawAddon.LibRawWrapper.getCapabilities();
  }

  /**
   * Get list of supported cameras
   * @returns {string[]} - Array of camera names
   */
  static getCameraList() {
    return librawAddon.LibRawWrapper.getCameraList();
  }

  /**
   * Get count of supported cameras
   * @returns {number} - Number of supported cameras
   */
  static getCameraCount() {
    return librawAddon.LibRawWrapper.getCameraCount();
  }

  /**
   * High-performance fast JPEG conversion with minimal processing
   * @param {string} outputPath - Output JPEG file path
   * @param {Object} options - Speed-optimized JPEG options
   * @returns {Promise<Object>} - Conversion result
   */
  async convertToJPEGFast(outputPath, options = {}) {
    return this.convertToJPEG(outputPath, {
      fastMode: true,
      effort: 1, // Fastest encoding
      progressive: false,
      trellisQuantisation: false,
      optimizeScans: false,
      mozjpeg: false,
      quality: options.quality || 80,
      ...options,
    });
  }

  /**
   * Create multiple JPEG sizes from single RAW (thumbnail, web, full)
   * @param {string} baseOutputPath - Base output path (without extension)
   * @param {Object} options - Multi-size options
   * @returns {Promise<Object>} - Multi-size conversion results
   */
  async convertToJPEGMultiSize(baseOutputPath, options = {}) {
    const sizes = options.sizes || [
      { name: "thumb", width: 400, quality: 85 },
      { name: "web", width: 1920, quality: 80 },
      { name: "full", quality: 85 },
    ];

    // Process the RAW once (uses smart caching)
    if (!this._isProcessed) {
      await this.processImage();
    }

    const results = {};
    const startTime = Date.now();

    // Create all sizes sequentially to reuse cached data
    for (const sizeConfig of sizes) {
      const outputPath = `${baseOutputPath}_${sizeConfig.name}.jpg`;
      const sizeStart = Date.now();

      const result = await this.convertToJPEG(outputPath, {
        fastMode: true,
        width: sizeConfig.width,
        height: sizeConfig.height,
        quality: sizeConfig.quality || 85,
        effort: sizeConfig.effort || 2,
        ...sizeConfig,
      });

      const sizeEnd = Date.now();

      results[sizeConfig.name] = {
        name: sizeConfig.name,
        outputPath,
        dimensions: result.metadata.outputDimensions,
        fileSize: result.metadata.fileSize.compressed,
        processingTime: sizeEnd - sizeStart,
        config: sizeConfig,
      };
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return {
      success: true,
      sizes: results,
      originalDimensions: Object.values(results)[0]
        ? Object.values(results)[0].dimensions
        : { width: 0, height: 0 },
      totalProcessingTime: totalTime,
      averageTimePerSize: `${(totalTime / sizes.length).toFixed(2)}ms`,
    };
  }

  /**
   * High-performance parallel batch conversion using worker threads
   * @param {string[]} inputPaths - Array of RAW file paths
   * @param {string} outputDir - Output directory
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Batch conversion results
   */
  static async batchConvertToJPEGParallel(inputPaths, outputDir, options = {}) {
    const fs = require("fs");
    const path = require("path");
    const os = require("os");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const maxConcurrency =
      options.maxConcurrency || Math.min(os.cpus().length, 4);
    const results = [];
    const errors = [];
    const startTime = Date.now();

    // Process files in parallel batches
    for (let i = 0; i < inputPaths.length; i += maxConcurrency) {
      const batch = inputPaths.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (inputPath) => {
        try {
          const fileName = path.parse(inputPath).name;
          const outputPath = path.join(outputDir, `${fileName}.jpg`);

          const libraw = new LibRaw();
          await libraw.loadFile(inputPath);

          const result = await libraw.convertToJPEG(outputPath, {
            fastMode: true,
            effort: 1,
            quality: options.quality || 85,
            ...options,
          });

          await libraw.close();

          return {
            inputPath,
            outputPath,
            success: true,
            fileSize: result.metadata.fileSize.compressed,
            processingTime: result.metadata.processing.timeMs,
          };
        } catch (error) {
          errors.push({ inputPath, error: error.message });
          return {
            inputPath,
            success: false,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const endTime = Date.now();
    const successCount = results.filter((r) => r.success).length;

    return {
      totalFiles: inputPaths.length,
      successCount,
      errorCount: errors.length,
      results,
      errors,
      totalProcessingTime: endTime - startTime,
      averageTimePerFile:
        successCount > 0 ? (endTime - startTime) / successCount : 0,
    };
  }
}

module.exports = LibRaw;
