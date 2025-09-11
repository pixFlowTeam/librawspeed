# LibRaw 升级指南

## 从当前版本升级到 X.X.X

### 自动升级（推荐）

运行升级脚本:
```bash
npm run upgrade:libraw
```

### 手动升级步骤

#### 1. 下载 LibRaw X.X.X

访问: https://www.libraw.org/download

下载此文件:
- `LibRaw-X.X.X.tar.gz` (所有平台的源代码)

#### 2. 备份当前安装

```bash
# 备份当前 deps 文件夹
cp -r deps deps-backup-$(date +%Y%m%d)
```

#### 3. 替换库文件

**所有平台:**
```bash
# 从源代码提取和编译
tar -xzf LibRaw-X.X.X.tar.gz
cd LibRaw-X.X.X

# 为项目配置
./configure --prefix=../deps/LibRaw-Source/LibRaw-X.X.X --enable-shared --disable-static

# 编译
make -j$(nproc)

# 安装
make install

# 构建原生插件
cd ..
npm run build
```

#### 4. 更新构建配置

检查 `binding.gyp` 中的版本特定更改:

```json
{
  "target_name": "libraw_addon",
  "sources": ["src/addon.cpp", "src/libraw_wrapper.cpp"],
  "include_dirs": [
    "<!(node -e \"console.log(require('node-addon-api').include)\")",
    "deps/LibRaw-Source/LibRaw-X.X.X/libraw"
  ],
  "conditions": [
    ["OS=='win'", {
      "libraries": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-X.X.X/lib/libraw.lib"],
      "copies": [{
        "destination": "<(module_root_dir)/build/Release/",
        "files": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-X.X.X/bin/libraw.dll"]
      }]
    }],
    ["OS=='mac'", {
      "libraries": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-X.X.X/lib/libraw.dylib"]
    }],
    ["OS=='linux'", {
      "libraries": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-X.X.X/lib/libraw.so"]
    }]
  ]
}
```

#### 5. 重新构建原生插件

```bash
npm run clean
npm run build
```

#### 6. 测试兼容性

```bash
# 运行综合测试
npm test

# 使用您的示例图像进行测试
npm run test:formats

# 性能回归检查
npm run test:performance
```

#### 7. 更新文档

```bash
# 更新支持的格式列表
npm run docs:generate

# 更新 package.json 中的版本信息
# 在 CHANGELOG.md 中更新新功能
```

### 潜在的破坏性更改

#### API 更改
检查 LibRaw 更新日志中的 API 修改:
- 可能有新的元数据字段
- 一些已弃用的函数可能被移除
- 添加了新相机支持

#### 性能更改
- 处理速度可能提高或改变
- 内存使用模式可能不同
- 有新的优化标志可用

#### 兼容性更改
- 支持新的相机型号
- 一些较旧的格式可能被弃用
- 颜色配置文件处理改进

### 版本特定说明

#### LibRaw X.X.X
查看官方 LibRaw 更新日志:
https://github.com/LibRaw/LibRaw/releases/tag/X.X.X

新版本的常见改进:
- 支持最新的相机型号
- 性能优化
- 元数据提取中的错误修复
- 增强的颜色配置文件处理
- 安全更新

### 故障排除

#### 构建错误
```bash
# 清除所有构建工件
npm run clean
rm -rf node_modules
npm install
npm run build
```

#### 运行时错误
```bash
# 检查库加载
node -e "console.log(require('./lib/index.js'))"

# 验证 DLL/SO 依赖项
# Windows: 使用 Dependency Walker
# Linux: ldd build/Release/libraw_wrapper.node
# macOS: otool -L build/Release/libraw_wrapper.node
```

#### 测试失败
```bash
# 测试单个格式
node test/test.js sample-images/test.nef

# 检查新的元数据字段
node -e "
const LibRaw = require('./lib');
const proc = new LibRaw();
proc.loadFile('sample.nef').then(() => {
  return proc.getMetadata();
}).then(meta => {
  console.log(JSON.stringify(meta, null, 2));
}).catch(console.error);
"
```

### 回滚程序

如果升级失败:

```bash
# 恢复备份
rm -rf deps
mv deps-backup-YYYYMMDD deps

# 使用旧版本重新构建
npm run clean
npm run build
npm test
```

### 升级后检查清单

- [ ] 所有测试通过
- [ ] 性能可接受
- [ ] 示例图像处理正确
- [ ] 新相机格式工作（如果有）
- [ ] 文档已更新
- [ ] CHANGELOG.md 反映更改
- [ ] 包版本适当提升

### 发布更新的包

```bash
# 更新版本
npm version patch  # 或根据更改使用 minor/major

# 发布前测试
npm run prepublishOnly

# 发布到 npm
npm publish
```
