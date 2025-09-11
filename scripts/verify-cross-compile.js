#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CrossCompileVerifier {
  constructor() {
    this.librawSourceDir = path.join(__dirname, '../deps/LibRaw-Source/LibRaw-0.21.4');
    this.buildDir = path.join(this.librawSourceDir, 'build');
  }

  verify() {
    console.log('🔍 验证交叉编译产物...\n');

    const platforms = this.getAvailablePlatforms();
    
    if (platforms.length === 0) {
      console.log('❌ 未找到任何交叉编译产物');
      return false;
    }

    let allValid = true;

    for (const platform of platforms) {
      console.log(`📦 检查 ${platform} 平台...`);
      
      const platformDir = path.join(this.buildDir, platform);
      const libPath = path.join(platformDir, 'lib', 'libraw.a');
      
      if (!fs.existsSync(libPath)) {
        console.log(`  ❌ 未找到 libraw.a: ${libPath}`);
        allValid = false;
        continue;
      }

      try {
        // 检查文件类型
        const fileInfo = execSync(`file "${libPath}"`, { encoding: 'utf8' }).trim();
        console.log(`  ✅ 文件类型: ${fileInfo}`);

        // 检查文件大小
        const stats = fs.statSync(libPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`  ✅ 文件大小: ${sizeMB} MB`);

        // 检查归档内容
        const archiveInfo = execSync(`ar -t "${libPath}" | head -5`, { encoding: 'utf8' }).trim();
        console.log(`  ✅ 归档内容: ${archiveInfo.split('\n').length} 个目标文件`);

      } catch (error) {
        console.log(`  ❌ 验证失败: ${error.message}`);
        allValid = false;
      }

      console.log('');
    }

    if (allValid) {
      console.log('🎉 所有交叉编译产物验证通过！');
    } else {
      console.log('⚠️  部分交叉编译产物验证失败');
    }

    return allValid;
  }

  getAvailablePlatforms() {
    if (!fs.existsSync(this.buildDir)) {
      return [];
    }

    return fs.readdirSync(this.buildDir)
      .filter(item => {
        const itemPath = path.join(this.buildDir, item);
        return fs.statSync(itemPath).isDirectory();
      })
      .filter(platform => {
        const libPath = path.join(this.buildDir, platform, 'lib', 'libraw.a');
        return fs.existsSync(libPath);
      });
  }

  showSummary() {
    console.log('📊 交叉编译产物摘要:');
    console.log('==================');
    
    const platforms = this.getAvailablePlatforms();
    
    if (platforms.length === 0) {
      console.log('❌ 无可用产物');
      return;
    }

    for (const platform of platforms) {
      const libPath = path.join(this.buildDir, platform, 'lib', 'libraw.a');
      const stats = fs.statSync(libPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`✅ ${platform}: ${sizeMB} MB`);
    }
  }
}

// 主程序
if (require.main === module) {
  const verifier = new CrossCompileVerifier();
  
  if (process.argv.includes('--summary')) {
    verifier.showSummary();
  } else {
    const isValid = verifier.verify();
    process.exit(isValid ? 0 : 1);
  }
}

module.exports = CrossCompileVerifier;
