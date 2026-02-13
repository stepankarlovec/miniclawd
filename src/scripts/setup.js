import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { AVAILABLE_MODELS, DEFAULT_MODELS } from '../config/models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

async function setup() {
    console.log(chalk.green.bold('Welcome to MiniClawd Setup Wizard! 🚀\n'));

    // Load existing config if available
    let existingConfig = {};
    try {
        const content = await fs.readFile(CONFIG_FILE, 'utf-8');
        existingConfig = JSON.parse(content);
    } catch (e) { }

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'provider',
            message: 'Which LLM Provider would you like to use?',
            choices: ['Ollama (Local)', 'OpenAI (API)'],
            default: existingConfig.llm_provider === 'openai' ? 'OpenAI (API)' : 'Ollama (Local)'
        },
        {
            type: 'list',
            name: 'powerMode',
            message: 'Select Power Mode:',
            choices: [
                {
                    name: 'LOW POWER - Optimized for Raspberry Pi/Edge devices (minimal memory, current session only)',
                    value: 'LOW_POWER'
                },
                {
                    name: 'HIGH POWER - Full-featured agent (complete history, all capabilities)',
                    value: 'HIGH_POWER'
                },
                {
                    name: 'CHAT - Fast Q&A without tools (zero overhead)',
                    value: 'chat'
                }
            ],
            default: existingConfig.power_mode || existingConfig.agent_profile || 'LOW_POWER'
        },
        {
            type: 'list',
            name: 'modelName',
            message: 'Select the model to use:',
            choices: (answers) => {
                const provider = answers.provider === 'Ollama (Local)' ? 'ollama' : 'openai';
                return AVAILABLE_MODELS[provider].map(m => ({
                    name: `${m.label} - ${m.description}`,
                    value: m.value
                }));
            },
            default: (answers) => {
                const provider = answers.provider === 'Ollama (Local)' ? 'ollama' : 'openai';
                return existingConfig.model_name || DEFAULT_MODELS[provider];
            }
        },
        {
            type: 'input',
            name: 'openaiKey',
            message: 'Enter your OpenAI API Key (leave empty if using Ollama):',
            default: existingConfig.openai_api_key || '',
            when: (answers) => answers.provider === 'OpenAI (API)'
        },
        {
            type: 'input',
            name: 'telegramToken',
            message: 'Enter your Telegram Bot Token (optional):',
            default: existingConfig.telegram_token || ''
        },
        {
            type: 'confirm',
            name: 'enableGmail',
            message: 'Enable Gmail Integration? (Requires Client ID/Secret)',
            default: !!existingConfig.gmail_client_id
        },
        {
            type: 'input',
            name: 'gmailClientId',
            message: 'Enter Gmail Client ID:',
            default: existingConfig.gmail_client_id || '',
            when: (answers) => answers.enableGmail
        },
        {
            type: 'input',
            name: 'gmailClientSecret',
            message: 'Enter Gmail Client Secret:',
            default: existingConfig.gmail_client_secret || '',
            when: (answers) => answers.enableGmail
        },
        {
            type: 'confirm',
            name: 'enableWeb',
            message: 'Enable Web Dashboard?',
            default: existingConfig.enable_web !== false
        },
        {
            type: 'number',
            name: 'webPort',
            message: 'Web Dashboard Port:',
            default: existingConfig.web_port || 3000,
            when: (answers) => answers.enableWeb
        }
    ]);

    const config = {
        ...existingConfig,
        llm_provider: answers.provider.startsWith('Ollama') ? 'ollama' : 'openai',
        model_name: answers.modelName,
        power_mode: answers.powerMode, // New power mode setting
        openai_api_key: answers.openaiKey || existingConfig.openai_api_key || '',
        telegram_token: answers.telegramToken || existingConfig.telegram_token || '',
        enable_web: answers.enableWeb,
        web_port: answers.webPort || 3000,
        gmail_client_id: answers.gmailClientId || '',
        gmail_client_secret: answers.gmailClientSecret || '',
        // Preserve existing arrays/objs
        approved_telegram_ids: existingConfig.approved_telegram_ids || [],
        gmail_token: existingConfig.gmail_token || null
    };

    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(chalk.green(`\nConfiguration saved to ${CONFIG_FILE}`));
        console.log(chalk.blue(`\nSetup Complete! Run 'npm start' to launch MiniClawd.`));
    } catch (error) {
        console.error(chalk.red('Error saving config:'), error);
    }
}

setup();
