# N-API 构建策略详解

## 🔧 编译工具依赖问题

### 问题描述

N-API 模块需要编译工具，但用户环境可能没有：
- Windows：需要 Visual Studio Build Tools
- macOS：需要 Xcode Command Line Tools
- Linux：需要 build-essential

### 解决方案

## 1. 预构建二进制 (推荐)

### 使用 @mapbox/node-pre-gyp

```json
{
  "name": "librawspeed",
  "binary": {
    "module_name": "libraw_addon",
    "module_path": "./lib/binding/{configuration}/{node_abi}-{platform}-{arch}/",
    "remote_path": "./{name}/v{version}/",
    "package_name": "{module_name}-v{version}-{node_abi}-{platform}-{arch}.tar.gz",
    "host": "https://your-cdn.com",
    "napi_versions": [3, 4, 5, 6, 7, 8, 9]
  }
}
```

### 构建流程

```bash
# 1. 构建所有平台
npm run build:all

# 2. 上传到 CDN
npm run upload:binaries

# 3. 发布包
npm publish
```

### 用户安装流程

```bash
npm install librawspeed
# 自动下载预构建二进制，无需编译
```

## 2. 源码构建 (当前方案)

### 优势
- ✅ 包大小小
- ✅ 源码透明
- ✅ 自动适配平台

### 劣势
- ❌ 需要编译工具
- ❌ 安装时间长
- ❌ 可能构建失败

### 当前配置

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

## 3. 混合策略 (最佳实践)

### 提供预构建 + 源码回退

```json
{
  "scripts": {
    "install": "node scripts/install.js",
    "prebuild": "prebuild-install || node-gyp rebuild",
    "build": "node-gyp rebuild"
  },
  "binary": {
    "module_name": "libraw_addon",
    "module_path": "./lib/binding/{configuration}/{node_abi}-{platform}-{arch}/",
    "remote_path": "./{name}/v{version}/",
    "package_name": "{module_name}-v{version}-{node_abi}-{platform}-{arch}.tar.gz",
    "host": "https://github.com/pixFlowTeam/librawspeed/releases/download/",
    "napi_versions": [3, 4, 5, 6, 7, 8, 9]
  }
}
```

### 安装脚本

```javascript
// scripts/install.js
const { execSync } = require('child_process');

try {
  // 尝试下载预构建二进制
  execSync('prebuild-install', { stdio: 'inherit' });
  console.log('✅ 使用预构建二进制');
} catch (error) {
  console.log('⚠️ 预构建二进制不可用，使用源码构建');
  execSync('node-gyp rebuild', { stdio: 'inherit' });
}
```

## 4. 用户环境要求

### Windows

```bash
# 安装 Visual Studio Build Tools
npm install --global windows-build-tools

# 或安装 Visual Studio Community
# 包含 C++ 构建工具
```

### macOS

```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 或安装 Xcode
# 从 App Store 下载
```

### Linux

```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"

# 或
sudo dnf groupinstall "Development Tools"
```

## 5. 错误处理

### 常见错误

1. **Python 未找到**
   ```bash
   npm config set python python3
   ```

2. **编译器未找到**
   ```bash
   # Windows
   npm config set msvs_version 2019
   
   # macOS
   xcode-select --install
   ```

3. **权限问题**
   ```bash
   sudo npm install -g node-gyp
   ```

### 用户指导

在 README 中添加安装说明：

```markdown
## 安装要求

### 系统要求
- Node.js >= 14.0.0
- Python 2.7 或 3.x
- C++ 编译器

### 平台特定要求

#### Windows
```bash
npm install --global windows-build-tools
```

#### macOS
```bash
xcode-select --install
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
```

### 安装
```bash
npm install librawspeed
```
```

## 6. 当前项目建议

### 短期方案
保持当前源码构建方案，但：
1. 完善错误处理
2. 提供详细的安装说明
3. 添加环境检查脚本

### 长期方案
考虑实现混合策略：
1. 提供预构建二进制
2. 源码构建作为回退
3. 使用 GitHub Releases 存储二进制

## 7. 实现预构建二进制

### 使用 GitHub Actions

```yaml
name: Build Binaries

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        node: [14, 16, 18, 20]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload binaries
        uses: actions/upload-artifact@v3
        with:
          name: binaries-${{ matrix.os }}-node${{ matrix.node }}
          path: build/Release/*.node
```

### 发布脚本

```javascript
// scripts/release-binaries.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 构建所有平台
const platforms = [
  'win32-x64',
  'darwin-x64',
  'darwin-arm64',
  'linux-x64',
  'linux-arm64'
];

platforms.forEach(platform => {
  console.log(`Building ${platform}...`);
  execSync(`npm run cross-compile:${platform}`, { stdio: 'inherit' });
});

// 打包二进制
const binaries = [];
fs.readdirSync('build').forEach(dir => {
  if (dir.includes('-')) {
    const nodeFile = path.join('build', dir, 'Release', 'raw_addon.node');
    if (fs.existsSync(nodeFile)) {
      binaries.push({
        platform: dir,
        file: nodeFile
      });
    }
  }
});

console.log('Built binaries:', binaries);
```

## 总结

N-API 模块确实需要编译工具，但有多种解决方案：

1. **源码构建**：当前方案，需要用户有编译环境
2. **预构建二进制**：提供预编译版本，用户无需编译
3. **混合策略**：优先使用预构建，回退到源码构建

当前项目使用源码构建方案是合理的，但需要：
- 完善错误处理
- 提供详细的安装说明
- 考虑未来实现预构建二进制
