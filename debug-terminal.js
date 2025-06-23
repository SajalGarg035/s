const DockerService = require('./src/services/dockerService');

async function testTerminal() {
    const dockerService = new DockerService();
    const testRoomId = 'test-room-' + Date.now();
    
    try {
        console.log('🧪 Testing Docker terminal functionality...');
        
        // Create container
        console.log('1. Creating container...');
        const containerInfo = await dockerService.getContainer(testRoomId);
        console.log('✅ Container created:', containerInfo.id);
        
        // Create terminal
        console.log('2. Creating terminal...');
        const terminalId = 'test-terminal-' + Date.now();
        const { exec, stream } = await dockerService.createTerminal(testRoomId, terminalId);
        console.log('✅ Terminal created');
        
        // Set up output handler
        stream.on('data', (chunk) => {
            process.stdout.write('📺 Terminal output: ' + chunk.toString());
        });
        
        stream.on('error', (error) => {
            console.error('❌ Stream error:', error);
        });
        
        // Wait a bit for terminal to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test writing commands
        console.log('3. Testing terminal input...');
        
        const testCommands = [
            'echo "Hello from terminal test"\r',
            'pwd\r',
            'whoami\r',
            'ls -la\r'
        ];
        
        for (const cmd of testCommands) {
            console.log(`📝 Sending command: ${cmd.trim()}`);
            try {
                const result = stream.write(cmd);
                console.log(`✅ Write result: ${result}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`❌ Error writing command "${cmd}":`, error);
            }
        }
        
        // Wait for output
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Cleanup
        console.log('4. Cleaning up...');
        stream.end();
        await dockerService.cleanup(testRoomId);
        console.log('✅ Cleanup complete');
        
        console.log('🎉 Terminal test completed successfully!');
        
    } catch (error) {
        console.error('❌ Terminal test failed:', error);
        
        // Cleanup on error
        try {
            await dockerService.cleanup(testRoomId);
        } catch (cleanupError) {
            console.error('❌ Cleanup error:', cleanupError);
        }
    }
    
    process.exit(0);
}

// Run the test
testTerminal().catch(console.error);
