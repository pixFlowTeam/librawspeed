const LibRaw = require('../lib/index.js');
const path = require('path');

/**
 * 颜色操作测试
 * 测试 getColorAt, convertFloatToInt, 白平衡和颜色矩阵操作
 */

async function testColorOperations() {
  console.log('🎨 颜色操作测试');
  console.log('==================');
  
  const processor = new LibRaw();
  const testFiles = [
    'raw-samples-repo/ARW/DSC02975.ARW',
    'raw-samples-repo/CR2/sample_canon_400d1.cr2',
    'raw-samples-repo/NEF/RAW_NIKON_D90.NEF',
    'raw-samples-repo/DNG/RAW_LEICA_M8.DNG'
  ];

  for (const testFile of testFiles) {
    console.log(`\n📁 测试文件: ${testFile}`);
    console.log('─'.repeat(50));
    
    try {
      // 加载文件
      const filePath = path.join(__dirname, '..', testFile);
      await processor.loadFile(filePath);
      console.log('✅ 文件加载成功');

      // 获取元数据信息
      const metadata = await processor.getMetadata();
      console.log(`📐 图像尺寸: ${metadata.width} x ${metadata.height}`);

      // ============== 1. 测试颜色信息获取 ==============
      console.log('\n🎨 测试颜色信息获取');
      console.log('─'.repeat(30));

      // 获取颜色信息
      try {
        const colorInfo = await processor.getColorInfo();
        console.log('🎨 颜色信息:');
        console.log('   颜色数量:', colorInfo.colors);
        console.log('   滤镜模式:', colorInfo.filters);
        console.log('   黑电平:', colorInfo.blackLevel);
        console.log('   数据最大值:', colorInfo.dataMaximum);
        console.log('   白电平:', colorInfo.whiteLevel);
        
        if (colorInfo.profileLength > 0) {
          console.log('   颜色配置文件长度:', colorInfo.profileLength);
        }
        
        console.log('   相机乘数:', colorInfo.camMul);
        console.log('   RGB相机矩阵:');
        colorInfo.rgbCam.forEach((row, i) => {
          console.log(`     行 ${i}:`, row.map(val => val.toFixed(6)).join(', '));
        });
      } catch (error) {
        console.log('❌ 获取颜色信息失败:', error.message);
      }

      // ============== 2. 测试白平衡信息 ==============
      console.log('\n⚖️ 测试白平衡信息');
      console.log('─'.repeat(30));

      // 获取白平衡信息
      try {
        const whiteBalance = await processor.getWhiteBalance();
        console.log('⚖️ 白平衡信息:');
        console.log('   相机白平衡:', whiteBalance.camera);
        console.log('   手动白平衡:', whiteBalance.manual);
        console.log('   白平衡系数:', whiteBalance.coefficients);
      } catch (error) {
        console.log('❌ 获取白平衡信息失败:', error.message);
      }

      // ============== 3. 测试相机颜色矩阵 ==============
      console.log('\n📊 测试相机颜色矩阵');
      console.log('─'.repeat(30));

      // 获取相机颜色矩阵
      try {
        const cameraMatrix = await processor.getCameraColorMatrix();
        console.log('📊 相机颜色矩阵:');
        console.log('   R:', cameraMatrix.red);
        console.log('   G:', cameraMatrix.green);
        console.log('   B:', cameraMatrix.blue);
        console.log('   G2:', cameraMatrix.green2);
      } catch (error) {
        console.log('❌ 获取相机颜色矩阵失败:', error.message);
      }

      // 获取RGB相机矩阵
      try {
        const rgbMatrix = await processor.getRGBCameraMatrix();
        console.log('🌈 RGB相机矩阵:');
        rgbMatrix.forEach((row, i) => {
          console.log(`   行 ${i}:`, row.map(val => val.toFixed(6)).join(', '));
        });
      } catch (error) {
        console.log('❌ 获取RGB相机矩阵失败:', error.message);
      }

      // ============== 4. 测试需要图像处理的功能 ==============
      console.log('\n🔄 测试需要图像处理的功能');
      console.log('─'.repeat(30));

      try {
        // 解包
        await processor.unpack();
        console.log('✅ 解包成功');

        // 处理图像
        await processor.raw2Image();
        console.log('✅ RAW到图像转换成功');

        // 测试 getColorAt 功能
        console.log('\n🔍 测试 getColorAt 功能');
        const testPositions = [
          { row: 0, col: 0, desc: '左上角' },
          { row: 0, col: 1, desc: '右上角附近' },
          { row: 1, col: 0, desc: '左下角附近' },
          { row: Math.floor(metadata.height / 2), col: Math.floor(metadata.width / 2), desc: '中心位置' }
        ];

        for (const pos of testPositions) {
          try {
            const colorValue = await processor.getColorAt(pos.row, pos.col);
            console.log(`📍 ${pos.desc} (${pos.row}, ${pos.col}): 颜色值 = ${colorValue}`);
          } catch (error) {
            console.log(`❌ ${pos.desc} (${pos.row}, ${pos.col}): 错误 - ${error.message}`);
          }
        }

        // 测试 convertFloatToInt 功能
        console.log('\n🔄 测试 convertFloatToInt 功能');
        
        // 测试默认参数
        try {
          await processor.convertFloatToInt();
          console.log('✅ 默认参数转换成功 (dmin=4096, dmax=32767, dtarget=16383)');
        } catch (error) {
          console.log('❌ 默认参数转换失败:', error.message);
        }

        // 测试自定义参数
        const customParams = [
          { dmin: 2048, dmax: 16383, dtarget: 8192, desc: '较低范围' },
          { dmin: 8192, dmax: 65535, dtarget: 32767, desc: '较高范围' }
        ];

        for (const params of customParams) {
          try {
            await processor.convertFloatToInt(params.dmin, params.dmax, params.dtarget);
            console.log(`✅ ${params.desc} 转换成功 (${params.dmin}, ${params.dmax}, ${params.dtarget})`);
          } catch (error) {
            console.log(`❌ ${params.desc} 转换失败:`, error.message);
          }
        }

        // 获取处理后的图像格式
        try {
          const memFormat = await processor.getMemImageFormat();
          console.log('📐 内存图像格式:');
          console.log('   宽度:', memFormat.width);
          console.log('   高度:', memFormat.height);
          console.log('   颜色数:', memFormat.colors);
          console.log('   位深度:', memFormat.bps);
        } catch (error) {
          console.log('❌ 获取内存图像格式失败:', error.message);
        }

        // 清理
        await processor.freeImage();
        console.log('🧹 资源清理完成');

      } catch (error) {
        console.log('❌ 图像处理测试失败:', error.message);
      }

      // 关闭处理器
      await processor.close();
      console.log('🔒 处理器已关闭');

    } catch (error) {
      console.log(`❌ 文件 ${testFile} 测试失败:`, error.message);
    }
  }

  console.log('\n🎉 颜色操作测试完成');
}

// 运行测试
if (require.main === module) {
  testColorOperations().catch(console.error);
}

module.exports = { testColorOperations };
