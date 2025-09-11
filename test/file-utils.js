const fs = require('fs');
const path = require('path');

// 通用的文件搜索工具
class FileUtils {
    constructor() {
        this.rawSamplesDir = path.join(__dirname, "..", "raw-samples-repo");
    }

    // 递归搜索 RAW 文件
    findRawFiles(extensions = ['.arw', '.nef', '.rw2', '.cr2', '.dng', '.raf']) {
        const files = [];
        
        const searchDir = (dir) => {
            try {
                const items = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(dir, item.name);
                    
                    if (item.isDirectory()) {
                        // 递归搜索子目录
                        searchDir(fullPath);
                    } else if (item.isFile()) {
                        // 检查文件扩展名
                        const ext = path.extname(item.name).toLowerCase();
                        if (extensions.includes(ext)) {
                            files.push({
                                name: item.name,
                                path: fullPath,
                                relativePath: path.relative(this.rawSamplesDir, fullPath),
                                extension: ext,
                                size: fs.statSync(fullPath).size,
                                sizeMB: (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2)
                            });
                        }
                    }
                }
            } catch (error) {
                console.warn(`Warning: Cannot read directory ${dir}:`, error.message);
            }
        };

        searchDir(this.rawSamplesDir);
        return files;
    }

    // 按格式搜索 RAW 文件
    findRawFilesByFormat(format) {
        const extensions = {
            'arw': ['.arw'],
            'nef': ['.nef'],
            'rw2': ['.rw2'],
            'cr2': ['.cr2'],
            'dng': ['.dng'],
            'raf': ['.raf'],
            'sony': ['.arw'],
            'nikon': ['.nef'],
            'panasonic': ['.rw2'],
            'canon': ['.cr2'],
            'fuji': ['.raf']
        };

        const extList = extensions[format.toLowerCase()] || [`.${format.toLowerCase()}`];
        return this.findRawFiles(extList);
    }

    // 获取所有可用的 RAW 文件格式
    getAvailableFormats() {
        const files = this.findRawFiles();
        const formats = new Set();
        
        files.forEach(file => {
            formats.add(file.extension.toUpperCase());
        });
        
        return Array.from(formats).sort();
    }

    // 检查文件是否存在
    fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    // 获取文件信息
    getFileInfo(filePath) {
        if (!this.fileExists(filePath)) {
            return null;
        }
        
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            modified: stats.mtime,
            extension: path.extname(filePath).toLowerCase(),
            name: path.basename(filePath)
        };
    }

    // 创建输出目录
    ensureOutputDir() {
        const outputDir = path.join(__dirname, "..", "output");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        return outputDir;
    }

    // 生成输出文件名
    generateOutputFileName(inputPath, suffix = 'converted', extension = '.jpg') {
        const basename = path.basename(inputPath, path.extname(inputPath));
        return `${basename}_${suffix}${extension}`;
    }
}

module.exports = new FileUtils();
