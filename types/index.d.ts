// TypeScript definitions for LibRaw wrapper

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
  // Output options
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

  // Demosaic options
  half_size?: number;
  four_color_rgb?: number;
  highlight?: number;
  use_fuji_rotate?: number;
  dcb_iterations?: number;
  dcb_enhance_fl?: number;
  fbdd_noiserd?: number;

  // Color options
  bright?: number;
  threshold?: number;
  aber?: number[];
  gamm?: number[];
  user_mul?: number[];
  shot_select?: number;
  green_matching?: number;

  // Advanced options
  no_auto_bright?: number;
  no_interpolation?: number;

  [key: string]: any;
}

export declare class LibRaw {
  constructor();

  // ============== CORE FUNCTIONALITY ==============
  openFile(path: string): Promise<boolean>;
  openBuffer(buffer: Buffer): Promise<boolean>;
  unpack(): Promise<boolean>;
  dcrawProcess(): Promise<boolean>;
  dcrawMakeMem(): Promise<Buffer>;
  getLastError(): string;
  strerror(errorCode: number): string;

  // ============== IMAGE INFORMATION ==============
  getImageParams(): Promise<any>;
  getFileInfo(): Promise<any>;
  getThumbnail(): Promise<Buffer | null>;
  getExifMakerNote(): Promise<any>;

  // ============== PROCESSING PARAMETERS ==============
  setParams(params: Params): Promise<boolean>;
  getParams(): Promise<Params>;

  // ============== COLOR MANAGEMENT ==============
  getCameraColorMatrix(): Promise<ColorMatrix>;
  getRGBCameraMatrix(): Promise<ColorMatrix>;

  // ============== UTILITY ==============
  version(): string;
  versionNumber(): number[];
  getCameraList(): Promise<CameraList>;
  isValidFile(path: string): Promise<boolean>;

  // ============== DATA ACCESS ==============
  getRawImageBuffer(): Promise<Buffer>;
  getProcessedImageBuffer(): Promise<Buffer>;

  // ============== ADVANCED PROCESSING ==============
  raw2Image(): Promise<boolean>;
  dcrawClear(): Promise<boolean>;
  recycle(): Promise<boolean>;

  // ============== ERROR HANDLING ==============
  checkLoaded(): Promise<boolean>;

  // ============== MEMORY OPERATIONS ==============
  getMemoryRequirements(): Promise<number>;

  // ============== QUALITY CONTROL ==============
  validateProcessing(): Promise<boolean>;

  // ============== EXTENDED UTILITY FUNCTIONS ==============
  isNikonSRAW(): Promise<boolean>;
  isCoolscanNEF(): Promise<boolean>;
  haveFPData(): Promise<boolean>;
  srawMidpoint(): Promise<number>;
  thumbOK(maxSize?: number): Promise<number>;
  unpackFunctionName(): Promise<string>;
  getDecoderInfo(): Promise<DecoderInfo>;

  // ============== ADVANCED PROCESSING ==============
  raw2ImageEx(subtractBlack?: boolean): Promise<boolean>;
  adjustSizesInfoOnly(): Promise<boolean>;
  freeImage(): Promise<boolean>;
  convertFloatToInt(dmin?: number, dmax?: number, dtarget?: number): Promise<boolean>;

  // ============== MEMORY OPERATIONS EXTENDED ==============
  getMemImageFormat(): Promise<MemImageFormat>;
  copyMemImage(buffer: Buffer, stride: number, bgr?: boolean): Promise<boolean>;

  // ============== COLOR OPERATIONS ==============
  getColorAt(row: number, col: number): Promise<number>;

  // ============== CANCELLATION SUPPORT ==============
  setCancelFlag(): Promise<boolean>;
  clearCancelFlag(): Promise<boolean>;

  // ============== STATIC METHODS ==============
  static getVersion(): string;
  static getSupportedFormats(): string[];
  static isFormatSupported(extension: string): boolean;
}

export default LibRaw;
