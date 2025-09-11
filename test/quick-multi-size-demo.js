const LibRaw = require("../lib/index");
const path = require("path");
const fs = require("fs");

async function quickMultiSizeDemo() {
  const sampleDir = path.join(__dirname, "..", "raw-samples-repo");
  const outputDir = path.join(__dirname, "output", "multi-size-demo");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 查找测试文件
  const testFiles = fs
    .readdirSync(sampleDir, { withFileTypes: true })
    .filter((file) =>
      [".cr3", ".nef", ".arw"].includes(path.extname(file).toLowerCase())
    )
    .slice(0, 1);

  if (testFiles.length === 0) {
    console.log("未找到用于演示的 RAW 文件");
    return;
  }

  const testFile = path.join(sampleDir, testFiles[0]);
  const fileName = path.basename(testFile, path.extname(testFile));

  console.log(`🚀 多尺寸 JPEG 演示: ${fileName}`);

  const processor = new LibRaw();
  await processor.loadFile(testFile);

  const metadata = await processor.getMetadata();
  console.log(`原始: ${metadata.width}x${metadata.height}`);

  // 定义一些不同的尺寸
  const sizes = [
    { name: "thumb", width: 200, height: 150, quality: 85 },
    { name: "web", width: 800, height: 600, quality: 85 },
    { name: "hd", width: 1920, height: 1080, quality: 85 },
    { name: "full", quality: 95 },
  ];

  const results = [];

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `${fileName}_${size.name}.jpg`);
    const startTime = Date.now();

    const options = {
      quality: size.quality,
      fastMode: true,
      effort: 3,
    };

    if (size.width) options.width = size.width;
    if (size.height) options.height = size.height;

    const result = await processor.convertToJPEG(outputPath, options);
    const processTime = Date.now() - startTime;

    const stats = fs.statSync(outputPath);
    const dims = result.metadata.outputDimensions;

    results.push({
      name: size.name,
      size: `${dims.width}x${dims.height}`,
      fileSize: (stats.size / 1024).toFixed(1) + "KB",
      time: processTime + "ms",
    });

    console.log(
      `✓ ${size.name}: ${dims.width}x${dims.height}, ${(
        stats.size / 1024
      ).toFixed(1)}KB (${processTime}ms)`
    );
  }

  await processor.close();

  console.log("\n📊 总结:");
  results.forEach((r) => {
    console.log(`  ${r.name}: ${r.size} → ${r.fileSize} (${r.time})`);
  });

  console.log(`\n📁 文件已保存到: ${outputDir}`);
}

quickMultiSizeDemo().catch(console.error);
