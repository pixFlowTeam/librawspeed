# 发布指南 - GitHub & npm

本指南将引导您将 LibRaw Node.js 项目发布到 GitHub 和 npm。

## 📋 发布前检查清单

### ✅ 测试完成

- [x] 所有格式测试通过（21/21 文件）
- [x] 性能基准测试完成
- [x] 综合测试覆盖
- [x] 文档已生成

### ✅ 项目结构

- [x] 清洁的文件夹结构
- [x] 包含 TypeScript 定义
- [x] 正确的 package.json 配置
- [x] 包含 MIT 许可证
- [x] 创建了 CHANGELOG.md

### ✅ 质量检查

- [x] 无硬编码路径
- [x] 跨平台兼容性
- [x] 无内存泄漏
- [x] 错误处理健壮
- [x] 性能优化

## 🚀 步骤 1：GitHub 发布

### 1.1 创建 GitHub 仓库

1. 访问 [GitHub.com](https://github.com)
2. 点击 "New Repository"
3. 仓库设置：
   - **名称**：`librawspeed`
   - **描述**：`Node.js Native Addon for LibRaw - Process RAW image files with JavaScript`
   - **可见性**：公开
   - **初始化**：❌ 不要添加 README/许可证（我们已有）

### 1.2 将本地仓库连接到 GitHub

```bash
# 添加远程源（替换为您的 GitHub 用户名）
git remote add origin https://github.com/pixFlowTeam/librawspeed.git

# 验证远程
git remote -v

# 推送到 GitHub
git push -u origin main
```

### 1.3 验证 GitHub 设置

检查您的仓库包含：

- ✅ 所有源文件
- ✅ 带徽章的 README.md
- ✅ LICENSE 文件
- ✅ CHANGELOG.md
- ✅ 完整文档

### 1.4 设置仓库功能

1. **启用 Issues**：设置 → 功能 → Issues ✅
2. **启用讨论**：设置 → 功能 → 讨论 ✅
3. **添加主题**：关于部分 → 添加主题：
   - `libraw`, `nodejs`, `raw-images`, `native-addon`, `photography`, `metadata`, `exif`

## 📦 步骤 2：npm 发布

### 2.1 更新包信息

使用您的详细信息更新 `package.json`：

```bash
# 更新作者信息
npm config set init-author-name "Bao LE"
npm config set init-author-email "bao.lq.it@gmail.com"
npm config set init-author-url "https://github.com/pixFlowTeam"
```

编辑 `package.json`：

```json
{
  "author": "Bao LE <bao.lq.it@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/pixFlowTeam/librawspeed.git"
  },
  "bugs": {
    "url": "https://github.com/pixFlowTeam/librawspeed/issues"
  },
  "homepage": "https://github.com/pixFlowTeam/librawspeed#readme"
}
```

### 2.2 发布前测试

```bash
# 运行综合测试
npm test

# 检查包内容
npm run publish:dry

# 验证所有文件都包含
npm pack --dry-run
```

### 2.3 npm 账户设置

```bash
# 登录到 npm（如需要则创建账户）
npm login

# 验证登录
npm whoami
```

### 2.4 发布到 npm

```bash
# 最终发布前检查
npm run prepublishOnly

# 发布（首次）
npm publish

# 如果名称被占用，尝试作用域包：
# npm publish --access public
```

### 2.5 验证发布

1. 检查包页面：`https://www.npmjs.com/package/librawspeed`
2. 测试安装：`npm install librawspeed`
3. 使用真实的 npm 统计更新 README 徽章

## 📈 步骤 3：发布后设置

### 3.1 更新徽章

替换 README.md 中的占位符徽章：

```markdown
[![npm version](https://badge.fury.io/js/librawspeed.svg)](https://www.npmjs.com/package/librawspeed)
[![Downloads](https://img.shields.io/npm/dm/librawspeed.svg)](https://www.npmjs.com/package/librawspeed)
```

### 3.2 添加 GitHub 发布

```bash
# 创建并推送标签
git tag v0.1.34-poc
git push origin v0.1.34-poc
```

然后在 GitHub 上创建发布：

1. 转到仓库 → 发布 → 创建新发布
2. 标签：`v0.1.34-poc`
3. 标题：`LibRaw Node.js v0.1.34-poc - Initial Release`
4. 描述：从 CHANGELOG.md 复制

### 3.3 文档网站（可选）

考虑设置 GitHub Pages：

1. 仓库 → 设置 → Pages
2. 源：从分支 `main` `/docs` 文件夹部署
3. 自定义域名（可选）

## 🔄 步骤 4：升级 LibRaw

当 LibRaw 发布新版本时：

### 4.1 检查更新

```bash
npm run upgrade:libraw
```

### 4.2 手动升级过程

1. **下载新的 LibRaw**：访问 [LibRaw Downloads](https://www.libraw.org/download)

2. **备份当前版本**：

   ```bash
   xcopy deps deps-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2% /E /I /H
   ```

3. **替换库文件**：

   - 解压新的 `LibRaw-X.X.X-Win64.zip`
   - 替换 `deps/LibRaw-Win64/` 内容
   - 确保所有必需文件都存在

4. **更新构建配置**（如需要）：

   ```json
   // binding.gyp - 如果 LibRaw 结构发生变化则更新路径
   ```

5. **重新构建和测试**：

   ```bash
   npm run clean
   npm run build
   npm test
   ```

6. **更新文档**：

   ```bash
   npm run docs:generate
   ```

7. **发布更新**：
   ```bash
   npm version patch  # 或 minor/major
   npm publish
   git push --tags
   ```

## 🐛 故障排除

### 构建问题

**错误：找不到 Python**

```bash
npm config set python python3
# 或安装 Python 3.x
```

**错误：找不到 Visual Studio（Windows）**

```bash
npm install --global windows-build-tools
```

**错误：node-gyp 失败**

```bash
npm install --global node-gyp
node-gyp configure
```

### 发布问题

**错误：包名已存在**

- 使用作用域包：`@pixflowteam/librawspeed`
- 选择不同名称：`librawspeedjs`, `node-libraw`

**错误：未授权**

```bash
npm logout
npm login
```

**错误：需要 2FA**

```bash
npm publish --otp=123456
```

## 📊 成功指标

发布后，监控：

### GitHub 指标

- ⭐ 星标和分叉
- 🐛 问题和讨论
- 📈 流量和克隆
- 🤝 贡献者

### npm 指标

- 📦 下载次数
- 🔄 版本采用
- 💬 社区反馈
- 🔍 搜索排名

### 使用分析

- 📧 支持请求
- 📝 博客提及
- 🎯 使用案例
- 🚀 性能反馈

## 🎯 下一步

1. **社区建设**：

   - 在社交媒体上分享
   - 在相关论坛发帖
   - 写博客文章
   - 创建视频教程

2. **功能开发**：

   - 收集用户反馈
   - 规划 v2.0 功能
   - 实现完整图像解码
   - 添加批量处理

3. **维护**：
   - 定期 LibRaw 更新
   - 安全补丁
   - 性能改进
   - 错误修复

## 📞 支持渠道

设置这些支持渠道：

- 📧 邮箱：bao.lq.it@gmail.com
- 🐛 GitHub Issues：错误报告和功能请求
- 💬 GitHub 讨论：社区支持
- 📖 文档：Wiki 或文档站点
- 🐦 社交媒体：更新和公告

---

**恭喜！您的 LibRaw Node.js 项目已准备好面向世界！🎉**

请记住：

- 保持文档更新
- 回应社区反馈
- 维护定期发布
- 监控安全建议
