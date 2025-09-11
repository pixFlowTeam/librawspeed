const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

class LibRawBuilder {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.librawSourceDir = path.join(__dirname, "../deps/LibRaw-Source/LibRaw-0.21.4");
    this.buildDir = path.join(this.librawSourceDir, "build");
  }

  getPlatformName() {
    if (this.platform === 'win32') {
      return 'win32';
    } else if (this.platform === 'darwin') {
      return this.arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
    } else if (this.platform === 'linux') {
      return this.arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
    }
    return 'unknown';
  }

  log(message) {
    console.log(`[LibRaw 构建器] ${message}`);
  }

  async ensureDirectories() {
    const platformBuildDir = path.join(this.buildDir, this.getPlatformName());
    if (!fs.existsSync(platformBuildDir)) {
      fs.mkdirSync(platformBuildDir, { recursive: true });
      this.log(`已创建目录: ${platformBuildDir}`);
    }
  }

  async build() {
    this.log("开始 LibRaw 构建...");
    
    try {
      // 确保目录存在
      await this.ensureDirectories();
      
      // 检查构建工具
      this.checkBuildTools();
      
      // 配置构建 - 使用新的统一构建目录
      const platformBuildDir = path.join(this.buildDir, this.getPlatformName());
      const configureArgs = [
        `--prefix=${platformBuildDir}`,
        '--disable-shared',
        '--enable-static',
        '--disable-lcms',      // 禁用 LCMS 颜色管理
        '--disable-jpeg',      // 禁用 JPEG 支持
        '--disable-zlib',      // 禁用 zlib 压缩
        '--disable-openmp',    // 禁用 OpenMP 多线程
        '--disable-examples'   // 禁用示例程序
      ];

      this.log("配置 LibRaw...");
      execSync(`./configure ${configureArgs.join(' ')}`, {
        cwd: this.librawSourceDir,
        stdio: 'inherit'
      });

      this.log("构建 LibRaw...");
      execSync('make -j4', {
        cwd: this.librawSourceDir,
        stdio: 'inherit'
      });

      this.log("安装 LibRaw...");
      execSync('make install', {
        cwd: this.librawSourceDir,
        stdio: 'inherit'
      });

      this.log("LibRaw 构建成功完成!");
      this.log(`构建输出: ${platformBuildDir}`);
      
    } catch (error) {
      this.log(`构建失败: ${error.message}`);
      throw error;
    }
  }

  checkBuildTools() {
    try {
      // 检查基本构建工具
      execSync('which make', { stdio: 'ignore' });
      execSync('which gcc', { stdio: 'ignore' });
      execSync('which g++', { stdio: 'ignore' });
      this.log("找到构建工具");
    } catch (error) {
      throw new Error(`未找到 ${this.platform} 平台所需的构建工具`);
    }
  }
}

// 主执行逻辑
async function main() {
  const builder = new LibRawBuilder();
  try {
    await builder.build();
  } catch (error) {
    console.error(`LibRaw 构建失败: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = LibRawBuilder;