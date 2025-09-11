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
      console.warn("Could not determine current LibRaw version");
    }
    return null;
  }

  async checkLatestVersion() {
    return new Promise((resolve, reject) => {
      console.log("🔍 Checking for latest LibRaw version...");

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
              reject(new Error("Could not find version information"));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on("error", reject);
      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error("Request timeout"));
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
    const guide = `# LibRaw Upgrade Guide

## Upgrading from ${this.currentVersion || "current"} to ${newVersion}

### Automatic Upgrade (Recommended)

Run the upgrade script:
\`\`\`bash
npm run upgrade:libraw
\`\`\`

### Manual Upgrade Steps

#### 1. Download LibRaw ${newVersion}

Visit: https://www.libraw.org/download

Download this file:
- \`LibRaw-${newVersion}.tar.gz\` (source code for all platforms)

#### 2. Backup Current Installation

\`\`\`bash
# Backup current deps folder
cp -r deps deps-backup-$(date +%Y%m%d)
\`\`\`

#### 3. Replace Library Files

**All Platforms:**
\`\`\`bash
# Extract and compile from source
tar -xzf LibRaw-${newVersion}.tar.gz
cd LibRaw-${newVersion}

# Configure for the project
./configure --prefix=../deps/LibRaw-Source/LibRaw-${newVersion} --enable-shared --disable-static

# Compile
make -j$(nproc)

# Install
make install

# Build the native addon
cd ..
npm run build
\`\`\`

#### 4. Update Build Configuration

Check \`binding.gyp\` for version-specific changes:

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

#### 5. Rebuild Native Addon

\`\`\`bash
npm run clean
npm run build
\`\`\`

#### 6. Test Compatibility

\`\`\`bash
# Run comprehensive tests
npm test

# Test with your sample images
npm run test:formats

# Performance regression check
npm run test:performance
\`\`\`

#### 7. Update Documentation

\`\`\`bash
# Update supported formats list
npm run docs:generate

# Update version info in package.json
# Update CHANGELOG.md with new features
\`\`\`

### Potential Breaking Changes

#### API Changes
Check LibRaw changelog for API modifications:
- New metadata fields may be available
- Some deprecated functions might be removed
- New camera support added

#### Performance Changes
- Processing speed may improve or change
- Memory usage patterns might differ
- New optimization flags available

#### Compatibility Changes
- New camera models supported
- Some older formats might be deprecated
- Color profile handling improvements

### Version-Specific Notes

#### LibRaw ${newVersion}
${this.getVersionNotes(newVersion)}

### Troubleshooting

#### Build Errors
\`\`\`bash
# Clear all build artifacts
npm run clean
rm -rf node_modules
npm install
npm run build
\`\`\`

#### Runtime Errors
\`\`\`bash
# Check library loading
node -e "console.log(require('./lib/index.js'))"

# Verify DLL/SO dependencies
# Windows: use Dependency Walker
# Linux: ldd build/Release/libraw_wrapper.node
# macOS: otool -L build/Release/libraw_wrapper.node
\`\`\`

#### Test Failures
\`\`\`bash
# Test individual formats
node test/test.js sample-images/test.nef

# Check for new metadata fields
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

### Rollback Procedure

If the upgrade fails:

\`\`\`bash
# Restore backup
rm -rf deps
mv deps-backup-YYYYMMDD deps

# Rebuild with old version
npm run clean
npm run build
npm test
\`\`\`

### Post-Upgrade Checklist

- [ ] All tests pass
- [ ] Performance is acceptable
- [ ] Sample images process correctly
- [ ] New camera formats work (if any)
- [ ] Documentation is updated
- [ ] CHANGELOG.md reflects changes
- [ ] Package version bumped appropriately

### Publishing Updated Package

\`\`\`bash
# Update version
npm version patch  # or minor/major based on changes

# Test before publishing
npm run prepublishOnly

# Publish to npm
npm publish
\`\`\`
`;

    return guide;
  }

  getVersionNotes(version) {
    // This would ideally fetch real release notes
    return `Check the official LibRaw changelog at:
https://github.com/LibRaw/LibRaw/releases/tag/${version}

Common improvements in newer versions:
- Support for latest camera models
- Performance optimizations
- Bug fixes in metadata extraction
- Enhanced color profile handling
- Security updates`;
  }

  async performUpgrade(targetVersion) {
    console.log(`🚀 Starting upgrade to LibRaw ${targetVersion}...`);

    try {
      // Create backup
      const backupDir = `deps-backup-${Date.now()}`;
      console.log("📦 Creating backup...");
      execSync(`xcopy deps ${backupDir} /E /I /H`, { cwd: __dirname });

      // Generate upgrade guide
      const guide = this.generateUpgradeGuide(targetVersion);
      fs.writeFileSync(path.join(__dirname, "../UPGRADE.md"), guide);
      console.log("✅ Generated UPGRADE.md");

      console.log(`
📋 Upgrade prepared for LibRaw ${targetVersion}

Next steps:
1. Download LibRaw ${targetVersion} from https://www.libraw.org/download
2. Follow the instructions in UPGRADE.md
3. Test thoroughly before deploying

The current installation has been backed up to: ${backupDir}
`);
    } catch (error) {
      console.error("❌ Upgrade preparation failed:", error.message);
      process.exit(1);
    }
  }

  async run() {
    console.log("🔄 LibRaw Upgrade Assistant");
    console.log("===========================\n");

    console.log(`Current version: ${this.currentVersion || "Unknown"}`);

    try {
      const latestVersion = await this.checkLatestVersion();
      console.log(`Latest version: ${latestVersion}`);

      if (this.currentVersion === latestVersion) {
        console.log("✅ You are already running the latest version!");
        return;
      }

      if (this.compareVersions(latestVersion, this.currentVersion) > 0) {
        console.log(`📢 New version available: ${latestVersion}`);
        await this.performUpgrade(latestVersion);
      } else {
        console.log(
          "ℹ️  Your version appears to be newer than the latest release"
        );
      }
    } catch (error) {
      console.error("❌ Failed to check for updates:", error.message);
      console.log("\n📖 Generating manual upgrade guide...");
      const guide = this.generateUpgradeGuide("X.X.X");
      fs.writeFileSync(path.join(__dirname, "../UPGRADE.md"), guide);
      console.log("✅ Manual upgrade guide created as UPGRADE.md");
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
