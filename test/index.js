const { testStaticMethods } = require("./static-methods.test.js");
const { testErrorHandling } = require("./error-handling.test.js");
const { runAllBufferTests } = require("./buffer-operations.test.js");
const { testConfiguration } = require("./configuration.test.js");

/**
 * Master test runner for all LibRaw tests
 */

async function runAllTests() {
  console.log("🧪 LibRaw Complete Test Suite");
  console.log("=".repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);

  const startTime = Date.now();
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  const tests = [
    { name: "Static Methods", fn: testStaticMethods },
    { name: "Error Handling", fn: testErrorHandling },
    { name: "Buffer Operations", fn: runAllBufferTests },
    { name: "Configuration", fn: testConfiguration },
  ];

  console.log(`\n📋 Running ${tests.length} test suites...\n`);

  for (const test of tests) {
    testResults.total++;

    try {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`🚀 Running: ${test.name}`);
      console.log(`${"=".repeat(60)}`);

      const testStart = Date.now();
      await test.fn();
      const testDuration = Date.now() - testStart;

      console.log(`\n✅ ${test.name} completed in ${testDuration}ms`);
      testResults.passed++;
    } catch (error) {
      console.log(`\n❌ ${test.name} failed: ${error.message}`);
      console.error(error.stack);
      testResults.failed++;
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUITE SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Test Suites: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(
    `Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(
      1
    )}%`
  );
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Finished at: ${new Date().toISOString()}`);

  if (testResults.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! 🎉");
    console.log("LibRaw wrapper is working correctly.");
  } else {
    console.log("\n⚠️ SOME TESTS FAILED");
    console.log("Please review the errors above.");
  }

  console.log("=".repeat(60));

  // Return results for programmatic use
  return testResults;
}

async function runQuickTest() {
  console.log("⚡ LibRaw Quick Test");
  console.log("=".repeat(30));

  try {
    // Test basic functionality
    const LibRaw = require("../lib/index.js");

    console.log("📊 Library Info:");
    console.log(`   Version: ${LibRaw.getVersion()}`);
    console.log(`   Cameras: ${LibRaw.getCameraCount()}`);

    console.log("🏗️ Constructor Test:");
    const processor = new LibRaw();
    console.log("   ✅ LibRaw instance created");

    await processor.close();
    console.log("   ✅ Instance closed");

    console.log("\n🎉 Quick test passed!");
    return true;
  } catch (error) {
    console.log(`\n❌ Quick test failed: ${error.message}`);
    return false;
  }
}

async function runSmokeTest() {
  console.log("💨 LibRaw Smoke Test");
  console.log("=".repeat(30));

  try {
    // Basic smoke test to ensure library loads and basic functions work
    const LibRaw = require("../lib/index.js");

    // Test static methods
    const version = LibRaw.getVersion();
    const count = LibRaw.getCameraCount();
    const caps = LibRaw.getCapabilities();
    const cameras = LibRaw.getCameraList();

    console.log("✅ Static methods working");
    console.log(`   Version: ${version}`);
    console.log(`   ${count} cameras supported`);
    console.log(`   ${cameras.length} cameras in list`);

    // Test instance creation
    const processor = new LibRaw();
    console.log("✅ Instance creation working");

    // Test error handling (should fail gracefully)
    try {
      await processor.getMetadata();
      console.log("❌ Should have failed without loaded file");
    } catch (e) {
      console.log("✅ Error handling working");
    }

    await processor.close();
    console.log("✅ Cleanup working");

    console.log("\n🎉 Smoke test passed!");
    return true;
  } catch (error) {
    console.log(`\n❌ Smoke test failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "full";

  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log("");

  try {
    switch (command) {
      case "quick":
        await runQuickTest();
        break;
      case "smoke":
        await runSmokeTest();
        break;
      case "static":
        await testStaticMethods();
        break;
      case "errors":
        await testErrorHandling();
        break;
      case "buffers":
        await runAllBufferTests();
        break;
      case "config":
        await testConfiguration();
        break;
      case "full":
      default:
        const results = await runAllTests();
        process.exit(results.failed > 0 ? 1 : 0);
    }
  } catch (error) {
    console.error(`\n💥 Test runner error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export functions for use as modules
module.exports = {
  runAllTests,
  runQuickTest,
  runSmokeTest,
};

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
