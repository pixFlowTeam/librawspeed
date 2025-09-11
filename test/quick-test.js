const LibRaw = require('../lib/index');

console.log('LibRaw Node.js POC - Quick Test');
console.log('===============================\n');

try {
    console.log('✓ Creating LibRaw processor...');
    const processor = new LibRaw();
    console.log('✓ LibRaw processor created successfully!');
    
    console.log('✓ Testing close method...');
    processor.close();
    console.log('✓ Close method works!');
    
    console.log('\n🎉 POC is working! The addon loaded successfully.');
    console.log('\nTo test with a real RAW file:');
    console.log('  node test/test.js <path-to-raw-file>');
    console.log('  node examples/basic-example.js <path-to-raw-file>');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure libraw.dll is in the build/Release folder');
    console.error('2. Check that Visual Studio Build Tools are properly installed');
    console.error('3. Verify Node.js version compatibility');
}
