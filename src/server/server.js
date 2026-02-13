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
                res.json({ success: true, message: "Configuration saved. Please restart the agent for some changes to take effect." });
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
