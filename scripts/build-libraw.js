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
    console.log(`[LibRaw Builder] ${message}`);
  }

  async ensureDirectories() {
    const platformBuildDir = path.join(this.buildDir, this.getPlatformName());
    if (!fs.existsSync(platformBuildDir)) {
      fs.mkdirSync(platformBuildDir, { recursive: true });
      this.log(`Created directory: ${platformBuildDir}`);
    }
  }

  async build() {
    this.log("Starting LibRaw build...");
    
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

      this.log("Configuring LibRaw...");
      execSync(`./configure ${configureArgs.join(' ')}`, {
        cwd: this.librawSourceDir,
        stdio: 'inherit'
      });

      this.log("Building LibRaw...");
      execSync('make -j4', {
        cwd: this.librawSourceDir,
        stdio: 'inherit'
      });

      this.log("Installing LibRaw...");
      execSync('make install', {
        cwd: this.librawSourceDir,
        stdio: 'inherit'
      });

      this.log("LibRaw build completed successfully!");
      this.log(`Build output: ${platformBuildDir}`);
      
    } catch (error) {
      this.log(`Build failed: ${error.message}`);
      throw error;
    }
  }

  checkBuildTools() {
    try {
      // 检查基本构建工具
      execSync('which make', { stdio: 'ignore' });
      execSync('which gcc', { stdio: 'ignore' });
      execSync('which g++', { stdio: 'ignore' });
      this.log("Build tools found");
    } catch (error) {
      throw new Error(`Required build tools not found for ${this.platform}`);
    }
  }
}

// 主执行逻辑
async function main() {
  const builder = new LibRawBuilder();
  try {
    await builder.build();
  } catch (error) {
    console.error(`LibRaw build failed: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = LibRawBuilder;