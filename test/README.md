# LibRaw 测试套件

LibRaw Node.js 包装器的综合测试框架。

## 测试概述

测试套件包括对所有 LibRaw 功能的全面覆盖：

### 🧪 测试类别

1. **静态方法**（`static-methods.test.js`）

   - 库版本和功能
   - 相机列表和计数验证
   - 功能标志分析

2. **错误处理**（`error-handling.test.js`）

   - 无效文件加载场景
   - 参数验证
   - 内存管理边缘情况
   - 优雅的错误恢复

3. **缓冲区操作**（`buffer-operations.test.js`）

   - 文件与缓冲区加载比较
   - 内存管理压力测试
   - 缓冲区大小和内容验证
   - 角落情况处理

4. **缓冲区创建**（`buffer-creation.test.js`）

   - 具有质量选项的 JPEG 缓冲区创建
   - 具有压缩级别的 PNG 缓冲区创建
   - WebP 缓冲区创建（有损和无损）
   - AVIF 缓冲区创建（下一代格式）
   - 具有压缩选项的 TIFF 缓冲区创建
   - PPM 缓冲区创建（原始格式）
   - 缩略图 JPEG 提取
   - 并行格式创建
   - 性能基准测试

5. **缓冲区边缘情况**（`buffer-edge-cases.test.js`）

   - 压力下的内存管理
   - 极端参数验证
   - 多个处理器实例
   - 格式验证和魔术字节
   - 资源清理验证

6. **配置**（`configuration.test.js`）

   - 输出参数设置/获取
   - 参数验证和范围
   - 真实世界配置场景

7. **综合**（`comprehensive.test.js`）
   - 端到端处理管道
   - 所有 API 方法演示
   - 真实文件处理

## 缓冲区创建测试

### 新缓冲区 API 测试

测试套件包括对新缓冲区创建方法的全面测试：

#### **快速缓冲区验证**（`quick-buffer-verification.js`）

```bash
node test/quick-buffer-verification.js
```

- 所有缓冲区创建方法的快速验证
- JPEG、PNG、WebP 和缩略图创建的基本功能检查
- 输出验证和文件生成

#### **综合缓冲区测试**（`buffer-creation.test.js`）

```bash
node test/buffer-creation.test.js
```

- 所有 7 种缓冲区创建方法的详细测试
- 质量、压缩和调整大小参数验证
- 性能基准测试和并行创建
- 格式特定选项测试（渐进式 JPEG、无损 WebP/AVIF、TIFF 压缩）

#### **边缘情况测试**（`buffer-edge-cases.test.js`）

```bash
node test/buffer-edge-cases.test.js
```

- 内存管理压力测试
- 极端参数验证
- 多个处理器实例
- 格式魔术字节验证
- 资源清理验证

#### **集成测试**（`buffer-integration.test.js`）

```bash
npm test  # 包括集成测试
```

- Mocha/Chai 框架集成
- 适当的错误处理验证
- 多格式一致性检查
- 参数边界测试

### 缓冲区测试运行器

**统一测试运行器**（`run-buffer-tests.js`）

```bash
# 运行所有缓冲区测试
node test/run-buffer-tests.js

# 仅快速验证
node test/run-buffer-tests.js --quick-only

# 仅综合测试
node test/run-buffer-tests.js --comprehensive-only

# 仅边缘情况
node test/run-buffer-tests.js --edge-only

# 失败时强制继续
node test/run-buffer-tests.js --force
```

## 快速开始

### 运行所有测试

```bash
npm test
```

### 运行特定测试套件

```bash
# 快速冒烟测试
npm run test:quick

# 所有综合测试
npm run test:all

# 个别测试类别
npm run test:static
npm run test:errors
npm run test:buffers
npm run test:buffer-creation  # 新缓冲区创建方法
npm run test:config

# 传统综合测试
npm run test:comprehensive
```

### 命令行选项

```bash
# 运行特定测试套件
node test/index.js [command]

# 可用命令：
node test/index.js quick     # 快速功能检查
node test/index.js smoke     # 基本冒烟测试
node test/index.js static    # 仅静态方法
node test/index.js errors    # 仅错误处理
node test/index.js buffers   # 仅缓冲区操作
node test/index.js config    # 仅配置
node test/index.js full      # 所有测试（默认）
```

## 测试要求

### 基本要求

- Node.js 14+
- LibRaw 已编译和链接
- 基本测试不需要示例文件

### 增强测试（可选）

- `sample-images/` 目录中的 RAW 示例文件
- 支持的格式：CR2、CR3、NEF、ARW、RAF、RW2、DNG
- 至少 1MB 可用磁盘空间用于输出文件

### 示例文件结构

```
project-root/
├── sample-images/
│   ├── sample.cr2      # 佳能 RAW
│   ├── sample.nef      # 尼康 RAW
│   ├── sample.arw      # 索尼 RAW
│   └── sample.dng      # Adobe DNG
└── test/
    └── output/         # 生成的测试输出
```

## 测试结果

### 预期输出

**快速测试：**

```
⚡ LibRaw 快速测试
==============================
📊 库信息：
   版本: 0.21.4
   相机: 1181
🏗️ 构造函数测试：
   ✅ LibRaw 实例已创建
   ✅ 实例已关闭

🎉 快速测试通过！
```

**综合测试摘要：**

```
📊 测试套件摘要
============================================================
总测试套件: 4
✅ 通过: 4
❌ 失败: 0
成功率: 100.0%
总持续时间: 12.34s
完成时间: 2025-08-23T10:30:00.000Z

🎉 所有测试通过！🎉
LibRaw 包装器工作正常。
```

### 性能基准

现代硬件上的典型性能：

- **静态方法**: <100ms
- **错误处理**: 500-1000ms
- **缓冲区操作**: 1-5s（取决于可用内存）
- **配置**: 200-500ms
- **综合**: 5-15s（使用真实 RAW 文件）

## 测试数据

### 合成测试数据

当真实 RAW 文件不可用时，测试会自动生成合成数据：

- 空缓冲区
- 模式填充缓冲区
- 大内存分配
- 无效文件格式

### 真实 RAW 文件测试

当示例文件可用时，测试执行：

- 实际 RAW 处理
- 元数据提取验证
- 图像处理管道
- 输出文件生成
- 性能测量

## 故障排除

### 常见问题

1. **"No file loaded" 错误**

   - 需要加载文件的方法的预期行为
   - 测试验证适当的错误处理

2. **缺少示例文件**

   - 测试优雅地处理缺少的示例文件
   - 使用合成数据作为后备

3. **内存分配错误**

   - 大缓冲区测试可能在低内存系统上失败
   - 测试包括内存压力场景

4. **LibRaw 编译问题**
   - 确保 LibRaw 库已正确编译
   - 检查 `npm run build` 成功完成

### 调试模式

为测试添加调试输出：

```javascript
// 设置环境变量以获取详细输出
process.env.DEBUG = "1";
```

### 性能问题

如果测试运行缓慢：

```bash
# 运行较轻的测试套件
npm run test:quick

# 跳过内存密集型测试
npm run test:static
npm run test:config
```

## 贡献测试

### 添加新测试

1. 在 `test/` 目录中创建测试文件
2. 遵循命名约定：`feature-name.test.js`
3. 导出测试函数以供测试运行器使用
4. 将测试添加到 `test/index.js` 主运行器

### 测试结构模板

```javascript
async function testFeatureName() {
  console.log("🔧 功能名称测试");
  console.log("=".repeat(40));

  try {
    // 测试实现
    console.log("   ✅ 测试通过");
  } catch (error) {
    console.log(`   ❌ 测试失败: ${error.message}`);
  }
}

module.exports = { testFeatureName };
```

### 测试指南

1. **错误处理**：始终测试成功和失败情况
2. **资源清理**：使用 `finally` 块确保适当的清理
3. **清晰输出**：使用表情符号和格式以获得可读的结果
4. **性能**：为性能敏感的测试包含计时
5. **验证**：验证结果，而不仅仅是检查没有错误

## 持续集成

### GitHub Actions 集成

```yaml
- name: 运行 LibRaw 测试
  run: |
    npm install
    npm run test:smoke
    npm run test:all
```

### 测试覆盖

测试套件涵盖：

- ✅ 所有公共 API 方法（30+ 函数）
- ✅ 错误条件和边缘情况
- ✅ 内存管理和清理
- ✅ 参数验证
- ✅ 跨平台兼容性
- ✅ 性能特征

## 许可证

测试在主要项目的相同 MIT 许可证下提供。
