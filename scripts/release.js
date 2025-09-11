#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 开始发布流程...\n');

const steps = [
  { name: '构建源码', command: 'npm run build' },
  { name: '运行测试', command: 'npm run test' },
  { name: '交叉编译', command: 'npm run cross-compile:all' },
  { name: '验证产物', command: 'npm run cross-compile:verify' },
  { name: '生成文档', command: 'npm run docs:generate' },
  { name: '提交所有更改', command: 'git add . && git commit -m "chore: 发布新版本 - 包含文档更新"' },
  { name: '创建标签', command: 'git tag -a v$(node -p "require(\'./package.json\').version") -m "Release v$(node -p "require(\'./package.json\').version")"' },
  { name: '推送到远程', command: 'git push && git push --tags' },
];

try {
  for (const step of steps) {
    console.log(`📦 ${step.name}...`);
    execSync(step.command, { stdio: 'inherit' });
    console.log(`✅ ${step.name} 完成\n`);
  }
  
  console.log('🎉 所有步骤完成！');
} catch (error) {
  console.error(`❌ 步骤失败: ${error.message}`);
  process.exit(1);
}
