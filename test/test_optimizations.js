import { Memory } from '../src/core/memory.js';
import { SystemInfoTool, MemoryStatsTool, ClearMemoryTool, ThrottleDetectionTool } from '../src/tools/system.js';
import { PerformanceMetricsTool, perfTracker } from '../src/tools/performance.js';
import { Agent } from '../src/core/agent.js';
import { MockProvider } from '../src/providers/mock.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMemoryPruning() {
    console.log(chalk.blue('\n=== Testing Memory Auto-Pruning ==='));
    
    const tmpPath = path.join(__dirname, '../data/test_memory.json');
    const memory = new Memory(tmpPath, { maxMessages: 5, maxSize: 500 });
    
    await memory.init();
    await memory.clear();
    
    // Add 10 messages (should auto-prune to 5)
    for (let i = 0; i < 10; i++) {
        await memory.addMessage('user', `Message ${i}`);
    }
    
    const stats = memory.getStats();
    console.log(chalk.gray(`  Messages: ${stats.messageCount}/${stats.maxMessages}`));
    
    if (stats.messageCount <= 5) {
        console.log(chalk.green('  ✅ Memory pruning works correctly'));
    } else {
        console.log(chalk.red(`  ❌ Expected ≤5 messages, got ${stats.messageCount}`));
        return false;
    }
    
    // Cleanup
    if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
    }
    
    return true;
}

async function testSystemInfoTool() {
    console.log(chalk.blue('\n=== Testing System Info Tool ==='));
    
    const tool = new SystemInfoTool();
    const result = await tool.execute({ detailed: false });
    
    try {
        const info = JSON.parse(result);
        if (info.os && info.cpu && info.memory) {
            console.log(chalk.green('  ✅ System info tool works'));
            console.log(chalk.gray(`  CPU Temp: ${info.cpu.temperature}`));
            console.log(chalk.gray(`  Memory: ${info.memory.usage}`));
            return true;
        }
    } catch (e) {
        console.log(chalk.red('  ❌ System info tool failed'));
        return false;
    }
    
    return false;
}

async function testThrottleDetection() {
    console.log(chalk.blue('\n=== Testing Throttle Detection ==='));
    
    const tool = new ThrottleDetectionTool();
    const result = await tool.execute({});
    
    try {
        const info = JSON.parse(result);
        console.log(chalk.green('  ✅ Throttle detection tool works'));
        if (info.warnings) {
            console.log(chalk.gray(`  Status: ${info.warnings[0]}`));
        } else if (info.message) {
            console.log(chalk.gray(`  ${info.message}`));
        }
        return true;
    } catch (e) {
        console.log(chalk.red('  ❌ Throttle detection failed'));
        return false;
    }
}

async function testPerformanceMetrics() {
    console.log(chalk.blue('\n=== Testing Performance Metrics ==='));
    
    // Simulate some metrics
    perfTracker.recordLLMCall(100);
    perfTracker.recordToolCall('test_tool', 50);
    
    const tool = new PerformanceMetricsTool();
    const result = await tool.execute({ reset: false });
    
    try {
        const metrics = JSON.parse(result);
        if (metrics.llm && metrics.tools) {
            console.log(chalk.green('  ✅ Performance metrics tool works'));
            console.log(chalk.gray(`  LLM Calls: ${metrics.llm.totalCalls}`));
            console.log(chalk.gray(`  Tool Calls: ${metrics.tools.totalCalls}`));
            return true;
        }
    } catch (e) {
        console.log(chalk.red('  ❌ Performance metrics failed'));
        return false;
    }
    
    return false;
}

async function testMemoryStatsWithAgent() {
    console.log(chalk.blue('\n=== Testing Memory Stats Tool ==='));
    
    const llm = new MockProvider();
    const agent = new Agent(llm, [], { memoryPath: null });
    
    const tool = new MemoryStatsTool(agent);
    const result = await tool.execute({});
    
    try {
        const stats = JSON.parse(result);
        if (stats.messageCount !== undefined) {
            console.log(chalk.green('  ✅ Memory stats tool works'));
            console.log(chalk.gray(`  Messages: ${stats.messageCount}`));
            console.log(chalk.gray(`  Size: ${stats.sizeKB} KB`));
            return true;
        }
    } catch (e) {
        console.log(chalk.red('  ❌ Memory stats tool failed'));
        return false;
    }
    
    return false;
}

async function runTests() {
    console.log(chalk.yellow.bold('\n🧪 Running MiniClawd Optimization Tests\n'));
    
    const tests = [
        { name: 'Memory Auto-Pruning', fn: testMemoryPruning },
        { name: 'System Info Tool', fn: testSystemInfoTool },
        { name: 'Throttle Detection', fn: testThrottleDetection },
        { name: 'Performance Metrics', fn: testPerformanceMetrics },
        { name: 'Memory Stats Tool', fn: testMemoryStatsWithAgent }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(chalk.red(`  ❌ ${test.name} threw error: ${error.message}`));
            failed++;
        }
    }
    
    console.log(chalk.yellow.bold('\n📊 Test Results:'));
    console.log(chalk.green(`  ✅ Passed: ${passed}/${tests.length}`));
    if (failed > 0) {
        console.log(chalk.red(`  ❌ Failed: ${failed}/${tests.length}`));
    }
    
    if (failed === 0) {
        console.log(chalk.green.bold('\n🎉 All tests passed!\n'));
        process.exit(0);
    } else {
        console.log(chalk.red.bold('\n❌ Some tests failed\n'));
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error(chalk.red('Test suite error:'), error);
    process.exit(1);
});
