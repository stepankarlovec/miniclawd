import { Agent } from '../src/core/agent.js';
import { MockProvider } from '../src/providers/mock.js';
import { ListDirTool } from '../src/tools/fs.js';
import chalk from 'chalk';

async function testPowerMode(modeName, profile) {
    console.log(chalk.cyan(`\n=== Testing ${modeName} Mode ===`));
    
    const llm = new MockProvider();
    const tools = [new ListDirTool()];
    
    const agent = new Agent(llm, tools, { 
        memoryPath: null,
        powerMode: profile
    });
    
    console.log(chalk.gray(`Profile normalized to: ${agent.profile}`));
    console.log(chalk.gray(`Memory limits: maxMessages=${agent.memory.maxMessages}, maxSize=${agent.memory.maxSize}`));
    
    try {
        const result = await agent.run('List files in current directory');
        console.log(chalk.green(`Result: ${result}`));
        
        if (result === 'I have listed the files.') {
            console.log(chalk.green.bold(`✓ ${modeName} mode verified successfully`));
            return true;
        } else {
            console.error(chalk.red(`✗ ${modeName} mode failed: Unexpected result`));
            return false;
        }
    } catch (error) {
        console.error(chalk.red(`✗ ${modeName} mode error:`), error);
        return false;
    }
}

async function testBackwardCompatibility() {
    console.log(chalk.cyan('\n=== Testing Backward Compatibility ==='));
    
    // Test legacy profile names
    const legacyTests = [
        { input: 'low', expected: 'LOW_POWER' },
        { input: 'high', expected: 'HIGH_POWER' },
        { input: 'chat', expected: 'chat' }
    ];
    
    let allPassed = true;
    
    for (const test of legacyTests) {
        const agent = new Agent(new MockProvider(), [], { 
            memoryPath: null,
            profile: test.input
        });
        
        if (agent.profile === test.expected) {
            console.log(chalk.green(`✓ Legacy '${test.input}' → '${test.expected}'`));
        } else {
            console.log(chalk.red(`✗ Legacy '${test.input}' expected '${test.expected}' but got '${agent.profile}'`));
            allPassed = false;
        }
    }
    
    return allPassed;
}

async function testMemoryLimits() {
    console.log(chalk.cyan('\n=== Testing Memory Limits ==='));
    
    const lowPowerAgent = new Agent(new MockProvider(), [], { 
        memoryPath: null,
        powerMode: 'LOW_POWER'
    });
    
    const highPowerAgent = new Agent(new MockProvider(), [], { 
        memoryPath: null,
        powerMode: 'HIGH_POWER'
    });
    
    let passed = true;
    
    // Check LOW POWER limits
    if (lowPowerAgent.memory.maxMessages === 20 && 
        lowPowerAgent.memory.maxSize === 50000) {
        console.log(chalk.green('✓ LOW POWER memory limits correct (20 msgs, 50KB)'));
    } else {
        console.log(chalk.red(`✗ LOW POWER memory limits incorrect (got ${lowPowerAgent.memory.maxMessages} msgs, ${lowPowerAgent.memory.maxSize} bytes)`));
        passed = false;
    }
    
    // Check HIGH POWER limits
    if (highPowerAgent.memory.maxMessages === 100 && 
        highPowerAgent.memory.maxSize === 200000) {
        console.log(chalk.green('✓ HIGH POWER memory limits correct (100 msgs, 200KB)'));
    } else {
        console.log(chalk.red(`✗ HIGH POWER memory limits incorrect (got ${highPowerAgent.memory.maxMessages} msgs, ${highPowerAgent.memory.maxSize} bytes)`));
        passed = false;
    }
    
    return passed;
}

async function runAllTests() {
    console.log(chalk.yellow.bold('Starting Power Mode Tests...\n'));
    
    const results = [];
    
    // Test LOW POWER mode
    results.push(await testPowerMode('LOW POWER', 'LOW_POWER'));
    
    // Test HIGH POWER mode
    results.push(await testPowerMode('HIGH POWER', 'HIGH_POWER'));
    
    // Test backward compatibility
    results.push(await testBackwardCompatibility());
    
    // Test memory limits
    results.push(await testMemoryLimits());
    
    // Summary
    console.log(chalk.yellow.bold('\n=== Test Summary ==='));
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    if (passed === total) {
        console.log(chalk.green.bold(`✓ All ${total} test groups passed!`));
        process.exit(0);
    } else {
        console.log(chalk.red.bold(`✗ ${total - passed} of ${total} test groups failed`));
        process.exit(1);
    }
}

runAllTests();
