import { Agent } from '../src/core/agent.js';
import { MockProvider } from '../src/providers/mock.js';
import { ListDirTool } from '../src/tools/fs.js';
import chalk from 'chalk';

async function verify() {
    console.log(chalk.yellow('Starting Verification...'));

    const llm = new MockProvider();
    const tools = [new ListDirTool()];
    const agent = new Agent(llm, tools, { memoryPath: null });

    try {
        const result = await agent.run('List files in current directory');
        console.log(chalk.green('Verification Result:'), result);

        if (result === 'I have listed the files.') {
            console.log(chalk.green.bold('SUCCESS: Agent loop verified with mock provider.'));
        } else {
            console.error(chalk.red('FAILURE: Unexpected result.'));
            process.exit(1);
        }
    } catch (error) {
        console.error(chalk.red('Verification Error:'), error);
        process.exit(1);
    }
}

verify();
