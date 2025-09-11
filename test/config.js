const path = require('path');

// 统一的文件路径配置
const config = {
    // RAW 样本文件目录
    rawSamplesDir: path.join(__dirname, "..", "raw-samples-repo"),
    
    // 输出目录
    outputDir: path.join(__dirname, "..", "output"),
    
    // 各种格式的 RAW 文件路径
    rawFiles: {
        // ARW 文件
        sonyA700: path.join(__dirname, "..", "raw-samples-repo", "ARW", "RAW_SONY_A700.ARW"),
        sonyILCE7M4: path.join(__dirname, "..", "raw-samples-repo", "ARW", "DSC02975.ARW"),
        
        // NEF 文件
        nikonD90: path.join(__dirname, "..", "raw-samples-repo", "NEF", "RAW_NIKON_D90.NEF"),
        
        // RW2 文件
        panasonicG1: path.join(__dirname, "..", "raw-samples-repo", "RW2", "RAW_PANASONIC_G1.RW2"),
        
        // CR2 文件（如果有的话）
        canon: path.join(__dirname, "..", "raw-samples-repo", "CR2"),
        
        // DNG 文件（如果有的话）
        dng: path.join(__dirname, "..", "raw-samples-repo", "DNG"),
        
        // PEF 文件（如果有的话）
        pentax: path.join(__dirname, "..", "raw-samples-repo", "PEF")
    },
    
    // 获取所有可用的 RAW 文件
    getAllRawFiles: function() {
        const files = [];
        Object.keys(this.rawFiles).forEach(key => {
            const filePath = this.rawFiles[key];
            if (filePath.endsWith('.ARW') || filePath.endsWith('.NEF') || filePath.endsWith('.RW2')) {
                files.push({
                    name: key,
                    path: filePath,
                    format: path.extname(filePath).toUpperCase()
                });
            }
        });
        return files;
    },
    
    // 获取指定格式的 RAW 文件
    getRawFilesByFormat: function(format) {
        const files = [];
        Object.keys(this.rawFiles).forEach(key => {
            const filePath = this.rawFiles[key];
            if (filePath.endsWith(format.toUpperCase())) {
                files.push({
                    name: key,
                    path: filePath,
                    format: format.toUpperCase()
                });
            }
        });
        return files;
    },
    
    // 检查文件是否存在
    checkFileExists: function(filePath) {
        const fs = require('fs');
        return fs.existsSync(filePath);
    },
    
    // 获取文件信息
    getFileInfo: function(filePath) {
        const fs = require('fs');
        if (!this.checkFileExists(filePath)) {
            return null;
        }
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            sizeMB: (stats.size / 1024 / 1024).toFixed(2),
            modified: stats.mtime
        };
    }
};

module.exports = config;
