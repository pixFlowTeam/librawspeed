const LibRaw = require('../lib/index.js');
const path = require('path');
const fs = require('fs');

/**
 * 完全按照 safe 脚本的方式转换
 * 1. 只调用 loadFile
 * 2. 只调用 getMetadata  
 * 3. 直接调用 convertToJPEG
 * 不调用任何其他方法！
 */
async function convertExactlyLikeSafe(inputFile, outputFile) {
  console.log('🎯 完全按照 safe 脚本的方式转换');
  console.log('='.repeat(50));

  const libraw = new LibRaw();

  try {
    console.log(`📁 输入文件: ${inputFile}`);
    console.log(`📁 输出文件: ${outputFile}`);

    // 检查输入文件
    if (!fs.existsSync(inputFile)) {
      throw new Error(`输入文件不存在: ${inputFile}`);
    }

    const fileStats = fs.statSync(inputFile);
    console.log(`📊 文件大小: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. 加载 RAW 文件（完全按照 safe 脚本）
    console.log('1. 加载 RAW 文件...');
    const loadResult = await libraw.loadFile(inputFile);
    console.log('✅ 加载结果:', loadResult);

    // 2. 获取元数据（完全按照 safe 脚本）
    console.log('2. 获取元数据...');
    const metadata = await libraw.getMetadata();
    console.log('📷 相机信息:');
    console.log('  • 制造商:', metadata.make || 'Unknown');
    console.log('  • 型号:', metadata.model || 'Unknown');
    console.log('  • 图像尺寸:', metadata.width, 'x', metadata.height);
    console.log('  • ISO:', metadata.iso || 'Unknown');
    console.log('  • 光圈:', metadata.aperture || 'Unknown');
    console.log('  • 快门:', metadata.shutterSpeed || 'Unknown');
    console.log('  • 焦距:', metadata.focalLength || 'Unknown', 'mm');

    // 3. 转换 JPEG（完全按照 safe 脚本）
    console.log('3. 转换 JPEG...');
    const startTime = Date.now();

    const result = await libraw.convertToJPEG(inputFile, outputFile, { 
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
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      console.log('  • 实际文件大小:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
    }

    console.log('✅ 转换成功完成！');
    return true;

  } catch (error) {
    console.log('❌ 转换失败:', error.message);
    console.error('错误详情:', error);
    return false;
  } finally {
    libraw.close();
  }
}

// 批量转换所有 RAW 文件
async function convertAllExactlyLikeSafe() {
  console.log('🔄 批量转换所有 RAW 文件（完全按照 safe 方式）');
  console.log('='.repeat(60));

  const rawSamplesDir = path.join(__dirname, 'raw-samples-repo');
  const outputDir = path.join(__dirname, 'output');

  // 查找所有 RAW 文件
  const rawFiles = [];
  const subdirs = fs.readdirSync(rawSamplesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const subdir of subdirs) {
    const subdirPath = path.join(rawSamplesDir, subdir);
    const files = fs.readdirSync(subdirPath)
      .filter(f => f.toLowerCase().match(/\.(cr2|cr3|nef|arw|raf|rw2|dng|pef)$/))
      .map(f => ({
        input: path.join(subdir, f),
        output: path.join(outputDir, `exactly_safe_${f.replace(/\.[^.]+$/, '.jpg')}`)
      }));
    rawFiles.push(...files);
  }

  console.log(`📁 找到 ${rawFiles.length} 个 RAW 文件`);

  const results = [];
  for (const file of rawFiles) {
    const inputPath = path.join(rawSamplesDir, file.input);
    console.log(`\n🔄 转换: ${file.input}`);
    const success = await convertExactlyLikeSafe(inputPath, file.output);
    results.push({
      name: file.input,
      success: success
    });
  }

  console.log('\n📊 转换结果总结');
  console.log('='.repeat(60));
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.success ? '成功' : '失败'}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 总计: ${successCount}/${results.length} 个文件转换成功`);
}

// 运行转换
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length >= 2) {
    // 转换单个文件
    convertExactlyLikeSafe(args[0], args[1]).catch(console.error);
  } else if (args[0] === '--all') {
    // 转换所有文件
    convertAllExactlyLikeSafe().catch(console.error);
  } else {
    console.log('用法:');
    console.log('  转换单个文件: node convert-exactly-like-safe.js <输入文件> <输出文件>');
    console.log('  转换所有文件: node convert-exactly-like-safe.js --all');
    console.log('');
    console.log('示例:');
    console.log('  node convert-exactly-like-safe.js raw-samples-repo/ARW/DSC02975.ARW output/test.jpg');
    console.log('  node convert-exactly-like-safe.js --all');
  }
}

module.exports = { convertExactlyLikeSafe, convertAllExactlyLikeSafe };
