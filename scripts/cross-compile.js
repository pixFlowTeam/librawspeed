const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

class CrossCompiler {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.librawSourceDir = path.join(__dirname, "../deps/LibRaw-Source/LibRaw-0.21.4");
    
    // 交叉编译目标平台配置
    this.targets = {
      'win32': {
        host: 'x86_64-w64-mingw32',
        toolchain: {
          CC: 'x86_64-w64-mingw32-gcc',
          CXX: 'x86_64-w64-mingw32-g++',
          AR: 'x86_64-w64-mingw32-ar',
          RANLIB: 'x86_64-w64-mingw32-ranlib',
          STRIP: 'x86_64-w64-mingw32-strip'
        }
      },
      'darwin': {
        'x64': {
          host: 'x86_64-apple-darwin',
          toolchain: {
            CC: 'clang',
            CXX: 'clang++',
            AR: 'ar',
            RANLIB: 'ranlib',
            STRIP: 'strip'
          }
        },
        'arm64': {
          host: 'aarch64-apple-darwin',
          toolchain: {
            CC: 'aarch64-apple-darwin24-gcc-15',
            CXX: 'aarch64-apple-darwin24-gcc-15',
            AR: 'ar',
            RANLIB: 'ranlib',
            STRIP: 'strip'
          }
        }
      },
      'linux': {
        'x64': {
          host: 'x86_64-linux-musl',
          toolchain: {
            CC: 'x86_64-linux-musl-gcc',
            CXX: 'x86_64-linux-musl-g++',
            AR: 'x86_64-linux-musl-ar',
            RANLIB: 'x86_64-linux-musl-ranlib',
            STRIP: 'x86_64-linux-musl-strip'
          }
        },
        'arm64': {
          host: 'aarch64-linux-musl',
          toolchain: {
            CC: 'aarch64-linux-musl-gcc',
            CXX: 'aarch64-linux-musl-g++',
            AR: 'aarch64-linux-musl-ar',
            RANLIB: 'aarch64-linux-musl-ranlib',
            STRIP: 'aarch64-linux-musl-strip'
          }
        }
      }
    };
  }

  log(message) {
    console.log(`[Cross Compiler] ${message}`);
  }

  // 检查工具链是否可用
  checkToolchain(toolchain) {
    this.log("Checking cross-compile toolchain...");
    
    for (const [key, value] of Object.entries(toolchain)) {
      try {
        // 对于 ar, ranlib, strip 等工具，使用 --version 可能不工作，改用 which 检查
        if (['ar', 'ranlib', 'strip'].includes(value)) {
          execSync(`which ${value}`, { stdio: 'pipe' });
        } else {
          execSync(`${value} --version`, { stdio: 'pipe' });
        }
        this.log(`✅ ${key}: ${value}`);
      } catch (error) {
        this.log(`❌ ${key}: ${value} - Not found`);
        return false;
      }
    }
    return true;
  }

  // 设置交叉编译环境
  setCrossCompileEnv(toolchain) {
    this.log("Setting cross-compile environment...");
    
    for (const [key, value] of Object.entries(toolchain)) {
      process.env[key] = value;
      this.log(`  ${key}=${value}`);
    }
  }

  // 交叉编译 LibRaw
  async crossCompile(targetPlatform, targetArch = null) {
    this.log(`Cross-compiling for ${targetPlatform}${targetArch ? ` (${targetArch})` : ''}...`);
    
    // 获取目标配置
    let target;
    if (targetArch && this.targets[targetPlatform] && this.targets[targetPlatform][targetArch]) {
      target = this.targets[targetPlatform][targetArch];
    } else if (this.targets[targetPlatform] && this.targets[targetPlatform].host) {
      target = this.targets[targetPlatform];
    } else {
      throw new Error(`Unsupported target: ${targetPlatform}${targetArch ? ` (${targetArch})` : ''}`);
    }

    // 检查工具链
    if (!this.checkToolchain(target.toolchain)) {
      throw new Error(`Cross-compile toolchain not available for ${targetPlatform}`);
    }

    // 设置环境
    this.setCrossCompileEnv(target.toolchain);

    // 统一使用 build 目录
    const buildDir = path.join(this.librawSourceDir, 'build');
    
    // 清理之前的构建（只清理当前平台的产物）
    const platformBuildDir = path.join(buildDir, `${targetPlatform}${targetArch ? `-${targetArch}` : ''}`);
    if (fs.existsSync(platformBuildDir)) {
      execSync(`rm -rf ${platformBuildDir}`, { stdio: 'inherit' });
    }

    // 创建构建目录
    fs.mkdirSync(platformBuildDir, { recursive: true });

    // 配置构建
    const configureArgs = [
      `--host=${target.host}`,
      `--prefix=${platformBuildDir}`,
      '--disable-shared',
      '--enable-static',
      '--disable-lcms',
      '--disable-jpeg',
      '--disable-zlib',
      '--disable-openmp',
      '--disable-examples'
    ];

    const configureCmd = `./configure ${configureArgs.join(' ')}`;
    this.log(`Running: ${configureCmd}`);
    
    execSync(configureCmd, {
      cwd: this.librawSourceDir,
      stdio: 'inherit'
    });

    // 编译
    const makeCmd = `make -j${os.cpus().length}`;
    this.log(`Running: ${makeCmd}`);
    
    execSync(makeCmd, {
      cwd: this.librawSourceDir,
      stdio: 'inherit'
    });

    // 安装
    const installCmd = 'make install';
    this.log(`Running: ${installCmd}`);
    
    execSync(installCmd, {
      cwd: this.librawSourceDir,
      stdio: 'inherit'
    });

    this.log(`✅ Cross-compilation completed for ${targetPlatform}${targetArch ? ` (${targetArch})` : ''}`);
    this.log(`Build output: ${platformBuildDir}`);
  }

  // 列出支持的目标平台
  listTargets() {
    this.log("Supported cross-compile targets:");
    
    for (const [platform, config] of Object.entries(this.targets)) {
      if (config.host) {
        this.log(`  ${platform}: ${config.host}`);
      } else {
        for (const [arch, archConfig] of Object.entries(config)) {
          this.log(`  ${platform} (${arch}): ${archConfig.host}`);
        }
      }
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const compiler = new CrossCompiler();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log("Usage: node cross-compile.js <target-platform> [target-arch]");
    console.log("Examples:");
    console.log("  node cross-compile.js win32");
    console.log("  node cross-compile.js darwin arm64");
    console.log("  node cross-compile.js linux x64");
    console.log("");
    compiler.listTargets();
  } else {
    const targetPlatform = args[0];
    const targetArch = args[1] || null;
    
    compiler.crossCompile(targetPlatform, targetArch).catch(error => {
      console.error("Cross-compilation failed:", error.message);
      process.exit(1);
    });
  }
}

module.exports = CrossCompiler;
