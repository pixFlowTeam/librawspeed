const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/libraw_wrapper.cpp');
let content = fs.readFileSync(filePath, 'utf8');

// 删除所有 catch 语句
content = content.replace(/\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)Napi::[^:]*::New\([^)]*\)\.ThrowAsJavaScriptException\(\)\s*;\s*\n(\s+)return\s+[^;]*;\s*\n(\s+)\}\s*\n/g, '\n');

// 删除其他 catch 模式
content = content.replace(/\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)\}\s*\n/g, '\n');

fs.writeFileSync(filePath, content);
console.log('成功从 libraw_wrapper.cpp 中移除 catch 语句');
