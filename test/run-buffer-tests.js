const path = require("path");
const fs = require("fs");

/**
 * 所有缓冲区创建测试的测试运行器
 * 运行新缓冲区 API 方法的综合测试
 */

// 导入测试模块
const { runAllBufferCreationTests } = require("./buffer-creation.test.js");
const { runEdgeCaseTests } = require("./buffer-edge-cases.test.js");
const { quickBufferTest } = require("./quick-buffer-verification.js");

// 控制台输出的颜色代码
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * 检查测试环境是否就绪
 */
function checkTestEnvironment() {
  const sampleImagesDir = path.join(__dirname, "..", "raw-samples-repo");

  console.log(colorize("🔍 Checking test environment...", "cyan"));

  if (!fs.existsSync(sampleImagesDir)) {
    console.log(
      colorize(
        `❌ Sample images directory not found: ${sampleImagesDir}`,
        "red"
      )
    );
    return false;
  }

  const rawExtensions = [
    ".cr2",
    ".cr3",
    ".nef",
    ".arw",
    ".raf",
    ".rw2",
    ".dng",
  ];
  const files = fs.readdirSync(sampleImagesDir);
  const rawFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return rawExtensions.includes(ext);
  });

  if (rawFiles.length === 0) {
    console.log(colorize("❌ No RAW image files found for testing", "red"));
    console.log(
      colorize(`   Please add some RAW files to: ${sampleImagesDir}`, "yellow")
    );
    console.log(
      colorize(`   Supported formats: ${rawExtensions.join(", ")}`, "yellow")
    );
    return false;
  }

  console.log(
    colorize(`✅ Found ${rawFiles.length} RAW file(s) for testing:`, "green")
  );
  rawFiles.slice(0, 3).forEach((file) => {
    console.log(colorize(`   • ${file}`, "green"));
  });
  if (rawFiles.length > 3) {
    console.log(colorize(`   ... and ${rawFiles.length - 3} more`, "green"));
  }

  return true;
}

/**
 * 运行快速验证测试
 */
async function runQuickTest() {
  console.log(colorize("\n🚀 运行快速验证测试", "bright"));
  console.log("=".repeat(60));

  try {
    await quickBufferTest();
    console.log(colorize("✅ 快速测试成功完成", "green"));
    return true;
  } catch (error) {
    console.log(colorize(`❌ 快速测试失败: ${error.message}`, "red"));
    return false;
  }
}

/**
 * 运行综合测试
 */
async function runComprehensiveTests() {
  console.log(colorize("\n🧪 运行综合缓冲区测试", "bright"));
  console.log("=".repeat(60));

  try {
    const success = await runAllBufferCreationTests();
    if (success) {
      console.log(
        colorize("✅ 综合测试成功完成", "green")
      );
    } else {
      console.log(colorize("⚠️ 部分综合测试失败", "yellow"));
    }
    return success;
  } catch (error) {
    console.log(
      colorize(`❌ 综合测试崩溃: ${error.message}`, "red")
    );
    return false;
  }
}

/**
 * 运行边界情况测试
 */
async function runEdgeCases() {
  console.log(colorize("\n🔥 运行边界情况测试", "bright"));
  console.log("=".repeat(60));

  try {
    const success = await runEdgeCaseTests();
    if (success) {
      console.log(
        colorize("✅ 边界情况测试成功完成", "green")
      );
    } else {
      console.log(colorize("⚠️ 部分边界情况测试失败", "yellow"));
    }
    return success;
  } catch (error) {
    console.log(
      colorize(`❌ 边界情况测试崩溃: ${error.message}`, "red")
    );
    return false;
  }
}

/**
 * 主测试运行器
 */
async function runAllTests(options = {}) {
  const startTime = Date.now();

  console.log(colorize("🧪 LibRaw 缓冲区 API 测试套件", "bright"));
  console.log(colorize("=====================================", "bright"));
  console.log(
    colorize(`📅 开始时间: ${new Date().toLocaleString()}`, "cyan")
  );

  // 检查环境
  if (!checkTestEnvironment()) {
    console.log(
      colorize("\n❌ 测试环境检查失败。中止测试。", "red")
    );
    return false;
  }

  const results = {
    quick: false,
    comprehensive: false,
    edgeCase: false,
  };

  // 根据选项运行测试
  if (options.quick !== false) {
    results.quick = await runQuickTest();

    // 如果快速测试失败，除非强制运行，否则不运行其他测试
    if (!results.quick && !options.force) {
      console.log(
        colorize("\n⚠️ 快速测试失败。跳过剩余测试。", "yellow")
      );
      console.log(
        colorize("   使用 --force 强制运行所有测试。", "yellow")
      );
      return false;
    }
  }

  if (options.comprehensive !== false) {
    results.comprehensive = await runComprehensiveTests();
  }

  if (options.edgeCase !== false) {
    results.edgeCase = await runEdgeCases();
  }

  // 总结
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log(colorize("\n📊 测试套件总结", "bright"));
  console.log("=".repeat(60));

  const testResults = Object.entries(results).filter(
    ([_, ran]) => ran !== undefined
  );
  const passedTests = testResults.filter(([_, passed]) => passed).length;
  const totalTests = testResults.length;

  testResults.forEach(([testName, passed]) => {
    const status = passed ? "✅ 通过" : "❌ 失败";
    const color = passed ? "green" : "red";
    console.log(
      colorize(
        `${status} ${
          testName.charAt(0).toUpperCase() + testName.slice(1)
        } 测试`,
        color
      )
    );
  });

  console.log("");
  console.log(
    colorize(
      `测试通过: ${passedTests}/${totalTests}`,
      passedTests === totalTests ? "green" : "yellow"
    )
  );
  console.log(
    colorize(`总时间: ${(totalTime / 1000).toFixed(1)}s`, "cyan")
  );

  const overallSuccess = passedTests === totalTests;

  if (overallSuccess) {
    console.log(
      colorize("\n🎉 所有缓冲区 API 测试成功通过！", "green")
    );
    console.log(
      colorize(
        "   您的缓冲区创建方法工作正常。",
        "green"
      )
    );
  } else {
    console.log(
      colorize(
        `\n⚠️ ${totalTests - passedTests} 个测试套件有问题。`,
        "yellow"
      )
    );
    console.log(colorize("   请查看上面的输出了解详情。", "yellow"));
  }

  // 显示输出目录
  const outputDirs = [
    "test/buffer-output",
    "test/quick-test-output",
    "test/buffer-integration-output",
  ].map((dir) => path.join(__dirname, "..", dir));

  const existingDirs = outputDirs.filter((dir) => fs.existsSync(dir));
  if (existingDirs.length > 0) {
    console.log(colorize("\n📁 测试输出文件已保存到:", "cyan"));
    existingDirs.forEach((dir) => {
      console.log(colorize(`   ${dir}`, "cyan"));
    });
  }

  return overallSuccess;
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    quick: true,
    comprehensive: true,
    edgeCase: true,
    force: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "--quick-only":
        options.comprehensive = false;
        options.edgeCase = false;
        break;
      case "--no-quick":
        options.quick = false;
        break;
      case "--comprehensive-only":
        options.quick = false;
        options.edgeCase = false;
        break;
      case "--edge-only":
        options.quick = false;
        options.comprehensive = false;
        break;
      case "--force":
        options.force = true;
        break;
      case "--help":
      case "-h":
        console.log(colorize("LibRaw 缓冲区 API 测试运行器", "bright"));
        console.log("");
        console.log("用法: node run-buffer-tests.js [选项]");
        console.log("");
        console.log("选项:");
        console.log("  --quick-only      仅运行快速验证测试");
        console.log("  --comprehensive-only  仅运行综合测试");
        console.log("  --edge-only       仅运行边界情况测试");
        console.log("  --no-quick        跳过快速验证测试");
        console.log(
          "  --force           即使快速测试失败也继续运行测试"
        );
        console.log("  --help, -h        显示此帮助信息");
        console.log("");
        console.log("默认情况下，所有测试按顺序运行。");
        process.exit(0);
        break;
      default:
        console.log(colorize(`未知选项: ${arg}`, "red"));
        console.log(colorize("使用 --help 查看用法信息", "yellow"));
        process.exit(1);
    }
  }

  return options;
}

// 主执行
if (require.main === module) {
  const options = parseArgs();

  runAllTests(options)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(colorize(`测试运行器崩溃: ${error.message}`, "red"));
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  runQuickTest,
  runComprehensiveTests,
  runEdgeCases,
  checkTestEnvironment,
};
