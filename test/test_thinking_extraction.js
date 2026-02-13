import { Agent } from '../src/core/agent.js';
import chalk from 'chalk';

// Mock LLM provider for testing
class MockLLMWithThinking {
    async chat(messages) {
        // Simulate a response with thinking tags
        return `<think>I need to analyze the user's request. They're asking about the weather. I should provide a helpful response about checking weather information.</think>

{"answer": "I can help you check the weather! Please provide your location or use the weather tool."}`;
    }
}

// Test function
async function testThinkingExtraction() {
    console.log(chalk.blue('=== Testing Thinking Process Extraction ===\n'));

    const mockLLM = new MockLLMWithThinking();
    const agent = new Agent(mockLLM, [], { profile: 'high', memoryPath: '/tmp/test-memory.json' });

    let capturedThought = null;
    let capturedAnswer = null;

    const onUpdate = (data) => {
        if (data.type === 'thought') {
            capturedThought = data.message;
            console.log(chalk.magenta('✓ Thought captured:'), data.message.substring(0, 60) + '...');
        }
        if (data.type === 'answer') {
            capturedAnswer = data.message;
            console.log(chalk.green('✓ Answer captured:'), data.message);
        }
    };

    try {
        const response = await agent.run("What's the weather?", onUpdate);
        
        console.log(chalk.blue('\n=== Test Results ==='));
        
        if (capturedThought) {
            console.log(chalk.green('✓ PASS: Thinking process was extracted'));
            console.log(chalk.gray('  Thought:'), capturedThought.substring(0, 100));
        } else {
            console.log(chalk.red('✗ FAIL: Thinking process was NOT extracted'));
        }

        if (capturedAnswer && !capturedAnswer.includes('<think>')) {
            console.log(chalk.green('✓ PASS: Answer does not contain <think> tags'));
            console.log(chalk.gray('  Answer:'), capturedAnswer);
        } else {
            console.log(chalk.red('✗ FAIL: Answer still contains <think> tags'));
        }

        if (response && !response.includes('<think>')) {
            console.log(chalk.green('✓ PASS: Return value is clean'));
        } else {
            console.log(chalk.red('✗ FAIL: Return value contains <think> tags'));
        }

        console.log(chalk.blue('\n=== Test Complete ==='));
    } catch (error) {
        console.error(chalk.red('Test failed with error:'), error);
    }
}

// Run test
testThinkingExtraction();
