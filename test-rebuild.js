const LibRaw = require('./lib/index.js');
const fs = require('fs');

async function testLibRaw() {
    console.log('=== 测试 LibRaw 重新编译结果 ===');
    console.log('');
    
    // 测试基本功能
    console.log('🧪 测试基本功能：');
    console.log('LibRaw 版本:', LibRaw.getVersion());
    console.log('支持相机数量:', LibRaw.getCameraCount());
    console.log('');
    
    // 测试 RAW 文件处理
    const sampleFile = 'sample-images/DSCF4035.RAF';
    if (fs.existsSync(sampleFile)) {
        console.log('🧪 测试 RAW 文件处理：');
        console.log('测试文件存在:', sampleFile);
        
        const libraw = new LibRaw();
        try {
            console.log('1. 加载文件...');
            const loadResult = libraw.loadFile(sampleFile);
            console.log('加载结果:', loadResult);
            
            console.log('2. 获取元数据...');
            const metadata = libraw.getMetadata();
            console.log('相机型号:', metadata.make, metadata.model);
            console.log('图像尺寸:', metadata.width, 'x', metadata.height);
            
            console.log('3. 转换 JPEG...');
            const result = await libraw.convertToJPEG(sampleFile, 'output/test.jpg', { quality: 85 });
            console.log('转换结果:', result);
            
            libraw.close();
            console.log('✅ 测试完成！');
        } catch (e) {
            console.log('❌ 处理失败:', e.message);
        }
    } else {
        console.log('⚠️ 测试文件不存在，跳过转换测试');
    }
}

testLibRaw().catch(console.error);
