# Publication Guide - GitHub & npm

This guide will walk you through publishing your LibRaw Node.js project to GitHub and npm.

## 📋 Pre-Publication Checklist

### ✅ Tests Completed

- [x] All format tests passing (21/21 files)
- [x] Performance benchmarks completed
- [x] Comprehensive test coverage
- [x] Documentation generated

### ✅ Project Structure

- [x] Clean folder structure
- [x] TypeScript definitions included
- [x] Proper package.json configuration
- [x] MIT License included
- [x] CHANGELOG.md created

### ✅ Quality Checks

- [x] No hardcoded paths
- [x] Cross-platform compatibility
- [x] Memory leak free
- [x] Error handling robust
- [x] Performance optimized

## 🚀 Step 1: GitHub Publication

### 1.1 Create GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Click "New Repository"
3. Repository settings:
   - **Name**: `librawspeed`
   - **Description**: `Node.js Native Addon for LibRaw - Process RAW image files with JavaScript`
   - **Visibility**: Public
   - **Initialize**: ❌ Don't add README/License (we have them)

### 1.2 Connect Local Repository to GitHub

```bash
# Add remote origin (replace with your GitHub username)
git remote add origin https://github.com/pixFlowTeam/librawspeed.git

# Verify remote
git remote -v

# Push to GitHub
git push -u origin main
```

### 1.3 Verify GitHub Setup

Check your repository includes:

- ✅ All source files
- ✅ README.md with badges
- ✅ LICENSE file
- ✅ CHANGELOG.md
- ✅ Complete documentation

### 1.4 Setup Repository Features

1. **Enable Issues**: Settings → Features → Issues ✅
2. **Enable Discussions**: Settings → Features → Discussions ✅
3. **Add Topics**: About section → Add topics:
   - `libraw`, `nodejs`, `raw-images`, `native-addon`, `photography`, `metadata`, `exif`

## 📦 Step 2: npm Publication

### 2.1 Update Package Information

Update `package.json` with your details:

```bash
# Update author information
npm config set init-author-name "Bao LE"
npm config set init-author-email "bao.lq.it@gmail.com"
npm config set init-author-url "https://github.com/pixFlowTeam"
```

Edit `package.json`:

```json
{
  "author": "Bao LE <bao.lq.it@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/pixFlowTeam/librawspeed.git"
  },
  "bugs": {
    "url": "https://github.com/pixFlowTeam/librawspeed/issues"
  },
  "homepage": "https://github.com/pixFlowTeam/librawspeed#readme"
}
```

### 2.2 Pre-Publication Tests

```bash
# Run comprehensive tests
npm test

# Check package contents
npm run publish:dry

# Verify all files are included
npm pack --dry-run
```

### 2.3 npm Account Setup

```bash
# Login to npm (create account if needed)
npm login

# Verify login
npm whoami
```

### 2.4 Publish to npm

```bash
# Final pre-publish check
npm run prepublishOnly

# Publish (first time)
npm publish

# If name is taken, try scoped package:
# npm publish --access public
```

### 2.5 Verify Publication

1. Check package page: `https://www.npmjs.com/package/librawspeed`
2. Test installation: `npm install librawspeed`
3. Update README badges with real npm stats

## 📈 Step 3: Post-Publication Setup

### 3.1 Update Badges

Replace placeholder badges in README.md:

```markdown
[![npm version](https://badge.fury.io/js/librawspeed.svg)](https://www.npmjs.com/package/librawspeed)
[![Downloads](https://img.shields.io/npm/dm/librawspeed.svg)](https://www.npmjs.com/package/librawspeed)
```

### 3.2 Add GitHub Release

```bash
# Create and push a tag
git tag v0.1.34-poc
git push origin v0.1.34-poc
```

Then create release on GitHub:

1. Go to repository → Releases → Create new release
2. Tag: `v0.1.34-poc`
3. Title: `LibRaw Node.js v0.1.34-poc - Initial Release`
4. Description: Copy from CHANGELOG.md

### 3.3 Documentation Website (Optional)

Consider setting up GitHub Pages:

1. Repository → Settings → Pages
2. Source: Deploy from branch `main` `/docs` folder
3. Custom domain (optional)

## 🔄 Step 4: Upgrading LibRaw

When LibRaw releases new versions:

### 4.1 Check for Updates

```bash
npm run upgrade:libraw
```

### 4.2 Manual Upgrade Process

1. **Download New LibRaw**: Visit [LibRaw Downloads](https://www.libraw.org/download)

2. **Backup Current Version**:

   ```bash
   xcopy deps deps-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2% /E /I /H
   ```

3. **Replace Library Files**:

   - Extract new `LibRaw-X.X.X-Win64.zip`
   - Replace `deps/LibRaw-Win64/` contents
   - Ensure all required files are present

4. **Update Build Configuration** (if needed):

   ```json
   // binding.gyp - update paths if LibRaw structure changed
   ```

5. **Rebuild and Test**:

   ```bash
   npm run clean
   npm run build
   npm test
   ```

6. **Update Documentation**:

   ```bash
   npm run docs:generate
   ```

7. **Publish Update**:
   ```bash
   npm version patch  # or minor/major
   npm publish
   git push --tags
   ```

## 🐛 Troubleshooting

### Build Issues

**Error: Python not found**

```bash
npm config set python python3
# or install Python 3.x
```

**Error: Visual Studio not found (Windows)**

```bash
npm install --global windows-build-tools
```

**Error: node-gyp failed**

```bash
npm install --global node-gyp
node-gyp configure
```

### Publishing Issues

**Error: Package name already exists**

- Use scoped package: `@pixflowteam/librawspeed`
- Choose different name: `librawspeedjs`, `node-libraw`

**Error: Not authorized**

```bash
npm logout
npm login
```

**Error: 2FA required**

```bash
npm publish --otp=123456
```

## 📊 Success Metrics

After publication, monitor:

### GitHub Metrics

- ⭐ Stars and forks
- 🐛 Issues and discussions
- 📈 Traffic and clones
- 🤝 Contributors

### npm Metrics

- 📦 Download counts
- 🔄 Version adoption
- 💬 Community feedback
- 🔍 Search ranking

### Usage Analytics

- 📧 Support requests
- 📝 Blog mentions
- 🎯 Use cases
- 🚀 Performance feedback

## 🎯 Next Steps

1. **Community Building**:

   - Share on social media
   - Post in relevant forums
   - Write blog posts
   - Create video tutorials

2. **Feature Development**:

   - Gather user feedback
   - Plan v2.0 features
   - Implement full image decoding
   - Add batch processing

3. **Maintenance**:
   - Regular LibRaw updates
   - Security patches
   - Performance improvements
   - Bug fixes

## 📞 Support Channels

Set up these support channels:

- 📧 Email: bao.lq.it@gmail.com
- 🐛 GitHub Issues: Bug reports and feature requests
- 💬 GitHub Discussions: Community support
- 📖 Documentation: Wiki or docs site
- 🐦 Social Media: Updates and announcements

---

**Congratulations! Your LibRaw Node.js project is ready for the world! 🎉**

Remember to:

- Keep documentation updated
- Respond to community feedback
- Maintain regular releases
- Monitor security advisories
