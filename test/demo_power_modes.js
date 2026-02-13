#!/usr/bin/env node

/**
 * Manual test script to demonstrate LOW POWER and HIGH POWER modes
 * This script doesn't require Ollama to be running - it uses the mock provider
 */

import { Agent } from '../src/core/agent.js';
import { MockProvider } from '../src/providers/mock.js';
import { ListDirTool, ReadFileTool } from '../src/tools/fs.js';
import { SystemInfoTool } from '../src/tools/system.js';
import chalk from 'chalk';

async function demonstrateMode(modeName, powerMode) {
    console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan.bold(`  ${modeName} MODE DEMONSTRATION`));
    console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
    
    const llm = new MockProvider();
    const tools = [
        new ListDirTool(),
        new ReadFileTool(),
        new SystemInfoTool()
    ];
    
    const agent = new Agent(llm, tools, { 
        memoryPath: null,
        powerMode: powerMode
    });
    
    console.log(chalk.yellow('Configuration:'));
    console.log(chalk.gray(`  Power Mode: ${agent.profile}`));
    console.log(chalk.gray(`  Memory Limit: ${agent.memory.maxMessages} messages, ${(agent.memory.maxSize/1024).toFixed(0)}KB`));
    console.log(chalk.gray(`  Tools Available: ${agent.tools.size}`));
    
    console.log(chalk.yellow('\nRunning test query: "List files in current directory"\n'));
    
    try {
        const result = await agent.run('List files in current directory');
        console.log(chalk.green.bold('\n✓ Result:'), result);
        
        // Show memory stats
        const stats = agent.memory.getStats();
        console.log(chalk.yellow('\nMemory Stats:'));
        console.log(chalk.gray(`  Messages: ${stats.messageCount}/${stats.maxMessages}`));
        console.log(chalk.gray(`  Size: ${stats.sizeBytes} bytes / ${stats.maxSize} bytes`));
        
        return true;
    } catch (error) {
        console.error(chalk.red.bold('\n✗ Error:'), error.message);
        return false;
    }
}

async function compareSystemPrompts() {
    console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan.bold(`  SYSTEM PROMPT COMPARISON`));
    console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
    
    const lowAgent = new Agent(new MockProvider(), [new ListDirTool()], { 
        memoryPath: null,
        powerMode: 'LOW_POWER'
    });
    
    const highAgent = new Agent(new MockProvider(), [new ListDirTool()], { 
        memoryPath: null,
        powerMode: 'HIGH_POWER'
    });
    
    console.log(chalk.yellow('LOW POWER System Prompt (first 200 chars):'));
    console.log(chalk.gray(lowAgent.systemPrompt.substring(0, 200) + '...'));
    
    console.log(chalk.yellow('\nHIGH POWER System Prompt (first 200 chars):'));
    console.log(chalk.gray(highAgent.systemPrompt.substring(0, 200) + '...'));
}

async function main() {
    console.log(chalk.magenta.bold('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.magenta.bold('║  MiniClawd Power Modes - Manual Demonstration             ║'));
    console.log(chalk.magenta.bold('╚════════════════════════════════════════════════════════════╝\n'));
    
    const results = [];
    
    // Test LOW POWER mode
    results.push(await demonstrateMode('LOW POWER', 'LOW_POWER'));
    
    // Small delay for readability
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test HIGH POWER mode
    results.push(await demonstrateMode('HIGH POWER', 'HIGH_POWER'));
    
    // Compare system prompts
    await compareSystemPrompts();
    
    // Summary
    console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan.bold(`  SUMMARY`));
    console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    if (passed === total) {
        console.log(chalk.green.bold(`✓ All ${total} demonstrations completed successfully!\n`));
        console.log(chalk.white('Key Differences:'));
        console.log(chalk.gray('  • LOW POWER: Minimal memory (20 msgs, 50KB), concise prompts'));
        console.log(chalk.gray('  • HIGH POWER: Full memory (100 msgs, 200KB), detailed prompts'));
        console.log(chalk.gray('  • Both modes support all tools and providers\n'));
    } else {
        console.log(chalk.red.bold(`✗ ${total - passed} of ${total} demonstrations failed\n`));
    }
}

main().catch(console.error);
