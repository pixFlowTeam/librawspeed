// LibRaw 包装器的 TypeScript 定义

export interface ColorMatrix {
  [index: number]: number[];
}

export interface CameraList {
  make: string;
  model: string;
  [index: number]: string;
}

export interface DecoderInfo {
  name: string;
  flags: number;
}

export interface MemImageFormat {
  width: number;
  height: number;
  colors: number;
  bps: number;
}

export interface Params {
  // 输出选项
  output_color?: number;
  output_bps?: number;
  output_tiff?: number;
  user_flip?: number;
  user_qual?: number;
  user_black?: number;
  user_sat?: number;
  med_passes?: number;
  auto_bright?: number;
  use_auto_wb?: number;
  use_camera_wb?: number;
  use_camera_matrix?: number;
  output_profile?: string;
  camera_profile?: string;
  bad_pixels?: string;
  dark_frame?: string;
  output_bps?: number;

  // 去马赛克选项
  half_size?: number;
  four_color_rgb?: number;
  highlight?: number;
  use_fuji_rotate?: number;
  dcb_iterations?: number;
  dcb_enhance_fl?: number;
  fbdd_noiserd?: number;

  // 颜色选项
  bright?: number;
  threshold?: number;
  aber?: number[];
  gamm?: number[];
  user_mul?: number[];
  shot_select?: number;
  green_matching?: number;

  // 高级选项
  no_auto_bright?: number;
  no_interpolation?: number;

  [key: string]: any;
}

export declare class LibRaw {
  constructor();

  // ============== 核心功能 ==============
  openFile(path: string): Promise<boolean>;
  openBuffer(buffer: Buffer): Promise<boolean>;
  unpack(): Promise<boolean>;
  dcrawProcess(): Promise<boolean>;
  dcrawMakeMem(): Promise<Buffer>;
  getLastError(): string;
  strerror(errorCode: number): string;

  // ============== 图像信息 ==============
  getImageParams(): Promise<any>;
  getFileInfo(): Promise<any>;
  getThumbnail(): Promise<Buffer | null>;
  getExifMakerNote(): Promise<any>;

  // ============== 处理参数 ==============
  setParams(params: Params): Promise<boolean>;
  getParams(): Promise<Params>;

  // ============== 色彩管理 ==============
  getCameraColorMatrix(): Promise<ColorMatrix>;
  getRGBCameraMatrix(): Promise<ColorMatrix>;

  // ============== 工具函数 ==============
  version(): string;
  versionNumber(): number[];
  getCameraList(): Promise<CameraList>;
  isValidFile(path: string): Promise<boolean>;

  // ============== 数据访问 ==============
  getRawImageBuffer(): Promise<Buffer>;
  getProcessedImageBuffer(): Promise<Buffer>;

  // ============== 高级处理 ==============
  raw2Image(): Promise<boolean>;
  dcrawClear(): Promise<boolean>;
  recycle(): Promise<boolean>;

  // ============== 错误处理 ==============
  checkLoaded(): Promise<boolean>;

  // ============== 内存操作 ==============
  getMemoryRequirements(): Promise<number>;

  // ============== 质量控制 ==============
  validateProcessing(): Promise<boolean>;

  // ============== 扩展工具函数 ==============
  isNikonSRAW(): Promise<boolean>;
  isCoolscanNEF(): Promise<boolean>;
  haveFPData(): Promise<boolean>;
  srawMidpoint(): Promise<number>;
  thumbOK(maxSize?: number): Promise<number>;
  unpackFunctionName(): Promise<string>;
  getDecoderInfo(): Promise<DecoderInfo>;

  // ============== 高级处理 ==============
  raw2ImageEx(subtractBlack?: boolean): Promise<boolean>;
  adjustSizesInfoOnly(): Promise<boolean>;
  freeImage(): Promise<boolean>;
  convertFloatToInt(dmin?: number, dmax?: number, dtarget?: number): Promise<boolean>;

  // ============== 扩展内存操作 ==============
  getMemImageFormat(): Promise<MemImageFormat>;
  copyMemImage(buffer: Buffer, stride: number, bgr?: boolean): Promise<boolean>;

  // ============== 颜色操作 ==============
  getColorAt(row: number, col: number): Promise<number>;

  // ============== 取消支持 ==============
  setCancelFlag(): Promise<boolean>;
  clearCancelFlag(): Promise<boolean>;

  // ============== 静态方法 ==============
  static getVersion(): string;
  static getSupportedFormats(): string[];
  static isFormatSupported(extension: string): boolean;
}

export default LibRaw;
