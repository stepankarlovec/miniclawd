import { Agent } from './core/agent.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAIProvider } from './providers/openai.js';
import { StorageManager } from './core/storage.js';
import { ListDirTool, ReadFileTool, WriteFileTool } from './tools/fs.js';
import { RunCommandTool } from './tools/cmd.js';
import { ScriptExecutionTool } from './tools/script.js';
import { WeatherTool, CoinGeckoTool, RandomFactTool } from './tools/api.js';
import { GmailManager, GmailAuthTool, GmailSendTool, GmailReadTool } from './tools/gmail.js';
import { webTools } from './tools/web.js';
import { SystemInfoTool, MemoryStatsTool, ClearMemoryTool, ThrottleDetectionTool } from './tools/system.js';
import { PerformanceMetricsTool } from './tools/performance.js';
import { TelegramBot } from './server/telegram.js';
import { WebServer } from './server/server.js';
import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const configManager = new StorageManager(path.join(DATA_DIR, 'config.json'), {
    llm_provider: 'ollama',
<<<<<<< copilot/verify-ollama-functionality
    model_name: 'qwen2.5:0.5b',
    agent_profile: 'high', // 'low' or 'high'
=======
    model_name: 'llama3.2:1b',
    power_mode: 'LOW_POWER', // LOW_POWER (Raspberry Pi/Edge) or HIGH_POWER (Desktop/Cloud)
>>>>>>> main
    approved_telegram_ids: [],
    enable_web: true,
    web_port: 3000
});

async function main() {
    await configManager.init();
    const config = configManager.get();

    console.log(chalk.green.bold('MiniClawd Agent Framework'));

    // Initialize LLM
    let llm;
    try {
        if (config.llm_provider === 'openai') {
            if (!config.openai_api_key) console.warn(chalk.yellow("Warning: OpenAI API Key missing in config."));
            llm = new OpenAIProvider(config.openai_api_key, config.model_name);
        } else {
            llm = new OllamaProvider(config.model_name, { 
                timeout: 60000,  // 60s timeout for slower devices
                enableStreaming: config.enable_streaming || false,
                verbose: true  // Enable verbose logging
            });
        }
    } catch (e) {
        console.error(chalk.red("LLM Provider Init Error:"), e);
    }

    // Initialize Gmail Manager
    const gmailManager = new GmailManager(configManager);
    await gmailManager.init();

    // Initialize Agent first (without memory-dependent tools)
    let agent;
    try {
        // Support both new power_mode and legacy agent_profile for backward compatibility
        const powerMode = config.power_mode || config.agent_profile || 'HIGH_POWER';
        
        agent = new Agent(llm, [], {
            memoryPath: path.join(DATA_DIR, 'memory.json'),
            powerMode: powerMode
        });
    } catch (e) {
        console.error(chalk.red("Agent Init Error:"), e);
        process.exit(1);
    }

    // Initialize Tools (now we can pass agent to memory-dependent tools)
    const tools = [
        new ListDirTool(),
        new ReadFileTool(),
        new WriteFileTool(),
        new RunCommandTool(),
        new ScriptExecutionTool(),
        new WeatherTool(),
        new CoinGeckoTool(),
        new RandomFactTool(),
        new GmailAuthTool(gmailManager),
        new GmailSendTool(gmailManager),
        new GmailReadTool(gmailManager),
        new SystemInfoTool(),
        new ThrottleDetectionTool(),
        new MemoryStatsTool(agent),
        new ClearMemoryTool(agent),
        new PerformanceMetricsTool(),
        ...webTools // Add Web Tools (Search + Read)
    ];

    // Update agent tools
    if (agent.profile !== 'chat') {
        agent.tools = new Map(tools.map(tool => [tool.name, tool]));
        agent.systemPrompt = agent._buildSystemPrompt();
    }



    // --- CLEANER RE-IMPLEMENTATION OF DEPENDENCY INJECTION ---

    // 1. Core Services (Agent, Config, Gmail, LLM) - ALREADY DONE ABOVE

    // 2. Telegram (Initialized but not launched if we need IO)
    // actually TelegramBot needs IO to emit events.
    // WebServer needs TelegramBot to check status.
    // Solution: Create WebServer first (gets IO). Then create TelegramBot (uses IO). Then inject TelegramBot into WebServer (for Health).

    let webServer = null;
    let io = null;
    let telegramBot = null;
    if (config.enable_web) {
        webServer = new WebServer(agent, configManager, null, gmailManager, llm); // null telegram for now
        webServer.start(config.web_port);
        io = webServer.io;
    }

    if (config.telegram_token) {
        telegramBot = new TelegramBot(config.telegram_token, agent, configManager, io);
        telegramBot.launch();
    }

    if (webServer) {
        // Inject telegram bot back into health check
        webServer.healthCheck.telegramBot = telegramBot;
    }

    // Only start CLI if running in interactive mode (TTY)
    if (process.stdin.isTTY) {
        // CLI Loop
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

        console.log(chalk.cyan(`Agent ready. Type "exit" to quit.`));

        while (true) {
            const userInput = await askQuestion(chalk.green('\nYou: '));

            if (userInput.toLowerCase() === 'exit') {
                break;
            }

            const spinner = ora('Agent is thinking...').start();

            try {
                const answer = await agent.run(userInput);
                spinner.stop();
                console.log(chalk.magenta('\nAgent:'), answer);
            } catch (error) {
                spinner.stop();
                console.error(chalk.red('Error occurred:'), error);
            }
        }

        rl.close();
        process.exit(0);
    } else {
        // Running in background mode (e.g., as a service)
        console.log(chalk.cyan('Running in server mode (no CLI). Press Ctrl+C to exit.'));
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\nShutting down...'));
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log(chalk.yellow('\nShutting down...'));
            process.exit(0);
        });
    }
}

main();
