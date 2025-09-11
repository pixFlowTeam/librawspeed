# 简化的构建要求

## 🎯 核心要求

N-API 模块构建只需要：

1. **Node.js** >= 14.0.0
2. **Python** 2.7 或 3.x
3. **C++ 编译器**

## 🔧 平台特定安装

### Windows
```bash
# 安装 Visual Studio Build Tools
npm install --global windows-build-tools

# 或安装 Visual Studio Community
# 从 Microsoft 官网下载
```

### macOS
```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 或从 App Store 安装 Xcode
```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"

# Fedora
sudo dnf groupinstall "Development Tools"
```

## ❌ 不需要的工具

- **make**：node-gyp 有自己的构建系统
- **cmake**：node-gyp 使用 gyp 构建系统
- **autotools**：node-gyp 自动处理
- **其他构建工具**：node-gyp 会自动处理

## 🔍 环境检查

```bash
npm run check:env
```

## 🚀 安装

```bash
npm install librawspeed
```

## ⚠️ 故障排除

如果安装失败：

```bash
# 清理并重新安装
npm run clean
npm run rebuild

# 或强制重新构建
npm install --force
```

## 💡 为什么不需要 make？

1. **node-gyp 使用 gyp**：不是传统的 make 构建系统
2. **自动处理依赖**：node-gyp 会自动下载和配置构建工具
3. **跨平台兼容**：gyp 在不同平台上使用不同的构建工具
4. **简化安装**：用户只需要安装编译器，不需要复杂的构建工具链

## 📊 构建流程

```bash
npm install librawspeed
# ↓
# 1. 下载源码包
# 2. node-gyp 自动配置构建环境
# 3. 编译 C++ 代码
# 4. 生成 .node 文件
```

## 🎉 总结

N-API 模块构建比传统 C++ 项目简单得多：
- 只需要编译器，不需要构建工具
- node-gyp 自动处理所有构建细节
- 跨平台兼容性好
- 安装过程自动化
