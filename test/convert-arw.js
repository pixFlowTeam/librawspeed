const LibRaw = require('../lib/index.js');
const fs = require('fs');
const path = require('path');

async function convertARW() {
    console.log('=== Sony ARW 文件转换测试 ===');
    console.log('');
    
    const inputFile = '../raw-samples-repo/DSC02975.ARW';
    const outputFile = '../output/DSC02975_converted.jpg';
    
    // 检查输入文件
    if (!fs.existsSync(inputFile)) {
        console.log('❌ 输入文件不存在:', inputFile);
        return;
    }
    
    console.log('📁 输入文件:', inputFile);
    console.log('📁 输出文件:', outputFile);
    console.log('');
    
    const libraw = new LibRaw();
    
    try {
        console.log('1. 加载 ARW 文件...');
        const loadResult = await libraw.loadFile(inputFile);
        console.log('✅ 加载结果:', loadResult);
        
        console.log('2. 获取元数据...');
        const metadata = libraw.getMetadata();
        console.log('📷 相机信息:');
        console.log('  • 制造商:', metadata.make || 'Sony');
        console.log('  • 型号:', metadata.model || 'ILCE-7M4');
        console.log('  • 图像尺寸:', metadata.width, 'x', metadata.height);
        console.log('  • ISO:', metadata.iso_speed);
        console.log('  • 光圈:', metadata.aperture);
        console.log('  • 快门:', metadata.shutter);
        console.log('  • 焦距:', metadata.focal_len, 'mm');
        console.log('  • 白平衡:', metadata.wb_red, metadata.wb_green, metadata.wb_blue);
        
        console.log('3. 转换 JPEG...');
        const startTime = Date.now();
        const result = await libraw.convertToJPEG(inputFile, outputFile, { 
            quality: 90,
            progressive: true,
            mozjpeg: false
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
        if (fs.existsSync(outputFile)) {
            const stats = fs.statSync(outputFile);
            console.log('  • 实际文件大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
        }
        
        libraw.close();
        console.log('✅ 转换成功完成！');
        
    } catch (error) {
        console.log('❌ 转换失败:', error.message);
        libraw.close();
    }
}

convertARW().catch(console.error);
