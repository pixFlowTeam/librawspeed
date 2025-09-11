# Bumpp 集成说明

## 📦 概述

本项目已完全集成了 `bumpp` 工具，实现了一键式发布流程，包含完整的交叉编译和验证步骤。

## 🔧 配置文件

### .bumpprc

```json
{
  "files": [
    "package.json",
    "lib/index.d.ts"
  ],
  "scripts": {
    "beforeBump": "npm run test && npm run build && npm run cross-compile:all && npm run cross-compile:verify",
    "afterBump": "npm run docs:generate",
    "beforeRelease": "npm run publish:check",
    "afterRelease": "echo 'Release completed successfully! Package published to npm with cross-compiled binaries.'"
  },
  "commit": {
    "message": "chore: release v{{version}}",
    "tag": "v{{version}}"
  },
  "push": true,
  "publish": "npm publish --access public"
}
```

## 🚀 发布命令

### 快速发布

```bash
# 补丁版本 (1.0.5 → 1.0.1)
npm run release:patch

# 次要版本 (1.0.5 → 1.1.0)
npm run release:minor

# 主要版本 (1.0.5 → 2.0.0)
npm run release:major

# 预发布版本
npm run release:prerelease

# 预览模式（不实际发布）
npm run release:dry
```

## 🔄 执行流程

### 1. beforeBump 阶段

在版本更新前执行：

```bash
npm run test                    # 运行所有测试
npm run build                   # 构建当前平台
npm run cross-compile:all       # 交叉编译所有平台
npm run cross-compile:verify    # 验证编译产物
```

**目的**：确保代码质量和所有平台的编译产物都正确

### 2. afterBump 阶段

在版本更新后执行：

```bash
npm run docs:generate           # 生成最新文档
```

**目的**：更新文档以反映新版本

### 3. beforeRelease 阶段

在发布前执行：

```bash
npm run publish:check           # 发布前最终检查
```

**目的**：确保发布前的所有检查都通过

### 4. 发布阶段

执行实际发布：

```bash
npm publish --access public     # 发布到 npm 公开包
```

**目的**：将包发布到 npm 注册表

### 5. afterRelease 阶段

发布后执行：

```bash
echo 'Release completed successfully! Package published to npm with cross-compiled binaries.'
```

**目的**：显示成功消息

## 🏆 集成优势

### 自动化程度

- ✅ **完全自动化**：一键完成整个发布流程
- ✅ **交叉编译**：自动编译所有目标平台
- ✅ **产物验证**：自动验证编译产物
- ✅ **版本管理**：自动更新版本号
- ✅ **Git 操作**：自动提交、打标签、推送
- ✅ **文档更新**：自动生成最新文档

### 质量保证

- ✅ **测试验证**：发布前自动运行所有测试
- ✅ **构建验证**：确保代码能正确构建
- ✅ **交叉编译验证**：确保多平台兼容性
- ✅ **产物验证**：确保编译产物正确
- ✅ **发布检查**：最终发布前检查

### 开发效率

- ✅ **一键发布**：无需手动执行多个步骤
- ✅ **错误处理**：任何步骤失败都会停止流程
- ✅ **预览模式**：可以预览发布流程而不实际发布
- ✅ **版本选择**：支持多种版本类型发布

## 🔍 故障排除

### 常见问题

1. **交叉编译失败**
   ```bash
   # 检查工具链
   node scripts/cross-compile.js --check-tools
   
   # 手动编译特定平台
   npm run cross-compile:darwin-x64
   ```

2. **测试失败**
   ```bash
   # 运行测试查看详细错误
   npm test
   
   # 清理并重新构建
   npm run clean && npm run build
   ```

3. **构建失败**
   ```bash
   # 清理构建缓存
   npm run clean
   
   # 重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   ```

### 调试模式

```bash
# 预览发布流程（不实际执行）
npm run release:dry

# 查看详细输出
DEBUG=* npm run release:patch
```

## 📊 发布统计

### 当前版本

- **版本**：1.0.5
- **Node.js 支持**：>= 14.0.0
- **N-API 版本**：3, 4, 5, 6, 7, 8, 9

### 支持平台

- ✅ macOS (x64, arm64)
- ✅ Windows (x64)
- ✅ Linux (x64, arm64)

### 包大小

- **压缩包**：24.5 MB
- **解压后**：75.8 MB
- **文件数量**：587 个文件

## 🔗 相关链接

- [bumpp 官方文档](https://github.com/antfu/bumpp)
- [npm 发布指南](docs/NPM_PUBLISH_GUIDE.md)
- [API 文档](docs/API.md)
- [项目仓库](https://github.com/pixFlowTeam/librawspeed)
