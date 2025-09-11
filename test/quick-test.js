const LibRaw = require('../lib/index');

console.log('LibRaw Node.js POC - 快速测试');
console.log('===============================\n');

try {
    console.log('✓ 创建 LibRaw 处理器...');
    const processor = new LibRaw();
    console.log('✓ LibRaw 处理器创建成功！');
    
    console.log('✓ 测试关闭方法...');
    processor.close();
    console.log('✓ 关闭方法工作正常！');
    
    console.log('\n🎉 POC 工作正常！插件加载成功。');
    console.log('\n要使用真实 RAW 文件测试：');
    console.log('  node test/test.js <path-to-raw-file>');
    console.log('  node examples/basic-example.js <path-to-raw-file>');
    
} catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('\n故障排除：');
    console.error('1. 确保 libraw.dll 在 build/Release 文件夹中');
    console.error('2. 检查 Visual Studio Build Tools 是否正确安装');
    console.error('3. 验证 Node.js 版本兼容性');
}
