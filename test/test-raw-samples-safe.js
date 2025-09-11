const LibRaw = require('../lib/index.js');
const fs = require('fs');
const path = require('path');
const fileUtils = require('./file-utils.js');

// 创建安全的测试文件列表
const testFiles = fileUtils.findRawFiles().map(file => ({
    name: `${file.extension.toUpperCase()} - ${file.name}`,
    path: file.path,
    output: path.join(fileUtils.ensureOutputDir(), `safe_${fileUtils.generateOutputFileName(file.path)}`)
}));

async function testRawFileSafe(fileInfo) {
    console.log(`\n=== 安全测试 ${fileInfo.name} ===`);
    console.log('');
    
    // 检查输入文件
    if (!fs.existsSync(fileInfo.path)) {
        console.log(`❌ 输入文件不存在: ${fileInfo.path}`);
        return false;
    }
    
    // 检查文件是否为真正的 RAW 格式
    const buffer = fs.readFileSync(fileInfo.path, { start: 0, end: 16 });
    const hex = buffer.toString('hex');
    
    if (hex.startsWith('ffd8')) {
        console.log(`❌ 文件是 JPEG 格式，不是 RAW 文件`);
        return false;
    }
    
    console.log(`📁 输入文件: ${path.basename(fileInfo.path)}`);
    console.log(`📁 输出文件: ${path.basename(fileInfo.output)}`);
    console.log(`📁 文件头: ${hex.substring(0, 16)}`);
    
    const libraw = new LibRaw();
    
    try {
        console.log('1. 加载 RAW 文件...');
        const loadResult = await libraw.loadFile(fileInfo.path);
        console.log('✅ 加载结果:', loadResult);
        
        console.log('2. 获取元数据...');
        const metadata = libraw.getMetadata();
        console.log('📷 相机信息:');
        console.log('  • 制造商:', metadata.make || 'Unknown');
        console.log('  • 型号:', metadata.model || 'Unknown');
        console.log('  • 图像尺寸:', metadata.width, 'x', metadata.height);
        console.log('  • ISO:', metadata.iso_speed);
        console.log('  • 光圈:', metadata.aperture);
        console.log('  • 快门:', metadata.shutter);
        console.log('  • 焦距:', metadata.focal_len, 'mm');
        
        console.log('3. 转换 JPEG...');
        const startTime = Date.now();
        
        // 确保输出目录存在
        const outputDir = path.dirname(fileInfo.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const result = await libraw.convertToJPEG(fileInfo.path, fileInfo.output, { 
            quality: 90,
            progressive: true
        });
        const endTime = Date.now();
        
        console.log('✅ 转换完成!');
        console.log('📊 转换结果:');
        console.log('  • 输出路径:', result.outputPath);
        console.log('  • 原始尺寸:', result.metadata.originalDimensions.width, 'x', result.metadata.originalDimensions.height);
        console.log('  • 输出尺寸:', result.metadata.outputDimensions.width, 'x', result.metadata.outputDimensions.height);
        console.log('  • 原始大小:', (result.metadata.fileSize.original / 1024 / 1024).toFixed(2), 'MB');
        console.log('  • 压缩大小:', (result.metadata.fileSize.compressed / 1024 / 1024).toFixed(2), 'MB');
        console.log('  • 压缩比:', result.metadata.fileSize.compressionRatio);
        console.log('  • 处理时间:', result.metadata.processing.timeMs, 'ms');
        console.log('  • 吞吐量:', result.metadata.processing.throughputMBps, 'MB/s');
        console.log('  • 实际耗时:', (endTime - startTime), 'ms');
        
        // 检查输出文件
        if (fs.existsSync(fileInfo.output)) {
            const stats = fs.statSync(fileInfo.output);
            console.log('  • 实际文件大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
        }
        
        libraw.close();
        console.log('✅ 转换成功完成！');
        return true;
        
    } catch (error) {
        console.log('❌ 转换失败:', error.message);
        libraw.close();
        return false;
    }
}

async function runSafeTests() {
    console.log('=== 安全的 RAW 文件转换测试 ===');
    console.log('');
    console.log('🧪 测试文件数量:', testFiles.length);
    console.log('');
    
    const results = [];
    
    for (const fileInfo of testFiles) {
        const success = await testRawFileSafe(fileInfo);
        results.push({
            name: fileInfo.name,
            success: success
        });
    }
    
    console.log('\n=== 测试结果总结 ===');
    console.log('');
    results.forEach(result => {
        console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.success ? '成功' : '失败'}`);
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 总计: ${successCount}/${results.length} 个文件转换成功`);
}

runSafeTests().catch(console.error);
