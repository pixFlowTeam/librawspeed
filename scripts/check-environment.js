#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

class EnvironmentChecker {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.nodeVersion = process.version;
    this.issues = [];
    this.warnings = [];
  }

  check() {
    console.log('🔍 检查 N-API 构建环境...\n');
    console.log(`📊 系统信息:`);
    console.log(`   平台: ${this.platform} ${this.arch}`);
    console.log(`   Node.js: ${this.nodeVersion}`);
    console.log(`   内存: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
    console.log('');

    this.checkNodeVersion();
    this.checkPython();
    this.checkCompiler();
    this.checkBuildTools();
    this.checkNodeGyp();
    this.checkLibRawDependencies();

    this.printResults();
    return this.issues.length === 0;
  }

  checkNodeVersion() {
    const majorVersion = parseInt(this.nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 14) {
      this.issues.push(`Node.js 版本过低: ${this.nodeVersion}，需要 >= 14.0.0`);
    } else {
      console.log('✅ Node.js 版本检查通过');
    }
  }

  checkPython() {
    try {
      const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
      console.log(`✅ Python 检查通过: ${pythonVersion}`);
    } catch (error) {
      try {
        const python3Version = execSync('python3 --version', { encoding: 'utf8' }).trim();
        console.log(`✅ Python3 检查通过: ${python3Version}`);
        this.warnings.push('建议设置 npm config set python python3');
      } catch (error2) {
        this.issues.push('Python 未找到，需要安装 Python 2.7 或 3.x');
      }
    }
  }

  checkCompiler() {
    switch (this.platform) {
      case 'win32':
        this.checkWindowsCompiler();
        break;
      case 'darwin':
        this.checkMacOSCompiler();
        break;
      case 'linux':
        this.checkLinuxCompiler();
        break;
    }
  }

  checkWindowsCompiler() {
    try {
      // 检查 Visual Studio Build Tools
      execSync('where cl', { stdio: 'ignore' });
      console.log('✅ Visual Studio 编译器检查通过');
    } catch (error) {
      try {
        // 检查 MinGW
        execSync('where gcc', { stdio: 'ignore' });
        console.log('✅ MinGW 编译器检查通过');
      } catch (error2) {
        this.issues.push('C++ 编译器未找到，需要安装 Visual Studio Build Tools 或 MinGW');
        this.issues.push('运行: npm install --global windows-build-tools');
      }
    }
  }

  checkMacOSCompiler() {
    try {
      const clangVersion = execSync('clang --version', { encoding: 'utf8' }).trim();
      console.log(`✅ Clang 编译器检查通过: ${clangVersion.split('\n')[0]}`);
    } catch (error) {
      this.issues.push('Clang 编译器未找到，需要安装 Xcode Command Line Tools');
      this.issues.push('运行: xcode-select --install');
    }
  }

  checkLinuxCompiler() {
    try {
      const gccVersion = execSync('gcc --version', { encoding: 'utf8' }).trim();
      console.log(`✅ GCC 编译器检查通过: ${gccVersion.split('\n')[0]}`);
    } catch (error) {
      this.issues.push('GCC 编译器未找到，需要安装 build-essential');
      this.issues.push('运行: sudo apt-get install build-essential');
    }
  }

  checkBuildTools() {
    // node-gyp 不需要 make，跳过检查
    console.log('✅ 构建工具检查通过（node-gyp 自动处理）');
  }

  checkNodeGyp() {
    try {
      const nodeGypVersion = execSync('node-gyp --version', { encoding: 'utf8' }).trim();
      console.log(`✅ node-gyp 检查通过: ${nodeGypVersion}`);
    } catch (error) {
      this.warnings.push('node-gyp 未全局安装，npm 会自动安装');
    }
  }

  checkLibRawDependencies() {
    const librawSourceDir = path.join(__dirname, '../deps/LibRaw-Source/LibRaw-0.21.4');
    
    if (!fs.existsSync(librawSourceDir)) {
      this.warnings.push('LibRaw 源码未找到，npm install 时会自动下载');
      return;
    }

    console.log('✅ LibRaw 源码检查通过');
  }

  printResults() {
    console.log('\n📋 检查结果:');
    console.log('=====================================');

    if (this.issues.length === 0 && this.warnings.length === 0) {
      console.log('🎉 所有检查通过！可以正常构建 N-API 模块');
      return;
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告:');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (this.issues.length > 0) {
      console.log('\n❌ 错误:');
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    console.log('\n🔧 解决方案:');
    this.printSolutions();
  }

  printSolutions() {
    switch (this.platform) {
      case 'win32':
        console.log('   Windows 解决方案:');
        console.log('   1. 安装 Visual Studio Build Tools:');
        console.log('      npm install --global windows-build-tools');
        console.log('   2. 或安装 Visual Studio Community');
        console.log('   3. 设置 Python: npm config set python python3');
        break;
      
      case 'darwin':
        console.log('   macOS 解决方案:');
        console.log('   1. 安装 Xcode Command Line Tools:');
        console.log('      xcode-select --install');
        console.log('   2. 或从 App Store 安装 Xcode');
        break;
      
      case 'linux':
        console.log('   Linux 解决方案:');
        console.log('   Ubuntu/Debian:');
        console.log('     sudo apt-get update');
        console.log('     sudo apt-get install build-essential');
        console.log('   CentOS/RHEL:');
        console.log('     sudo yum groupinstall "Development Tools"');
        console.log('   Fedora:');
        console.log('     sudo dnf groupinstall "Development Tools"');
        break;
    }

    console.log('\n   通用解决方案:');
    console.log('   1. 确保 Node.js >= 14.0.0');
    console.log('   2. 安装 Python 2.7 或 3.x');
    console.log('   3. 运行: npm install');
    console.log('   4. 如果失败，运行: npm run rebuild');
    console.log('\n   💡 提示: node-gyp 会自动处理构建工具，无需手动安装 make');
  }
}

// 主程序
if (require.main === module) {
  const checker = new EnvironmentChecker();
  const success = checker.check();
  process.exit(success ? 0 : 1);
}

module.exports = EnvironmentChecker;
