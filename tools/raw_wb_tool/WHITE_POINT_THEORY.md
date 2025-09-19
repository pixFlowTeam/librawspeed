# 白点白平衡理论与实现详解

## 目录
1. [核心概念](#核心概念)
2. [白点调节白平衡的原理](#白点调节白平衡的原理)
3. [色温色调与白点的转换](#色温色调与白点的转换)
4. [LibRaw 白平衡系数与白点的关系](#libraw-白平衡系数与白点的关系)
5. [实现方案对比](#实现方案对比)
6. [使用示例](#使用示例)

## 核心概念

### 1.1 白点（White Point）

**白点**是色彩管理中的基础概念，定义了在特定光照条件下"纯白色"的色度坐标。

```
白点 = 光源下完美漫反射体的色度坐标
     = 人眼感知为"白色"的参考点
```

### 1.2 CIE 色度坐标系统

```
XYZ 三刺激值：
- X, Y, Z: 基于人眼视锥细胞响应的标准化值
- Y: 亮度分量
- X, Z: 色度分量

xy 色度坐标：
- x = X / (X + Y + Z)
- y = Y / (X + Y + Z)
- 去除亮度信息，只保留色度
```

### 1.3 标准光源

| 光源 | 色温(K) | x | y | 应用场景 |
|------|---------|---|---|----------|
| A | 2856 | 0.4476 | 0.4074 | 钨丝灯 |
| D50 | 5003 | 0.3457 | 0.3585 | 印刷标准 |
| D65 | 6504 | 0.3127 | 0.3290 | 日光标准 |
| D75 | 7504 | 0.2990 | 0.3149 | 北方日光 |

## 白点调节白平衡的原理

### 2.1 色彩适应理论

人眼具有**色彩恒常性**（Color Constancy）：在不同光源下，对同一物体颜色的感知保持相对稳定。

```
实际过程：
1. 眼睛适应当前光源的白点
2. 大脑"归一化"所有颜色相对于白点
3. 保持物体颜色的相对关系
```

### 2.2 色彩适应变换（CAT）

色彩适应变换模拟人眼的适应过程，将一个白点下的颜色转换到另一个白点下。

#### Bradford Transform（推荐）

```cpp
// Bradford 矩阵（RGB -> LMS 锥细胞响应空间）
M_Bradford = [
    [ 0.8951,  0.2664, -0.1614],
    [-0.7502,  1.7135,  0.0367],
    [ 0.0389, -0.0685,  1.0296]
]

// 变换步骤
1. RGB -> XYZ (使用色彩矩阵)
2. XYZ -> LMS (使用 Bradford 矩阵)
3. 应用适应：LMS_dst = LMS_src * (LMS_white_dst / LMS_white_src)
4. LMS -> XYZ (逆 Bradford 矩阵)
5. XYZ -> RGB (逆色彩矩阵)
```

#### 数学表达式

给定源白点 $W_s$ 和目标白点 $W_t$：

$$\mathbf{C}_{adapted} = \mathbf{M}^{-1} \cdot \mathbf{D} \cdot \mathbf{M} \cdot \mathbf{C}_{original}$$

其中：
- $\mathbf{M}$: Bradford 矩阵
- $\mathbf{D}$: 对角适应矩阵 $diag(L_t/L_s, M_t/M_s, S_t/S_s)$

### 2.3 与简单通道缩放的区别

#### 简单通道缩放（传统方法）
```cpp
R_out = R_in * gain_r
G_out = G_in * gain_g  
B_out = B_in * gain_b
```

**问题**：
- 破坏色彩关系
- 可能产生色偏
- 不符合视觉感知

#### 白点方法（CAT）
```cpp
// 保持色彩关系的非线性变换
XYZ_out = CAT(XYZ_in, source_wp, target_wp)
```

**优势**：
- 保持色相关系
- 感知均匀
- 科学准确

## 色温色调与白点的转换

### 3.1 色温到白点

色温基于**黑体辐射**理论：

```cpp
// Planck's Law (简化)
λ_peak = 2.898e-3 / T  // Wien's displacement law

// 色温 K 到 xy 坐标（McCamy 近似）
double KelvinToXY(double K) {
    if (K >= 1667 && K <= 25000) {
        double n = 1e9 / (K * K * K);
        double x = -0.14282 * n*n*n + 0.32470 * n*n 
                   - 0.20064 * n + 0.2747;
        double y = -3.000 * x*x*x + 2.870 * x*x 
                   - 0.275 * x + 0.100;
        return {x, y};
    }
}
```

### 3.2 色调（Tint）的几何意义

色调表示偏离黑体轨迹的程度：

```
在 CIE 1960 UCS (u,v) 图上：
- 黑体轨迹是一条曲线
- 色调沿垂直于轨迹的方向
- Duv = 带符号的距离
  • Duv > 0: 洋红方向（轨迹上方）
  • Duv < 0: 绿色方向（轨迹下方）
```

### 3.3 组合转换

```cpp
ChromaticityXY ApplyTintToKelvin(double kelvin, double duv) {
    // 1. 获取黑体轨迹上的点
    auto base = KelvinToXY(kelvin);
    
    // 2. 转换到 u,v 空间
    double u = 4*base.x / (-2*base.x + 12*base.y + 3);
    double v = 6*base.y / (-2*base.x + 12*base.y + 3);
    
    // 3. 计算垂直方向（切线的法向量）
    auto tangent = CalculateTangent(kelvin);
    auto perpendicular = Rotate90(tangent);
    
    // 4. 应用偏移
    u += perpendicular.u * duv;
    v += perpendicular.v * duv;
    
    // 5. 转换回 xy
    return UVtoXY(u, v);
}
```

## LibRaw 白平衡系数与白点的关系

### 4.1 LibRaw 白平衡系数的含义

```cpp
// LibRaw 提供的白平衡系数
float pre_mul[4];  // RGBG 通道乘数

// 含义：将 RAW 值转换到"平衡"状态
RAW_balanced = RAW_original * pre_mul
```

### 4.2 从系数推算白点

#### 方法 1：直接比例法

```cpp
ChromaticityXY EstimateWhitePointFromCoefficients(float mul[4]) {
    // 1. 归一化到绿色通道
    float r_norm = mul[0] / mul[1];
    float b_norm = mul[2] / mul[1];
    
    // 2. 系数的倒数表示实际捕获的相对强度
    float r_actual = 1.0 / r_norm;
    float g_actual = 1.0;  
    float b_actual = 1.0 / b_norm;
    
    // 3. 通过色彩矩阵转换到 XYZ
    // (需要相机的色彩配置文件)
    XYZ xyz = CameraRGBtoXYZ(r_actual, g_actual, b_actual);
    
    // 4. 得到白点色度
    return xyz.toXY();
}
```

#### 方法 2：色温估算法

```cpp
double EstimateKelvinFromCoefficients(float mul[4]) {
    // R/G 和 B/G 比例
    float rg_ratio = (1.0/mul[0]) / (1.0/mul[1]);
    float bg_ratio = (1.0/mul[2]) / (1.0/mul[1]);
    
    // 经验公式（基于大量相机数据拟合）
    double log_ratio = log(bg_ratio / rg_ratio);
    double kelvin = 6500 * exp(log_ratio * 0.3);
    
    return clamp(kelvin, 2000, 12000);
}
```

### 4.3 从白点计算系数

```cpp
void CalculateCoefficientsFromWhitePoint(
    const ChromaticityXY& current_wp,
    const ChromaticityXY& target_wp,
    float out_mul[4]) {
    
    // 1. 转换到 XYZ
    XYZ current_XYZ = ChromaticityToXYZ(current_wp);
    XYZ target_XYZ = ChromaticityToXYZ(target_wp);
    
    // 2. 计算 CAT 矩阵
    Matrix3x3 cat = CalculateBradfordMatrix(current_XYZ, target_XYZ);
    
    // 3. 应用到标准 RGB 响应
    Vector3 rgb_response = cat * Vector3(1, 1, 1);
    
    // 4. 转换为通道系数
    out_mul[0] = rgb_response.r;
    out_mul[1] = rgb_response.g;  
    out_mul[2] = rgb_response.b;
    out_mul[3] = rgb_response.g;  // G2 = G1
}
```

## 实现方案对比

### 5.1 通道缩放方法 vs 白点方法

| 特性 | 通道缩放 | 白点方法 |
|------|----------|----------|
| **原理** | RGB 独立缩放 | 色彩适应变换 |
| **计算复杂度** | O(n) | O(n) × 矩阵运算 |
| **色彩准确性** | 中等 | 高 |
| **感知自然度** | 可能有色偏 | 自然 |
| **极值处理** | 简单裁剪 | 智能映射 |
| **标准兼容性** | 有限 | ICC 标准 |
| **实时性能** | 优秀 | 良好 |
| **调试难度** | 简单 | 需要色彩学知识 |

### 5.2 性能优化建议

```cpp
// 1. 预计算查找表
class WhitePointLUT {
    float lut[256][256][3];  // [kelvin_idx][tint_idx][RGB]
    
    void Precompute() {
        for (int k = 0; k < 256; ++k) {
            for (int t = 0; t < 256; ++t) {
                double kelvin = MapToKelvin(k);
                double tint = MapToTint(t);
                ComputeCAT(kelvin, tint, lut[k][t]);
            }
        }
    }
};

// 2. SIMD 加速
void ApplyCATSIMD(float* pixels, size_t count, const float mat[9]) {
    #pragma omp parallel for
    for (size_t i = 0; i < count; i += 4) {
        __m128 r = _mm_load_ps(&pixels[i*3]);
        __m128 g = _mm_load_ps(&pixels[i*3+4]);
        __m128 b = _mm_load_ps(&pixels[i*3+8]);
        // SIMD 矩阵乘法
        // ...
    }
}

// 3. GPU 加速 (OpenCL/CUDA)
__kernel void ApplyCAT(
    __global float3* input,
    __global float3* output,
    __constant float* matrix) {
    int idx = get_global_id(0);
    float3 rgb = input[idx];
    output[idx] = MatrixMultiply(matrix, rgb);
}
```

## 使用示例

### 6.1 基本用法

```bash
# 使用相机白平衡
./raw_wb_whitepoint --mode camera input.raw

# 指定色温
./raw_wb_whitepoint --mode kelvin --kelvin 5500 input.raw

# 指定色温和色调
./raw_wb_whitepoint --mode kelvin --kelvin 5500 --tint -0.01 input.raw

# 直接指定 xy 坐标
./raw_wb_whitepoint --mode xy --xy 0.3127,0.3290 input.raw

# 使用不同的 CAT 算法
./raw_wb_whitepoint --cat bradford --kelvin 4500 input.raw
./raw_wb_whitepoint --cat cat02 --kelvin 4500 input.raw
```

### 6.2 典型场景的白点选择

| 场景 | 推荐色温 | 色调 Duv | 说明 |
|------|----------|----------|------|
| 日光户外 | 5500-6500K | 0 | 标准日光 |
| 阴天 | 6500-7500K | 0 | 偏冷色调 |
| 钨丝灯室内 | 2800-3200K | 0 | 暖色调 |
| 荧光灯 | 4000-4500K | +0.01~+0.02 | 轻微洋红偏移 |
| LED 灯 | 3000-6500K | -0.01~0 | 可能偏绿 |
| 金色时刻 | 3000-3500K | +0.01 | 暖色+轻微洋红 |
| 蓝色时刻 | 8000-10000K | -0.01 | 冷色+轻微绿色 |

### 6.3 创意白平衡

```bash
# 电影感冷暖对比（Teal & Orange）
./raw_wb_whitepoint --kelvin 4500 --tint +0.02 input.raw

# 复古胶片感
./raw_wb_whitepoint --kelvin 3800 --tint +0.015 input.raw

# 清新自然
./raw_wb_whitepoint --kelvin 5800 --tint -0.005 input.raw
```

## 总结

白点方法提供了科学、准确、感知自然的白平衡调节方案。虽然计算复杂度略高于简单的通道缩放，但其优越的色彩准确性和标准兼容性使其成为专业色彩管理的首选方案。

通过 LibRaw 获取原始数据，结合 LittleCMS 的色彩管理能力，可以实现媲美专业软件的白平衡调节效果。理解白点、色温、色调之间的关系，以及它们与 LibRaw 系数的转换，是掌握这一技术的关键。
