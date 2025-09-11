const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/libraw_wrapper.cpp');
let content = fs.readFileSync(filePath, 'utf8');

// 替换 try-catch 语句的模式
const tryCatchPattern = /(\s+)try\s*\{\s*\n((?:[^}]*\n)*?)\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)std::string\s+errorMsg\s*=\s*"[^"]*"\s*;\s*\n(\s+)errorMsg\s*\+=\s*e\.what\(\)\s*;\s*\n(\s+)Napi::[^:]*::New\([^)]*\)\.ThrowAsJavaScriptException\(\)\s*;\s*\n(\s+)\}\s*\n/g;

// 替换为简单的错误处理
content = content.replace(tryCatchPattern, (match, indent1, tryContent, indent2, indent3, indent4, indent5, indent6) => {
  // 移除 try 和 catch 的缩进
  const cleanContent = tryContent.replace(/^(\s+)/gm, indent1);
  return cleanContent;
});

// 处理其他 try-catch 模式
const simpleTryCatchPattern = /(\s+)try\s*\{\s*\n((?:[^}]*\n)*?)\s*\}\s*catch\s*\(\s*const\s+std::exception&\s+e\s*\)\s*\{\s*\n(\s+)Napi::[^:]*::New\([^)]*\)\.ThrowAsJavaScriptException\(\)\s*;\s*\n(\s+)\}\s*\n/g;

content = content.replace(simpleTryCatchPattern, (match, indent1, tryContent, indent2, indent3) => {
  const cleanContent = tryContent.replace(/^(\s+)/gm, indent1);
  return cleanContent;
});

// 处理 LibRaw 错误检查
const librawErrorPattern = /(\s+)if\s*\(\s*processor->open_file\([^)]*\)\s*!=\s*LIBRAW_SUCCESS\s*\)\s*\{\s*\n(\s+)Napi::[^:]*::New\([^)]*\)\.ThrowAsJavaScriptException\(\)\s*;\s*\n(\s+)return\s*;\s*\n(\s+)\}\s*\n/g;

content = content.replace(librawErrorPattern, (match, indent1, indent2, indent3, indent4) => {
  return `${indent1}if (processor->open_file($1) != LIBRAW_SUCCESS) {\n${indent2}Napi::TypeError::New(env, "Failed to open file").ThrowAsJavaScriptException();\n${indent3}return;\n${indent4}}\n`;
});

fs.writeFileSync(filePath, content);
console.log('Successfully removed try-catch statements from libraw_wrapper.cpp');
