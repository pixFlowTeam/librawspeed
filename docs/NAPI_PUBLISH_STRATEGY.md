# N-API 发布策略

## 📦 发布原理

### 1. 不发布交叉编译产物

**原因：**
- 交叉编译产物（`.a` 文件）是中间产物
- 最终用户安装时会自动构建 `.node` 文件
- 不同平台的 `.node` 文件不兼容

### 2. 发布源码和构建配置

**需要发布：**
- ✅ C++ 源码 (`src/`)
- ✅ LibRaw 源码 (`deps/`)
- ✅ 构建配置 (`binding.gyp`)
- ✅ 构建脚本 (`scripts/`)
- ✅ 类型定义 (`types/`)

**不需要发布：**
- ❌ 交叉编译产物 (`deps/LibRaw-Source/LibRaw-0.21.4/build/`)
- ❌ 构建缓存 (`build/`)
- ❌ 临时文件

## 🔧 正确的 package.json 配置

### files 字段

```json
{
  "files": [
    "lib/**/*",           // JavaScript 代码
    "src/**/*",           // C++ 源码
    "deps/LibRaw-Source/LibRaw-0.21.4/src/**/*",  // LibRaw 源码
    "deps/LibRaw-Source/LibRaw-0.21.4/include/**/*",  // LibRaw 头文件
    "deps/LibRaw-Source/LibRaw-0.21.4/configure",  // 构建脚本
    "deps/LibRaw-Source/LibRaw-0.21.4/Makefile.in",  // 构建配置
    "types/**/*",         // TypeScript 类型
    "docs/**/*",          // 文档
    "examples/**/*",      // 示例
    "scripts/**/*",       // 构建脚本
    "binding.gyp",        // node-gyp 配置
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    ".bumpprc"
  ]
}
```

### 构建配置

```json
{
  "gypfile": true,
  "binary": {
    "napi_versions": [3, 4, 5, 6, 7, 8, 9]
  },
  "napi": {
    "name": "libraw_addon",
    "triples": {
      "defaults": true,
      "additional": [
        "x64-apple-darwin",
        "arm64-apple-darwin", 
        "x64-pc-windows-msvc",
        "x64-unknown-linux-gnu",
        "arm64-unknown-linux-gnu"
      ]
    }
  }
}
```

## 🚀 用户安装流程

### 1. 用户执行 `npm install librawspeed`

```bash
npm install librawspeed
```

### 2. 自动构建过程

1. **下载源码**：npm 下载包含源码的包
2. **安装依赖**：安装 `node-gyp` 等构建工具
3. **构建 LibRaw**：运行 `scripts/build-libraw.js`
4. **构建 N-API 模块**：运行 `node-gyp rebuild`
5. **生成 `.node` 文件**：在 `build/Release/` 目录

### 3. 最终产物

```
node_modules/librawspeed/
├── lib/                    # JavaScript 代码
├── build/Release/          # 构建产物
│   └── raw_addon.node     # 原生模块
└── package.json
```

## 🔄 交叉编译的作用

### 开发阶段

交叉编译用于：
- ✅ 测试多平台兼容性
- ✅ 验证构建脚本
- ✅ 确保源码正确性

### 发布阶段

交叉编译产物：
- ❌ 不发布到 npm
- ❌ 不包含在包中
- ✅ 用于验证构建流程

## 📊 包大小优化

### 当前配置

```json
{
  "files": [
    "lib/**/*",           // ~50KB
    "src/**/*",           // ~20KB  
    "deps/LibRaw-Source/LibRaw-0.21.4/src/**/*",  // ~2MB
    "deps/LibRaw-Source/LibRaw-0.21.4/include/**/*",  // ~100KB
    "deps/LibRaw-Source/LibRaw-0.21.4/configure",  // ~50KB
    "deps/LibRaw-Source/LibRaw-0.21.4/Makefile.in",  // ~10KB
    "types/**/*",         // ~10KB
    "docs/**/*",          // ~500KB
    "examples/**/*",      // ~100KB
    "scripts/**/*",       // ~50KB
    "binding.gyp",        // ~1KB
    "README.md",          // ~50KB
    "LICENSE",            // ~1KB
    "CHANGELOG.md",       // ~10KB
    ".bumpprc"            // ~1KB
  ]
}
```

**总大小：约 3MB**（不包含交叉编译产物）

### 如果包含交叉编译产物

```json
{
  "files": [
    "deps/**/*"  // 包含所有 deps 目录
  ]
}
```

**总大小：约 50MB**（包含所有交叉编译产物）

## 🎯 最佳实践

### 1. 发布策略

- ✅ 只发布源码和构建配置
- ✅ 让用户端自动构建
- ✅ 利用 npm 的自动构建机制

### 2. 构建优化

- ✅ 提供清晰的构建脚本
- ✅ 处理构建错误
- ✅ 支持多平台构建

### 3. 用户体验

- ✅ 提供详细的安装说明
- ✅ 处理构建失败的情况
- ✅ 提供预构建版本（可选）

## 🔗 相关链接

- [Node.js N-API 文档](https://nodejs.org/api/n-api.html)
- [node-gyp 文档](https://github.com/nodejs/node-gyp)
- [npm 包发布指南](https://docs.npmjs.com/cli/v8/commands/npm-publish)
