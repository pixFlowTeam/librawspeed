/*
  演示：camera / auto / user_mul 三种白平衡导出，并打印估算的色温(K)与Duv；
  支持在JS侧按目标 K/Duv 进行一次 CAT（Bradford）白点适应，然后用 sharp 写出。

  说明：
  - 读取：使用本库的 LibRaw JS 封装，输出线性 sRGB（gamma=[1,1], output_color=1, no_auto_bright=1, 16bit）
  - 估算：从线性 sRGB 的全图均值估算 XYZ→xy→K 与 Duv（简化近似，足够做演示/相对比较）
  - 调整：在“线性 sRGB”里构建 Bradford CAT 3×3 矩阵，用 sharp.recomb 应用；
  - 编码：用 sharp.gamma(1/2.2) 近似 sRGB OETF，再写出（演示用，非严格 OETF）。
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const LibRaw = require('..');

// ========== 数学/色彩工具 ==========

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// 线性 sRGB → XYZ（D65）
function srgbLinearToXYZ([r, g, b]) {
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  return [X, Y, Z];
}

function xyzToXy([X, Y, Z]) {
  const S = X + Y + Z;
  if (S <= 1e-12) return { x: 0.3127, y: 0.3290 }; // D65 fallback
  return { x: X / S, y: Y / S };
}

// 近似：McCamy CCT 估算（xy→K）
function xyToKelvinApprox({ x, y }) {
  const n = (x - 0.3320) / (0.1858 - y);
  const CCT = 449.0 * Math.pow(n, 3) + 3525.0 * Math.pow(n, 2) + 6823.3 * n + 5520.33;
  return Math.max(1000, Math.min(40000, CCT));
}

// xy→1960 u,v
function xyToUV1960({ x, y }) {
  const denom = (-2 * x) + (12 * y) + 3;
  if (Math.abs(denom) < 1e-9) return { u: 0.21, v: 0.48 };
  const u = (4 * x) / denom;
  const v = (6 * y) / denom;
  return { u, v };
}

// 粗略 K→xy（采用常见近似，演示用）
function kelvinToXYApprox(K) {
  const T = Math.max(1000, Math.min(40000, K));
  let x, y;
  if (T <= 4000) {
    x = -0.2661239e9 / (T * T * T) - 0.2343580e6 / (T * T) + 0.8776956e3 / T + 0.179910;
  } else {
    x = -3.0258469e9 / (T * T * T) + 2.1070379e6 / (T * T) + 0.2226347e3 / T + 0.240390;
  }
  if (T >= 1667 && T <= 2222) {
    y = -1.1063814 * Math.pow(x, 3) - 1.34811020 * Math.pow(x, 2) + 2.18555832 * x - 0.20219683;
  } else if (T > 2222 && T <= 4000) {
    y = -0.9549476 * Math.pow(x, 3) - 1.37418593 * Math.pow(x, 2) + 2.09137015 * x - 0.16748867;
  } else {
    y = 3.0817580 * Math.pow(x, 3) - 5.87338670 * Math.pow(x, 2) + 3.75112997 * x - 0.37001483;
  }
  return { x, y };
}

// 估算 Duv：以黑体在相同 K 的 v_bb 作为参考，duv = |(u,v)-(u_bb,v_bb)|，并按行业符号约定（Duv>0=绿色，Duv<0=洋红）
function estimateDuv(xy) {
  const K = xyToKelvinApprox(xy);
  const bb = kelvinToXYApprox(K);
  const { u, v } = xyToUV1960(xy);
  const { u: u_bb, v: v_bb } = xyToUV1960(bb);
  const du = u - u_bb;
  let dv = v - v_bb;
  let duv = Math.hypot(du, dv);
  // 行业口径：Duv>0=green，<0=magenta；经验：v_actual < v_bb 往往偏绿
  if (v < v_bb) duv = Math.abs(duv); else duv = -Math.abs(duv);
  return duv;
}

// 基于 cam_mul + cam_xyz 估算场景白点与 Kelvin/Duv（物理量，快速近似）
function estimateSceneWhiteXYFromCamMulAndCamXYZ(camMul, camXYZ) {
  const mR = Math.max(1e-6, Number(camMul?.[0] ?? 1));
  const mG = Math.max(1e-6, Number(camMul?.[1] ?? 1));
  const mB = Math.max(1e-6, Number(camMul?.[2] ?? 1));
  let r = 1 / mR, g = 1 / mG, b = 1 / mB;
  const s = r + g + b; r /= s; g /= s; b /= s;
  const M = [
    [Number(camXYZ?.[0]?.[0] ?? 0), Number(camXYZ?.[0]?.[1] ?? 0), Number(camXYZ?.[0]?.[2] ?? 0)],
    [Number(camXYZ?.[1]?.[0] ?? 0), Number(camXYZ?.[1]?.[1] ?? 0), Number(camXYZ?.[1]?.[2] ?? 0)],
    [Number(camXYZ?.[2]?.[0] ?? 0), Number(camXYZ?.[2]?.[1] ?? 0), Number(camXYZ?.[2]?.[2] ?? 0)],
  ];
  const X = r * M[0][0] + g * M[1][0] + b * M[2][0];
  const Y = r * M[0][1] + g * M[1][1] + b * M[2][1];
  const Z = r * M[0][2] + g * M[1][2] + b * M[2][2];
  const S = X + Y + Z;
  const x = S > 0 ? X / S : 0.3127;
  const y = S > 0 ? Y / S : 0.3290;
  return { x, y };
}

function estimateKelvinDuvFromCamMeta(camMul, camXYZ) {
  const xy = estimateSceneWhiteXYFromCamMulAndCamXYZ(camMul, camXYZ);
  const kelvin = Math.round(xyToKelvinApprox(xy));
  const duv = estimateDuv(xy);
  return { kelvin, duv, xy };
}

// Bradford CAT（在线性空间使用），输入/输出均为 XYZ 基
function buildBradfordCAT(srcXY, dstXY) {
  const M = [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296],
  ];
  const M_inv = [
    [0.9869929, -0.1470543, 0.1599627],
    [0.4323053, 0.5183603, 0.0492912],
    [-0.0085287, 0.0400428, 0.9684867],
  ];
  function matMul3(A, B) {
    const C = Array.from({ length: 3 }, () => [0, 0, 0]);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
    return C;
  }
  function vecMul3(A, v) {
    return [A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
            A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
            A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];
  }
  function xyToXYZ(xy) {
    const X = xy.x / xy.y;
    const Y = 1.0;
    const Z = (1 - xy.x - xy.y) / xy.y;
    return [X, Y, Z];
  }
  const srcXYZ = xyToXYZ(srcXY);
  const dstXYZ = xyToXYZ(dstXY);
  const srcLMS = vecMul3(M, srcXYZ);
  const dstLMS = vecMul3(M, dstXYZ);
  const D = [
    [dstLMS[0] / srcLMS[0], 0, 0],
    [0, dstLMS[1] / srcLMS[1], 0],
    [0, 0, dstLMS[2] / srcLMS[2]],
  ];
  return matMul3(M_inv, matMul3(D, M));
}

// 线性 sRGB ↔ XYZ 3×3（D65）
const XYZ_TO_SRGB_LINEAR = [
  [ 3.2406, -1.5372, -0.4986],
  [-0.9689,  1.8758,  0.0415],
  [ 0.0557, -0.2040,  1.0570],
];
const SRGB_LINEAR_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];

function mat3x3Multiply(A, B) {
  const C = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) C[i][j] += A[i][k] * B[k][j];
  return C;
}

// 构建在“线性 sRGB”内的 CAT 矩阵：RGB→XYZ→CAT→XYZ→RGB
function buildSRGBLinearCAT(srcXY, dstXY) {
  const CAT = buildBradfordCAT(srcXY, dstXY);
  const M = mat3x3Multiply(XYZ_TO_SRGB_LINEAR, mat3x3Multiply(CAT, SRGB_LINEAR_TO_XYZ));
  // sharp.recomb 需要按行展开
  return M.map(row => row.map(v => v));
}

// 从线性 sRGB 16bit 缓冲估算平均色温与 Duv（抽样以提速）
function estimateKelvinDuvFromLinearSRGBBuffer(imageData) {
  const { width, height, colors, bits, data } = imageData;
  if (colors !== 3) throw new Error('仅支持 3 通道 RGB');
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 500000))); // 至多采样~50万像素
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  if (bits === 16) {
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 3 * 2;
        const r = data.readUInt16LE(i) / 65535;
        const g = data.readUInt16LE(i + 2) / 65535;
        const b = data.readUInt16LE(i + 4) / 65535;
        sumR += r; sumG += g; sumB += b; count++;
      }
    }
  } else {
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 3;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        sumR += r; sumG += g; sumB += b; count++;
      }
    }
  }
  const mean = [sumR / count, sumG / count, sumB / count];
  const xyz = srgbLinearToXYZ(mean);
  const xy = xyzToXy(xyz);
  const kelvin = Math.round(xyToKelvinApprox(xy));
  const duv = estimateDuv(xy);
  return { kelvin, duv, xy };
}

// 直接使用 LibRaw 的内存图像（已去马赛克+色彩+伽马），按原样经 sharp 封装写出
async function writeFromMemImage(img, outPath, options = {}) {
  const { format = 'jpeg', quality = 92 } = options;
  const rawCfg = {
    raw: {
      width: img.width,
      height: img.height,
      channels: img.colors,
      premultiplied: false,
      depth: img.bits === 16 ? 'ushort' : 'uchar',
    },
    sequentialRead: true,
    limitInputPixels: false,
  };
  let pipeline = sharp(img.data, rawCfg);
  if (format === 'png') {
    await pipeline.png({ compressionLevel: 6 }).toFile(outPath);
  } else {
    await pipeline.jpeg({ quality: Math.max(1, Math.min(100, quality)), chromaSubsampling: '4:4:4' }).toFile(outPath);
  }
}

// ========== 主流程 ==========

async function run() {
  const input = process.argv[2];
  const outDir = process.argv[3] || path.join(process.cwd(), 'output');
  if (!input) {
    console.log('用法: node examples/wb-js-demo.js <RAW文件> [输出目录]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const libraw = new LibRaw();
  await libraw.loadFile(input);

  // 读取相机矩阵并输出场景白点的 Kelvin/Duv（基于 cam_mul + cam_xyz）
  try {
    const adv = await libraw.getAdvancedMetadata();
    const { kelvin: kMeta, duv: dMeta, xy: xyMeta } = estimateKelvinDuvFromCamMeta(adv.camMul, adv.camXYZ);
    console.log(`[meta] K=${kMeta}, Duv=${dMeta.toFixed(4)}, xy=(${xyMeta.x.toFixed(4)},${xyMeta.y.toFixed(4)})`);
  } catch (_) {}

  // 三种 WB 配置
  const cases = [
    { name: 'camera', params: { use_camera_wb: true } },
    { name: 'auto', params: { use_auto_wb: true } },
    { name: 'user', params: { user_mul: [2.0, 1.0, 1.5, 1.0] } }, // 示例：手动增益
  ];

  for (const c of cases) {
    // 让 LibRaw 采用默认伽马（类似 sRGB），输出 sRGB，避免我们手动处理出错
    await libraw.setOutputParams({
      output_color: 1,  // sRGB
      output_bps: 8,    // 直接 8-bit 以便写 PPM/JPEG
      no_auto_bright: true,
      highlight: 0,
      ...c.params,
    });
    await libraw.processImage();
    const img = await libraw.createMemoryImage();

    // 估算 K/Duv（近似，仅作参考）
    const { kelvin, duv, xy } = estimateKelvinDuvFromLinearSRGBBuffer(img);
    console.log(`[${c.name}] K=${kelvin}, Duv=${duv.toFixed(4)}, xy=(${xy.x.toFixed(4)},${xy.y.toFixed(4)})`);

    // 直接从内存图像写出（不再额外应用 gamma/CAT）
    const baseName = path.parse(input).name;
    const jpgPath = path.join(outDir, `${baseName}_wb_${c.name}.jpg`);
    await writeFromMemImage(img, jpgPath, { format: 'jpeg', quality: 92 });
  }

  await libraw.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


