# 为 LibRaw Node.js 贡献

感谢您对为 LibRaw Node.js 贡献感兴趣！本文档提供了为项目贡献的指南。

## 开发设置

1. **Fork 和克隆**

   ```bash
   git clone https://github.com/pixFlowTeam/librawspeed.git
   cd librawspeed
   ```

2. **安装依赖项**

   ```bash
   npm install
   ```

3. **构建项目**

   ```bash
   npm run build
   ```

4. **运行测试**
   ```bash
   npm run test:quick
   ```

## 开发指南

### 代码风格

- 使用一致的缩进（2 个空格）
- 遵循现有的命名约定
- 为复杂逻辑添加注释
- 保持函数专注和小巧

### C++ 指南

- 使用 RAII 进行资源管理
- 处理所有 LibRaw 错误代码
- 提供有意义的错误消息
- 在析构函数中清理资源

### JavaScript 指南

- 使用现代 async/await 语法
- 提供全面的错误处理
- 编写清晰、自文档化的代码
- 为公共 API 添加 JSDoc 注释

## 测试

### 添加测试

- 为新功能添加单元测试
- 测试错误条件
- 包含使用示例文件的集成测试
- 验证内存清理

### 运行测试

```bash
npm run test:quick    # 基本功能
npm run test:samples  # 示例文件处理
npm run test:compare  # 比较分析
npm test path/to/raw  # 自定义文件测试
```

## 提交更改

1. **创建分支**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **进行更改**

   - 按照指南编写代码
   - 为新功能添加测试
   - 根据需要更新文档

3. **测试您的更改**

   ```bash
   npm run build
   npm run test:quick
   ```

4. **提交您的更改**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 提交消息格式

使用约定式提交格式:

- `feat:` 新功能
- `fix:` 错误修复
- `docs:` 文档更改
- `test:` 测试添加或修改
- `refactor:` 代码重构
- `perf:` 性能改进

## 贡献领域

### 高优先级

- 跨平台构建支持（macOS、Linux）
- 使用工作线程的异步处理
- 图像处理和导出功能
- TypeScript 定义

### 中优先级

- 额外的元数据提取
- 性能优化
- 更好的错误处理
- 文档改进

### 低优先级

- 高级颜色管理
- 批量处理功能
- 插件系统
- 额外的导出格式

## 有问题？

- 为错误或功能请求开启 issue
- 为问题或想法开始讨论
- 在创建新 issue 之前检查现有问题

感谢您的贡献！
