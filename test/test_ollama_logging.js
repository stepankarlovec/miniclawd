import { OllamaProvider } from '../src/providers/ollama.js';
import chalk from 'chalk';

async function testOllamaLogging() {
    console.log(chalk.blue('=== Testing Ollama Provider Logging ===\n'));

    // Test 1: Check if Ollama is accessible
    console.log(chalk.cyan('Test 1: Checking Ollama connectivity...'));
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            console.log(chalk.green('✓ Ollama is running'));
            console.log(chalk.gray(`  Available models: ${data.models?.map(m => m.name).join(', ') || 'none'}`));
            
            if (data.models && data.models.length > 0) {
                // Test 2: Try a simple chat request with logging
                console.log(chalk.cyan('\nTest 2: Testing chat with verbose logging...'));
                
                const testModel = data.models[0].name;
                const provider = new OllamaProvider(testModel, { 
                    verbose: true,
                    timeout: 30000 
                });
                
                console.log(chalk.gray(`Using model: ${testModel}`));
                
                try {
                    const result = await provider.chat([
                        { role: 'user', content: 'Say hello in exactly 5 words.' }
                    ]);
                    
                    console.log(chalk.green('✓ Chat request successful'));
                    console.log(chalk.gray(`  Response: ${result}`));
                } catch (error) {
                    console.log(chalk.red('✗ Chat request failed:'), error.message);
                }
            } else {
                console.log(chalk.yellow('⚠ No models available in Ollama'));
                console.log(chalk.gray('  Run: ollama pull qwen2.5:0.5b'));
            }
        } else {
            console.log(chalk.red('✗ Ollama responded with error'));
        }
    } catch (error) {
        console.log(chalk.red('✗ Cannot connect to Ollama at http://127.0.0.1:11434'));
        console.log(chalk.yellow('  Make sure Ollama is running: ollama serve'));
        console.log(chalk.yellow('  Or install Ollama: https://ollama.ai'));
    }

    console.log(chalk.blue('\n=== Test Complete ==='));
}

// Run test
testOllamaLogging();
