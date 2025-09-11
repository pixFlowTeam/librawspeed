const LibRaw = require('../lib/index.js');
const fs = require('fs');
const path = require('path');

// 检查文件是否为真正的 RAW 格式
function isRealRawFile(filePath) {
    try {
        const buffer = fs.readFileSync(filePath, { start: 0, end: 16 });
        const hex = buffer.toString('hex');
        
        // 检查常见的 RAW 文件头
        const rawHeaders = [
            '49492a00', // TIFF little-endian
            '4d4d002a', // TIFF big-endian
            'ffd8ffe1', // JPEG with EXIF (不是真正的RAW)
            'ffd8ffe0', // JPEG JFIF
            'ffd8ffdb', // JPEG
            '52494646', // RIFF (可能包含RAW数据)
            '00000100', // 某些RAW格式
            '000001a0', // 某些RAW格式
        ];
        
        // 如果以 JPEG 头开始，则不是 RAW
        if (hex.startsWith('ffd8')) {
            return false;
        }
        
        // 检查是否为 TIFF 格式（可能是 RAW）
        if (hex.startsWith('49492a00') || hex.startsWith('4d4d002a')) {
            return true;
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

// 检查文件类型
function getFileType(filePath) {
    try {
        const buffer = fs.readFileSync(filePath, { start: 0, end: 16 });
        const hex = buffer.toString('hex');
        
        if (hex.startsWith('ffd8')) {
            return 'JPEG';
        } else if (hex.startsWith('49492a00') || hex.startsWith('4d4d002a')) {
            return 'TIFF/RAW';
        } else {
            return 'Unknown';
        }
    } catch (error) {
        return 'Error';
    }
}

async function testRealRawFiles() {
    console.log('=== 真正的 RAW 文件测试 ===');
    console.log('');
    
    const rawSamplesDir = '/Users/fuguoqiang/Desktop/LibRawSpeed/raw-samples-repo';
    const allFiles = [];
    
    // 递归搜索所有文件
    function searchFiles(dir) {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory()) {
                    searchFiles(fullPath);
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (['.arw', '.nef', '.rw2', '.cr2', '.dng', '.raf'].includes(ext)) {
                        allFiles.push(fullPath);
                    }
                }
            }
        } catch (error) {
            console.warn(`Warning: Cannot read directory ${dir}:`, error.message);
        }
    }
    
    searchFiles(rawSamplesDir);
    
    console.log(`🔍 找到 ${allFiles.length} 个可能的 RAW 文件：`);
    console.log('');
    
    const results = [];
    
    for (const filePath of allFiles) {
        const fileName = path.basename(filePath);
        const fileType = getFileType(filePath);
        const isRaw = isRealRawFile(filePath);
        
        console.log(`📁 ${fileName}`);
        console.log(`   类型: ${fileType}`);
        console.log(`   是否RAW: ${isRaw ? '✅ 是' : '❌ 否'}`);
        
        if (isRaw) {
            console.log(`   🧪 测试转换...`);
            try {
                const libraw = new LibRaw();
                const loadResult = await libraw.loadFile(filePath);
                console.log(`   ✅ 加载成功: ${loadResult}`);
                libraw.close();
                results.push({ file: fileName, success: true, type: fileType });
            } catch (error) {
                console.log(`   ❌ 转换失败: ${error.message}`);
                results.push({ file: fileName, success: false, type: fileType, error: error.message });
            }
        } else {
            results.push({ file: fileName, success: false, type: fileType, error: 'Not a real RAW file' });
        }
        console.log('');
    }
    
    console.log('=== 测试结果总结 ===');
    console.log('');
    const successCount = results.filter(r => r.success).length;
    console.log(`📊 总计: ${successCount}/${results.length} 个文件转换成功`);
    console.log('');
    
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.file}: ${result.success ? '成功' : result.error}`);
    });
}

testRealRawFiles().catch(console.error);
