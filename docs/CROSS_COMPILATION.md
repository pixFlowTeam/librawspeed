# LibRaw 交叉编译文档

## 📋 支持的平台

我们支持以下 5 个平台的交叉编译：

| 平台 | 架构 | 目标系统 | 状态 |
|------|------|----------|------|
| Windows | x64 | win32 | ✅ 支持 |
| macOS | x64 | darwin | ✅ 支持 |
| macOS | ARM64 | darwin | ✅ 支持 |
| Linux | x64 | linux | ✅ 支持 |
| Linux | ARM64 | linux | ✅ 支持 |

## 🛠️ 必需的工具链

### 1. Windows x64 交叉编译

**工具链：** `mingw-w64`

**安装方法：**
```bash
# macOS (使用 Homebrew)
brew install mingw-w64

# 验证安装
x86_64-w64-mingw32-gcc --version
x86_64-w64-mingw32-g++ --version
x86_64-w64-mingw32-ar --version
x86_64-w64-mingw32-ranlib --version
x86_64-w64-mingw32-strip --version
```

**工具列表：**
- `x86_64-w64-mingw32-gcc` - C 编译器
- `x86_64-w64-mingw32-g++` - C++ 编译器
- `x86_64-w64-mingw32-ar` - 静态库归档工具
- `x86_64-w64-mingw32-ranlib` - 静态库索引工具
- `x86_64-w64-mingw32-strip` - 符号剥离工具

### 2. macOS x64 交叉编译

**工具链：** 系统自带 `clang` + `ar`/`ranlib`/`strip`

**安装方法：**
```bash
# 系统自带，无需额外安装
# 验证安装
clang --version
clang++ --version
ar --version
ranlib --version
strip --version
```

**工具列表：**
- `clang` - C 编译器
- `clang++` - C++ 编译器
- `ar` - 静态库归档工具
- `ranlib` - 静态库索引工具
- `strip` - 符号剥离工具

### 3. macOS ARM64 交叉编译

**工具链：** `aarch64-apple-darwin24-gcc-15`

**安装方法：**
```bash
# macOS (使用 Homebrew)
brew install aarch64-apple-darwin24-gcc-15

# 验证安装
aarch64-apple-darwin24-gcc-15 --version
aarch64-apple-darwin24-g++-15 --version
```

**工具列表：**
- `aarch64-apple-darwin24-gcc-15` - C 编译器
- `aarch64-apple-darwin24-g++-15` - C++ 编译器
- `ar` - 静态库归档工具（系统自带）
- `ranlib` - 静态库索引工具（系统自带）
- `strip` - 符号剥离工具（系统自带）

### 4. Linux x64 交叉编译

**工具链：** `musl-cross` (x86_64-linux-musl)

**安装方法：**
```bash
# macOS (使用 Homebrew)
brew install musl-cross

# 验证安装
x86_64-linux-musl-gcc --version
x86_64-linux-musl-g++ --version
x86_64-linux-musl-ar --version
x86_64-linux-musl-ranlib --version
x86_64-linux-musl-strip --version
```

**工具列表：**
- `x86_64-linux-musl-gcc` - C 编译器
- `x86_64-linux-musl-g++` - C++ 编译器
- `x86_64-linux-musl-ar` - 静态库归档工具
- `x86_64-linux-musl-ranlib` - 静态库索引工具
- `x86_64-linux-musl-strip` - 符号剥离工具

### 5. Linux ARM64 交叉编译

**工具链：** `musl-cross` (aarch64-linux-musl)

**安装方法：**
```bash
# macOS (使用 Homebrew)
brew install musl-cross

# 验证安装
aarch64-linux-musl-gcc --version
aarch64-linux-musl-g++ --version
aarch64-linux-musl-ar --version
aarch64-linux-musl-ranlib --version
aarch64-linux-musl-strip --version
```

**工具列表：**
- `aarch64-linux-musl-gcc` - C 编译器
- `aarch64-linux-musl-g++` - C++ 编译器
- `aarch64-linux-musl-ar` - 静态库归档工具
- `aarch64-linux-musl-ranlib` - 静态库索引工具
- `aarch64-linux-musl-strip` - 符号剥离工具

## 🚀 快速开始

### 安装所有工具链

```bash
# 安装所有必需的工具链
brew install mingw-w64 aarch64-apple-darwin24-gcc-15 musl-cross

# 验证所有工具链
npm run cross-compile
```

### 构建所有平台

```bash
# 一次性构建所有平台
npm run cross-compile:all

# 构建特定平台
npm run cross-compile:win32
npm run cross-compile:darwin-x64
npm run cross-compile:darwin-arm64
npm run cross-compile:linux-x64
npm run cross-compile:linux-arm64
```

## 📁 构建输出

构建完成后，所有平台的库文件将统一输出到 `build` 目录中：

```
deps/LibRaw-Source/LibRaw-0.21.4/build/
├── win32/                # Windows x64
├── darwin-x64/           # macOS Intel
├── darwin-arm64/         # macOS Apple Silicon
├── linux-x64/            # Linux x64
└── linux-arm64/          # Linux ARM64
```

每个平台目录包含：
- `lib/libraw.a` - 静态库文件
- `lib/libraw_r.a` - 静态库文件（线程安全版本）
- `include/libraw/` - 头文件目录
- `lib/pkgconfig/` - pkg-config 配置文件
- `share/doc/libraw/` - 文档文件

## 🔧 故障排除

### 工具链未找到

如果遇到工具链未找到的错误，请检查：

1. **Homebrew 是否已安装**
   ```bash
   brew --version
   ```

2. **工具链是否正确安装**
   ```bash
   # 检查 mingw-w64
   which x86_64-w64-mingw32-gcc
   
   # 检查 musl-cross
   which x86_64-linux-musl-gcc
   which aarch64-linux-musl-gcc
   
   # 检查 macOS ARM64 工具链
   which aarch64-apple-darwin24-gcc-15
   ```

3. **PATH 环境变量**
   ```bash
   echo $PATH
   # 确保 Homebrew 的 bin 目录在 PATH 中
   ```

### 构建失败

如果构建失败，请检查：

1. **LibRaw 源码是否完整**
   ```bash
   ls -la deps/LibRaw-Source/LibRaw-0.21.4/
   ```

2. **构建目录权限**
   ```bash
   ls -la deps/LibRaw-Source/LibRaw-0.21.4/build-*
   ```

3. **查看详细错误信息**
   ```bash
   npm run cross-compile:win32 2>&1 | tee build.log
   ```

## 📚 相关文档

- [API 文档](API.md)
- [示例代码](EXAMPLES.md)
- [支持的格式](FORMATS.md)
- [测试指南](TESTING.md)

## 🤝 贡献

如果你发现工具链安装或构建过程中的问题，请：

1. 检查本文档是否是最新版本
2. 在 GitHub 上创建 Issue
3. 提供详细的错误信息和系统环境

---

**最后更新：** 2024年12月
**维护者：** librawspeed 团队
