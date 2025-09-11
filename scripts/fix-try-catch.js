const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/libraw_wrapper.cpp');
let content = fs.readFileSync(filePath, 'utf8');

// 更简单的替换策略：直接移除 try 和 catch 关键字，保留代码块
content = content.replace(/\s+try\s*\{\s*\n/g, '\n');
content = content.replace(/\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)std::string\s+errorMsg\s*=\s*"[^"]*"\s*;\s*\n(\s+)errorMsg\s*\+=\s*e\.what\(\)\s*;\s*\n(\s+)Napi::[^:]*::New\([^)]*\)\.ThrowAsJavaScriptException\(\)\s*;\s*\n(\s+)\}\s*\n/g, '\n');

// 处理其他 catch 模式
content = content.replace(/\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)Napi::[^:]*::New\([^)]*\)\.ThrowAsJavaScriptException\(\)\s*;\s*\n(\s+)\}\s*\n/g, '\n');

// 处理简单的 catch 块
content = content.replace(/\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)\}\s*\n/g, '\n');

fs.writeFileSync(filePath, content);
console.log('成功修复 libraw_wrapper.cpp 中的 try-catch 语句');
