#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 开始发布流程...\n');

const steps = [
  { name: '运行测试', command: 'npm run test' },
  { name: '交叉编译', command: 'npm run cross-compile:all' },
  { name: '验证产物', command: 'npm run cross-compile:verify' },
  { name: '生成文档', command: 'npm run docs:generate' },
  { name: '暂存文档文件', command: 'git add docs/API.md docs/EXAMPLES.md docs/FORMATS.md' },
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
