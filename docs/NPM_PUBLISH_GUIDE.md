# NPM 发布指南

## 📦 概述

本指南详细说明如何将 librawspeed 项目发布到 npm 注册表。

## 🚀 快速发布

### 使用 bumpp 自动发布（推荐）

```bash
# 发布补丁版本 (1.0.2 -> 1.0.1)
npm run release:patch

# 发布次要版本 (1.0.2 -> 1.1.0)
npm run release:minor

# 发布主要版本 (1.0.2 -> 2.0.0)
npm run release:major

# 发布预发布版本
npm run release:prerelease

# 预览发布流程（不实际发布）
npm run release:dry
```

### bumpp 集成流程详解

bumpp 已完全集成交叉编译流程，一键完成所有步骤：

**执行流程：**

1. **beforeBump**：
   - `npm run test` - 运行所有测试
   - `npm run build` - 构建当前平台
   - `npm run cross-compile:all` - 交叉编译所有平台
   - `npm run cross-compile:verify` - 验证编译产物

2. **afterBump**：
   - `npm run docs:generate` - 生成文档

3. **beforeRelease**：
   - `npm run publish:check` - 发布前检查

4. **发布**：
   - `npm publish --access public` - 发布到 npm

5. **afterRelease**：
   - 显示成功消息

**优势：**
- ✅ 自动化完整流程
- ✅ 包含交叉编译
- ✅ 自动验证产物
- ✅ 自动版本管理
- ✅ 自动 Git 操作

### 手动发布

```bash
# 1. 运行测试
npm test

# 2. 构建项目
npm run build

# 3. 交叉编译（可选，用于多平台支持）
npm run cross-compile:all

# 4. 预览发布内容
npm run publish:dry

# 5. 发布到 npm
npm run publish:public
```

## 🔧 发布配置

### package.json 配置

项目已配置以下发布相关字段：

```json
{
  "name": "librawspeed",
  "version": "1.0.1",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "files": [
    "lib/**/*",
    "src/**/*",
    "deps/**/*",
    "types/**/*",
    "docs/**/*",
    "examples/**/*",
    "scripts/**/*",
    "binding.gyp",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "IMPLEMENTATION_SUMMARY.md",
    "UPGRADE.md",
    "PUBLICATION.md"
  ],
  "engines": {
    "node": ">=14.0.0"
  },
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

### bumpp 配置 (.bumpprc)

```json
{
  "files": [
    "package.json",
    "lib/index.d.ts"
  ],
  "scripts": {
    "beforeBump": "npm run test && npm run build",
    "afterBump": "npm run docs:generate",
    "beforeRelease": "npm run publish:check",
    "afterRelease": "echo 'Release completed successfully! Package published to npm.'"
  },
  "commit": {
    "message": "chore: release v{{version}}",
    "tag": "v{{version}}"
  },
  "push": true,
  "publish": "npm publish --access public"
}
```

## 📋 发布脚本

### 版本管理脚本

- `npm run release` - 交互式版本选择
- `npm run release:patch` - 补丁版本更新
- `npm run release:minor` - 次要版本更新
- `npm run release:major` - 主要版本更新
- `npm run release:prerelease` - 预发布版本
- `npm run release:dry` - 预览发布流程

### 发布脚本

- `npm run publish:check` - 发布前检查（测试 + 文档生成）
- `npm run publish:dry` - 预览发布内容
- `npm run publish:npm` - 发布到 npm
- `npm run publish:public` - 发布为公开包
- `npm run publish:beta` - 发布为 beta 版本
- `npm run publish:alpha` - 发布为 alpha 版本

## 🔄 交叉编译流程

### 交叉编译脚本

项目支持多平台交叉编译，确保包可以在不同操作系统和架构上运行：

```bash
# 编译所有平台
npm run cross-compile:all

# 编译特定平台
npm run cross-compile:win32          # Windows x64
npm run cross-compile:darwin-x64     # macOS x64
npm run cross-compile:darwin-arm64   # macOS ARM64
npm run cross-compile:linux-x64      # Linux x64
npm run cross-compile:linux-arm64    # Linux ARM64

# 验证交叉编译产物
npm run cross-compile:verify          # 详细验证
npm run cross-compile:summary         # 简要摘要
```

### 交叉编译配置

项目使用自定义的交叉编译脚本 `scripts/cross-compile.js`，支持以下目标平台：

| 平台 | 架构 | 工具链 | 说明 |
|------|------|--------|------|
| Windows | x64 | MinGW-w64 | 使用 x86_64-w64-mingw32 工具链 |
| macOS | x64 | Clang | 使用原生 clang 编译器 |
| macOS | ARM64 | Clang | 使用原生 clang 编译器 |
| Linux | x64 | GCC | 使用原生 gcc 编译器 |
| Linux | ARM64 | GCC | 使用原生 gcc 编译器 |

### 交叉编译环境要求

#### Windows 编译环境
```bash
# 安装 MinGW-w64 工具链
# Ubuntu/Debian
sudo apt-get install gcc-mingw-w64-x86-64 g++-mingw-w64-x86-64

# macOS (使用 Homebrew)
brew install mingw-w64

# 验证安装
x86_64-w64-mingw32-gcc --version
```

#### macOS 编译环境
```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 验证安装
clang --version
```

#### Linux 编译环境
```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"

# 验证安装
gcc --version
```

### 交叉编译流程详解

1. **环境检测**：自动检测当前平台和架构
2. **工具链配置**：根据目标平台配置相应的编译器
3. **LibRaw 编译**：使用交叉编译工具链编译 LibRaw 库
4. **Node.js 模块编译**：编译 Node.js 原生模块
5. **产物打包**：将编译产物打包到相应目录

### 交叉编译输出

编译完成后，会在以下目录生成对应平台的二进制文件：

```
build/
├── Release/
│   ├── raw_addon.node          # 当前平台
│   └── obj.target/
└── [platform]-[arch]/
    ├── Release/
    │   └── raw_addon.node      # 交叉编译产物
    └── obj.target/
```

## 🔍 发布前检查清单

### 1. 代码质量检查

```bash
# 运行所有测试
npm test

# 运行特定测试套件
npm run test:all
npm run test:quick
npm run test:comprehensive
```

### 2. 构建验证

```bash
# 清理并重新构建
npm run rebuild

# 验证构建产物
ls -la lib/
ls -la build/Release/
```

### 3. 文档更新

```bash
# 生成最新文档
npm run docs:generate

# 检查文档内容
cat docs/API.md
```

### 4. 版本检查

```bash
# 检查当前版本
npm run version:check

# 检查包内容
npm pack
```

## 🌐 发布流程详解

### 1. 版本号管理

遵循 [语义化版本控制](https://semver.org/lang/zh-CN/)：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 2. Git 标签管理

bumpp 会自动创建 git 标签：

```bash
# 查看标签
git tag -l

# 推送标签到远程
git push origin --tags
```

### 3. 发布验证

发布后验证：

```bash
# 检查包是否在 npm 上可见
npm view librawspeed

# 检查特定版本
npm view librawspeed@1.0.1

# 安装测试
npm install librawspeed@latest
```

## 🚨 常见问题

### 1. 发布失败

**问题**：`npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/librawspeed`

**解决**：
```bash
# 检查登录状态
npm whoami

# 重新登录
npm login

# 检查包名是否可用
npm view librawspeed
```

### 2. 版本冲突

**问题**：`npm ERR! 403 Forbidden - PUT https://registry.npmjs.org/librawspeed - Version 1.0.1 already exists`

**解决**：
```bash
# 更新版本号
npm run release:patch

# 或手动更新
npm version patch
```

### 3. 构建失败

**问题**：Native addon 构建失败

**解决**：
```bash
# 清理构建缓存
npm run clean

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run rebuild
```

### 4. 交叉编译失败

**问题**：交叉编译工具链未找到

**解决**：
```bash
# 检查工具链安装
which x86_64-w64-mingw32-gcc  # Windows
which clang                    # macOS
which gcc                      # Linux

# 安装缺失的工具链
# Windows (MinGW-w64)
sudo apt-get install gcc-mingw-w64-x86-64 g++-mingw-w64-x86-64

# macOS (Xcode Command Line Tools)
xcode-select --install

# Linux (Build Essentials)
sudo apt-get install build-essential
```

**问题**：交叉编译产物不兼容

**解决**：
```bash
# 清理所有构建产物
npm run clean
rm -rf build/

# 重新交叉编译
npm run cross-compile:all

# 验证产物
file build/*/Release/raw_addon.node
```

## 📊 发布统计

### 包大小信息

- **压缩包大小**：24.5 MB
- **解压后大小**：75.8 MB
- **文件数量**：587 个文件

### 包含的源码和文档

- **源码文件**：`src/**/*` - C++ 源码和头文件
- **文档目录**：`docs/**/*` - 完整的 API 文档和使用指南
- **示例代码**：`examples/**/*` - 各种使用示例
- **构建脚本**：`scripts/**/*` - 构建和工具脚本
- **类型定义**：`types/**/*` - TypeScript 类型定义
- **依赖库**：`deps/**/*` - LibRaw 源码和构建产物

### 支持平台

- ✅ macOS (x64, arm64) - 原生编译 + 交叉编译
- ✅ Windows (x64) - 交叉编译
- ✅ Linux (x64, arm64) - 交叉编译

### 交叉编译支持

- **Windows x64**：使用 MinGW-w64 工具链
- **macOS x64**：使用 Clang 编译器
- **macOS ARM64**：使用 Clang 编译器
- **Linux x64**：使用 GCC 编译器
- **Linux ARM64**：使用 GCC 编译器

### Node.js 版本支持

- ✅ Node.js >= 14.0.0
- ✅ N-API 版本：3, 4, 5, 6, 7, 8, 9

## 🏆 交叉编译最佳实践

### 完整交叉编译流程

```bash
# 1. 环境准备
npm run version:check
node scripts/cross-compile.js --check-tools

# 2. 清理和构建
npm run clean
npm run build

# 3. 交叉编译所有平台
npm run cross-compile:all

# 4. 验证编译产物
npm run cross-compile:verify

# 5. 查看摘要
npm run cross-compile:summary

# 6. 发布
npm run release:patch
```

### 快速交叉编译流程

```bash
# 一键完成所有步骤
npm run release:patch
```

### 1. 环境准备

在开始交叉编译之前，确保所有必要的工具链都已安装：

```bash
# 检查当前环境
npm run version:check

# 检查交叉编译工具链
node scripts/cross-compile.js --check-tools
```

### 2. 分步编译

建议分步进行交叉编译，便于定位问题：

```bash
# 1. 先编译当前平台
npm run build

# 2. 逐个编译目标平台
npm run cross-compile:win32
npm run cross-compile:darwin-x64
npm run cross-compile:darwin-arm64
npm run cross-compile:linux-x64
npm run cross-compile:linux-arm64

# 3. 验证编译产物
npm run cross-compile:verify
```

### 3. 验证编译产物

编译完成后，验证产物是否正确：

```bash
# 使用内置验证脚本（推荐）
npm run cross-compile:verify

# 查看简要摘要
npm run cross-compile:summary

# 手动检查文件类型
file build/*/Release/raw_addon.node

# 检查依赖库
ldd build/*/Release/raw_addon.node  # Linux
otool -L build/*/Release/raw_addon.node  # macOS
```

### 4. 测试交叉编译产物

在目标平台上测试编译产物：

```bash
# 在目标平台上安装包
npm install librawspeed

# 运行测试
npm test
```

### 5. CI/CD 集成

在 CI/CD 流水线中集成交叉编译：

```yaml
# GitHub Actions 示例
- name: Cross Compile
  run: |
    npm run cross-compile:all
    npm run test
    
- name: Publish
  run: |
    npm run publish:public
```

## 🔗 相关链接

- [npm 包页面](https://www.npmjs.com/package/librawspeed)
- [GitHub 仓库](https://github.com/pixFlowTeam/librawspeed)
- [API 文档](docs/API.md)
- [变更日志](CHANGELOG.md)

## 📝 发布记录

| 版本 | 发布日期 | 变更说明 |
|------|----------|----------|
| 1.0.1 | 2025-09-11 | 初始发布，支持 LibRaw 0.21.4 |

---

**注意**：发布前请确保所有测试通过，文档完整，版本号正确。
