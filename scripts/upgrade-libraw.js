const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

class LibRawUpgrader {
  constructor() {
    this.depsDir = path.join(__dirname, "../deps");
    this.currentVersion = this.getCurrentVersion();
  }

  getCurrentVersion() {
    try {
      const librawDir = fs
        .readdirSync(this.depsDir)
        .find((dir) => dir.startsWith("LibRaw-") && dir.includes("Source"));

      if (librawDir) {
        const match = librawDir.match(/LibRaw-(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
      }
    } catch (error) {
      console.warn("无法确定当前 LibRaw 版本");
    }
    return null;
  }

  async checkLatestVersion() {
    return new Promise((resolve, reject) => {
      console.log("🔍 检查最新 LibRaw 版本...");

      const options = {
        hostname: "www.libraw.org",
        path: "/download",
        method: "GET",
        headers: {
          "User-Agent": "librawspeed-upgrader",
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            // Look for version pattern in the HTML
            const versionMatch = data.match(/LibRaw-(\d+\.\d+\.\d+)/g);
            if (versionMatch) {
              const versions = versionMatch
                .map((v) => v.replace("LibRaw-", ""))
                .sort((a, b) => this.compareVersions(b, a));
              resolve(versions[0]);
            } else {
              reject(new Error("无法找到版本信息"));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", reject);
      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error("请求超时"));
      });
      req.end();
    });
  }

  compareVersions(a, b) {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    return 0;
  }

  generateUpgradeGuide(newVersion) {
    const guide = `# LibRaw 升级指南

## 从 ${this.currentVersion || "当前"} 升级到 ${newVersion}

### 自动升级（推荐）

运行升级脚本:
\`\`\`bash
npm run upgrade:libraw
\`\`\`

### 手动升级步骤

#### 1. 下载 LibRaw ${newVersion}

访问: https://www.libraw.org/download

下载此文件:
- \`LibRaw-${newVersion}.tar.gz\` (所有平台的源代码)

#### 2. 备份当前安装

\`\`\`bash
# 备份当前 deps 文件夹
cp -r deps deps-backup-$(date +%Y%m%d)
\`\`\`

#### 3. 替换库文件

**所有平台:**
\`\`\`bash
# 从源代码提取和编译
tar -xzf LibRaw-${newVersion}.tar.gz
cd LibRaw-${newVersion}

# 为项目配置
./configure --prefix=../deps/LibRaw-Source/LibRaw-${newVersion} --enable-shared --disable-static

# 编译
make -j$(nproc)

# 安装
make install

# 构建原生插件
cd ..
npm run build
\`\`\`

#### 4. 更新构建配置

检查 \`binding.gyp\` 中的版本特定更改:

\`\`\`json
{
  "target_name": "libraw_addon",
  "sources": ["src/addon.cpp", "src/libraw_wrapper.cpp"],
  "include_dirs": [
    "<!(node -e \\"console.log(require('node-addon-api').include)\\")",
    "deps/LibRaw-Source/LibRaw-${newVersion}/libraw"
  ],
  "conditions": [
    ["OS=='win'", {
      "libraries": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-${newVersion}/lib/libraw.lib"],
      "copies": [{
        "destination": "<(module_root_dir)/build/Release/",
        "files": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-${newVersion}/bin/libraw.dll"]
      }]
    }],
    ["OS=='mac'", {
      "libraries": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-${newVersion}/lib/libraw.dylib"]
    }],
    ["OS=='linux'", {
      "libraries": ["<(module_root_dir)/deps/LibRaw-Source/LibRaw-${newVersion}/lib/libraw.so"]
    }]
  ]
}
\`\`\`

#### 5. 重新构建原生插件

\`\`\`bash
npm run clean
npm run build
\`\`\`

#### 6. 测试兼容性

\`\`\`bash
# 运行综合测试
npm test

# 使用您的示例图像进行测试
npm run test:formats

# 性能回归检查
npm run test:performance
\`\`\`

#### 7. 更新文档

\`\`\`bash
# 更新支持的格式列表
npm run docs:generate

# 更新 package.json 中的版本信息
# 在 CHANGELOG.md 中更新新功能
\`\`\`

### 潜在的破坏性更改

#### API 更改
检查 LibRaw 更新日志中的 API 修改:
- 可能有新的元数据字段
- 一些已弃用的函数可能被移除
- 添加了新相机支持

#### 性能更改
- 处理速度可能提高或改变
- 内存使用模式可能不同
- 有新的优化标志可用

#### 兼容性更改
- 支持新的相机型号
- 一些较旧的格式可能被弃用
- 颜色配置文件处理改进

### 版本特定说明

#### LibRaw ${newVersion}
${this.getVersionNotes(newVersion)}

### 故障排除

#### 构建错误
\`\`\`bash
# 清除所有构建工件
npm run clean
rm -rf node_modules
npm install
npm run build
\`\`\`

#### 运行时错误
\`\`\`bash
# 检查库加载
node -e "console.log(require('./lib/index.js'))"

# 验证 DLL/SO 依赖项
# Windows: 使用 Dependency Walker
# Linux: ldd build/Release/libraw_wrapper.node
# macOS: otool -L build/Release/libraw_wrapper.node
\`\`\`

#### 测试失败
\`\`\`bash
# 测试单个格式
node test/test.js sample-images/test.nef

# 检查新的元数据字段
node -e "
const LibRaw = require('./lib');
const proc = new LibRaw();
proc.loadFile('sample.nef').then(() => {
  return proc.getMetadata();
}).then(meta => {
  console.log(JSON.stringify(meta, null, 2));
}).catch(console.error);
"
\`\`\`

### 回滚程序

如果升级失败:

\`\`\`bash
# 恢复备份
rm -rf deps
mv deps-backup-YYYYMMDD deps

# 使用旧版本重新构建
npm run clean
npm run build
npm test
\`\`\`

### 升级后检查清单

- [ ] 所有测试通过
- [ ] 性能可接受
- [ ] 示例图像处理正确
- [ ] 新相机格式工作（如果有）
- [ ] 文档已更新
- [ ] CHANGELOG.md 反映更改
- [ ] 包版本适当提升

### 发布更新的包

\`\`\`bash
# 更新版本
npm version patch  # 或根据更改使用 minor/major

# 发布前测试
npm run prepublishOnly

# 发布到 npm
npm publish
\`\`\`
`;

    return guide;
  }

  getVersionNotes(version) {
    // This would ideally fetch real release notes
    return `查看官方 LibRaw 更新日志:
https://github.com/LibRaw/LibRaw/releases/tag/${version}

新版本的常见改进:
- 支持最新的相机型号
- 性能优化
- 元数据提取中的错误修复
- 增强的颜色配置文件处理
- 安全更新`;
  }

  async performUpgrade(targetVersion) {
    console.log(`🚀 开始升级到 LibRaw ${targetVersion}...`);

    try {
      // Create backup
      const backupDir = `deps-backup-${Date.now()}`;
      console.log("📦 创建备份...");
      execSync(`xcopy deps ${backupDir} /E /I /H`, { cwd: __dirname });

      // Generate upgrade guide
      const guide = this.generateUpgradeGuide(targetVersion);
      fs.writeFileSync(path.join(__dirname, "../UPGRADE.md"), guide);
      console.log("✅ 已生成 UPGRADE.md");

      console.log(`
📋 已为 LibRaw ${targetVersion} 准备升级

下一步:
1. 从 https://www.libraw.org/download 下载 LibRaw ${targetVersion}
2. 按照 UPGRADE.md 中的说明操作
3. 部署前彻底测试

当前安装已备份到: ${backupDir}
`);
    } catch (error) {
      console.error("❌ 升级准备失败:", error.message);
      process.exit(1);
    }
  }

  async run() {
    console.log("🔄 LibRaw 升级助手");
    console.log("===========================\n");

    console.log(`当前版本: ${this.currentVersion || "未知"}`);

    try {
      const latestVersion = await this.checkLatestVersion();
      console.log(`最新版本: ${latestVersion}`);

      if (this.currentVersion === latestVersion) {
        console.log("✅ 您已经在运行最新版本!");
        return;
      }

      if (this.compareVersions(latestVersion, this.currentVersion) > 0) {
        console.log(`📢 有新版本可用: ${latestVersion}`);
        await this.performUpgrade(latestVersion);
      } else {
        console.log(
          "ℹ️  您的版本似乎比最新发布版本更新"
        );
      }
    } catch (error) {
      console.error("❌ 检查更新失败:", error.message);
      console.log("\n📖 生成手动升级指南...");
      const guide = this.generateUpgradeGuide("X.X.X");
      fs.writeFileSync(path.join(__dirname, "../UPGRADE.md"), guide);
      console.log("✅ 已创建手动升级指南 UPGRADE.md");
    }
  }
}

// Export the class
module.exports = LibRawUpgrader;

// Run if executed directly
if (require.main === module) {
  const upgrader = new LibRawUpgrader();
  upgrader.run().catch(console.error);
}
