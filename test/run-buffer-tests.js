const path = require("path");
const fs = require("fs");

/**
 * Test runner for all buffer creation tests
 * Runs comprehensive tests for the new buffer API methods
 */

// Import test modules
const { runAllBufferCreationTests } = require("./buffer-creation.test.js");
const { runEdgeCaseTests } = require("./buffer-edge-cases.test.js");
const { quickBufferTest } = require("./quick-buffer-verification.js");

// Color codes for console output
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
 * Check if test environment is ready
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
 * Run quick verification test
 */
async function runQuickTest() {
  console.log(colorize("\n🚀 Running Quick Verification Test", "bright"));
  console.log("=".repeat(60));

  try {
    await quickBufferTest();
    console.log(colorize("✅ Quick test completed successfully", "green"));
    return true;
  } catch (error) {
    console.log(colorize(`❌ Quick test failed: ${error.message}`, "red"));
    return false;
  }
}

/**
 * Run comprehensive tests
 */
async function runComprehensiveTests() {
  console.log(colorize("\n🧪 Running Comprehensive Buffer Tests", "bright"));
  console.log("=".repeat(60));

  try {
    const success = await runAllBufferCreationTests();
    if (success) {
      console.log(
        colorize("✅ Comprehensive tests completed successfully", "green")
      );
    } else {
      console.log(colorize("⚠️ Some comprehensive tests failed", "yellow"));
    }
    return success;
  } catch (error) {
    console.log(
      colorize(`❌ Comprehensive tests crashed: ${error.message}`, "red")
    );
    return false;
  }
}

/**
 * Run edge case tests
 */
async function runEdgeCases() {
  console.log(colorize("\n🔥 Running Edge Case Tests", "bright"));
  console.log("=".repeat(60));

  try {
    const success = await runEdgeCaseTests();
    if (success) {
      console.log(
        colorize("✅ Edge case tests completed successfully", "green")
      );
    } else {
      console.log(colorize("⚠️ Some edge case tests failed", "yellow"));
    }
    return success;
  } catch (error) {
    console.log(
      colorize(`❌ Edge case tests crashed: ${error.message}`, "red")
    );
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests(options = {}) {
  const startTime = Date.now();

  console.log(colorize("🧪 LibRaw Buffer API Test Suite", "bright"));
  console.log(colorize("=====================================", "bright"));
  console.log(
    colorize(`📅 Started at: ${new Date().toLocaleString()}`, "cyan")
  );

  // Check environment
  if (!checkTestEnvironment()) {
    console.log(
      colorize("\n❌ Test environment check failed. Aborting tests.", "red")
    );
    return false;
  }

  const results = {
    quick: false,
    comprehensive: false,
    edgeCase: false,
  };

  // Run tests based on options
  if (options.quick !== false) {
    results.quick = await runQuickTest();

    // If quick test fails, don't run others unless forced
    if (!results.quick && !options.force) {
      console.log(
        colorize("\n⚠️ Quick test failed. Skipping remaining tests.", "yellow")
      );
      console.log(
        colorize("   Use --force to run all tests anyway.", "yellow")
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

  // Summary
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log(colorize("\n📊 Test Suite Summary", "bright"));
  console.log("=".repeat(60));

  const testResults = Object.entries(results).filter(
    ([_, ran]) => ran !== undefined
  );
  const passedTests = testResults.filter(([_, passed]) => passed).length;
  const totalTests = testResults.length;

  testResults.forEach(([testName, passed]) => {
    const status = passed ? "✅ PASSED" : "❌ FAILED";
    const color = passed ? "green" : "red";
    console.log(
      colorize(
        `${status} ${
          testName.charAt(0).toUpperCase() + testName.slice(1)
        } Tests`,
        color
      )
    );
  });

  console.log("");
  console.log(
    colorize(
      `Tests passed: ${passedTests}/${totalTests}`,
      passedTests === totalTests ? "green" : "yellow"
    )
  );
  console.log(
    colorize(`Total time: ${(totalTime / 1000).toFixed(1)}s`, "cyan")
  );

  const overallSuccess = passedTests === totalTests;

  if (overallSuccess) {
    console.log(
      colorize("\n🎉 All buffer API tests passed successfully!", "green")
    );
    console.log(
      colorize(
        "   Your buffer creation methods are working correctly.",
        "green"
      )
    );
  } else {
    console.log(
      colorize(
        `\n⚠️ ${totalTests - passedTests} test suite(s) had issues.`,
        "yellow"
      )
    );
    console.log(colorize("   Check the output above for details.", "yellow"));
  }

  // Show output directories
  const outputDirs = [
    "test/buffer-output",
    "test/quick-test-output",
    "test/buffer-integration-output",
  ].map((dir) => path.join(__dirname, "..", dir));

  const existingDirs = outputDirs.filter((dir) => fs.existsSync(dir));
  if (existingDirs.length > 0) {
    console.log(colorize("\n📁 Test output files saved to:", "cyan"));
    existingDirs.forEach((dir) => {
      console.log(colorize(`   ${dir}`, "cyan"));
    });
  }

  return overallSuccess;
}

/**
 * Parse command line arguments
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
        console.log(colorize("LibRaw Buffer API Test Runner", "bright"));
        console.log("");
        console.log("Usage: node run-buffer-tests.js [options]");
        console.log("");
        console.log("Options:");
        console.log("  --quick-only      Run only quick verification test");
        console.log("  --comprehensive-only  Run only comprehensive tests");
        console.log("  --edge-only       Run only edge case tests");
        console.log("  --no-quick        Skip quick verification test");
        console.log(
          "  --force           Continue running tests even if quick test fails"
        );
        console.log("  --help, -h        Show this help message");
        console.log("");
        console.log("By default, all tests are run in sequence.");
        process.exit(0);
        break;
      default:
        console.log(colorize(`Unknown option: ${arg}`, "red"));
        console.log(colorize("Use --help for usage information", "yellow"));
        process.exit(1);
    }
  }

  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();

  runAllTests(options)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(colorize(`Test runner crashed: ${error.message}`, "red"));
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
