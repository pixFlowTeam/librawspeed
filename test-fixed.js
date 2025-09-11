const LibRaw = require('./lib/index.js');
const fs = require('fs');

async function testLibRawFixed() {
    console.log('=== 修复后的 LibRaw 测试 ===');
    console.log('');
    
    // 测试基本功能
    console.log('🧪 测试基本功能：');
    console.log('LibRaw 版本:', LibRaw.getVersion());
    console.log('支持相机数量:', LibRaw.getCameraCount());
    console.log('');
    
    // 测试 RAW 文件处理
    const sampleFile = 'sample-images/DSCF4042.RAF'; // 使用真正的 RAW 文件
    if (fs.existsSync(sampleFile)) {
        console.log('🧪 测试 RAW 文件处理：');
        console.log('测试文件存在:', sampleFile);
        
        const libraw = new LibRaw();
        try {
            console.log('1. 加载文件...');
            const loadResult = await libraw.loadFile(sampleFile); // 等待 Promise 完成
            console.log('加载结果:', loadResult);
            
            console.log('2. 获取元数据...');
            const metadata = libraw.getMetadata();
            console.log('相机型号:', metadata.make, metadata.model);
            console.log('图像尺寸:', metadata.width, 'x', metadata.height);
            console.log('ISO:', metadata.iso_speed);
            console.log('光圈:', metadata.aperture);
            console.log('快门:', metadata.shutter);
            console.log('焦距:', metadata.focal_len);
            
            console.log('3. 转换 JPEG...');
            const result = await libraw.convertToJPEG(sampleFile, 'output/test-fixed.jpg', { quality: 85 });
            console.log('转换结果:', result.outputPath);
            console.log('文件大小:', result.metadata.fileSize.compressed, 'bytes');
            
            libraw.close();
            console.log('✅ 测试完成！');
        } catch (e) {
            console.log('❌ 处理失败:', e.message);
            libraw.close();
        }
    } else {
        console.log('⚠️ 测试文件不存在，跳过转换测试');
    }
}

testLibRawFixed().catch(console.error);
