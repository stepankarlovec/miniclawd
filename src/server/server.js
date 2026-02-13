import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { SystemHealthCheck } from './health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
    constructor(agent, configManager, telegramBot, gmailManager, llmProvider) {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: { origin: "*", methods: ["GET", "POST"] }
        });
        this.agent = agent;
        this.configManager = configManager;

        // Health Check Service
        this.healthCheck = new SystemHealthCheck(configManager, telegramBot, gmailManager, llmProvider);

        this.setupMiddlewares();
        this.setupRoutes();
        this.setupSocket();
    }

    setupMiddlewares() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../../public')));
    }

    setupRoutes() {
        // API: Config (Get)
        this.app.get('/api/config', (req, res) => {
            try {
                const config = this.configManager.get();
                // Mask sensitive fields
                const safeConfig = { ...config };
                if (safeConfig.openai_api_key) safeConfig.openai_api_key = '***';
                if (safeConfig.telegram_token) safeConfig.telegram_token = '***';
                if (safeConfig.gmail_client_secret) safeConfig.gmail_client_secret = '***';
                res.json(safeConfig);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Config (Update)
        this.app.post('/api/config', async (req, res) => {
            try {
                const newConfig = req.body;
                // Don't overwrite with '***'
                const currentConfig = this.configManager.get();
                if (newConfig.openai_api_key === '***') delete newConfig.openai_api_key;
                if (newConfig.telegram_token === '***') delete newConfig.telegram_token;
                if (newConfig.gmail_client_secret === '***') delete newConfig.gmail_client_secret;

                await this.configManager.update(newConfig);

                // Hot-reload Agent Profile
                if (newConfig.agent_profile && newConfig.agent_profile !== this.agent.profile) {
                    this.agent.profile = newConfig.agent_profile;
                    this.agent.systemPrompt = this.agent._buildSystemPrompt();

                    // Update tool visibility
                    if (this.agent.profile === 'chat') {
                        // Keep tools map but just don't use it in logic (already handled in run())
                        // But systematically we might want to clear it if strict
                    } else {
                        // If switching back to work mode, we rely on the tools passed in constructor
                        // Ideally checking if we need to re-init tools but they are stateless mostly
                    }
                    console.log(chalk.blue(`[System] Hot-swapped Agent Profile to: ${this.agent.profile}`));
                }

                res.json({ success: true, message: "Configuration saved." });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Status
        this.app.get('/api/status', async (req, res) => {
            try {
                const status = await this.healthCheck.check();
                res.json(status);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Approve Telegram ID
        this.app.post('/api/auth/approve', async (req, res) => {
            try {
                const { chatId } = req.body;
                if (!chatId) return res.status(400).json({ error: "No chatId provided" });

                const currentIds = this.configManager.get('approved_telegram_ids') || [];
                if (!currentIds.includes(chatId)) {
                    currentIds.push(chatId);
                    await this.configManager.set('approved_telegram_ids', currentIds);
                    console.log(chalk.green(`[Auth] Approved Telegram ID: ${chatId}`));

                    this.io.emit('bot-access-granted', { chatId });
                    this.io.emit('system-log', { type: 'success', message: `Approved access for Telegram ID: ${chatId}` });
                }
                res.json({ success: true, approvedIds: currentIds });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Reject Telegram ID
        this.app.post('/api/auth/reject', async (req, res) => {
            try {
                const { chatId } = req.body;
                if (!chatId) return res.status(400).json({ error: "No chatId provided" });

                console.log(chalk.yellow(`[Auth] Rejected Telegram ID: ${chatId}`));
                this.io.emit('bot-access-rejected', { chatId });
                this.io.emit('system-log', { type: 'warning', message: `Refused access for Telegram ID: ${chatId}` });

                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Chat History
        this.app.get('/api/history', (req, res) => {
            try {
                res.json(this.agent.memory.getMessages());
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API: Chat
        this.app.post('/api/chat', async (req, res) => {
            const { message } = req.body;
            if (!message) return res.status(400).json({ error: "No message" });

            try {
                // Define real-time update handler
                const onUpdate = (data) => {
                    this.io.emit('agent-activity', data);

                    // Also log significant events to system logs
                    if (data.type === 'tool') {
                        this.io.emit('system-log', { type: 'info', message: `Agent using tool: ${data.tool}` });
                    }
                    if (data.type === 'log') {
                        this.io.emit('system-log', { type: 'info', message: data.message });
                    }
                };

                const response = await this.agent.run(message, onUpdate);
                this.io.emit('agent-activity', { type: 'done' }); // Signal completion
                res.json({ response });
            } catch (error) {
                console.error("Chat API Error:", error);
                this.io.emit('agent-activity', { type: 'error', message: error.message });
                res.status(500).json({ error: "Internal Server Error: " + error.message });
            }
        });


        // API: System Restart Ollama
        this.app.post('/api/system/restart-ollama', async (req, res) => {
            const { exec } = await import('child_process');
            const platform = process.platform;
            let command = '';

            console.log(chalk.yellow(`[System] Received request to restart Ollama (Platform: ${platform})`));

            if (platform === 'linux') {
                command = 'sudo systemctl restart ollama';
            } else if (platform === 'win32') {
                // Windows: Kill process, it might need manual start or if registered as service
                // Attempting to just kill might be safer than spawning a persistent server from this node process
                command = 'taskkill /F /IM "ollama_app.exe" /T';
                // Note: User might need to restart Ollama manually if it doesn't auto-recover,
                // but usually "restart" implies stopping and starting.
                // Improving: 'taskkill /F /IM "ollama_app.exe" & date /t' - just kill for now.
            } else {
                return res.status(400).json({ error: `Unsupported platform: ${platform}` });
            }

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[System] Restart Error: ${error.message}`);
                    return res.status(500).json({ error: error.message, stderr });
                }
                console.log(`[System] Restart Output: ${stdout}`);
                res.json({ success: true, message: "Ollama restart command executed." });
            });
        });
    }

    setupSocket() {
        this.io.on('connection', (socket) => {
            // console.log(chalk.gray('[Socket] Client connected'));
        });
    }

    start(port = 3000) {
        try {
            this.server.listen(port, '0.0.0.0', () => {
                const address = this.server.address();
                console.log(chalk.green.bold(`\nWeb Dashboard running on http://${address.address}:${address.port}`));
                console.log(chalk.cyan(`Access via LAN: http://<YOUR_PI_IP>:${address.port}`));
            });
            this.server.on('error', (e) => {
                console.error(chalk.red("Web Server Error:"), e);
            });
        } catch (e) {
            console.error(chalk.red("Failed to start Web Server:"), e);
        }
    }
}
