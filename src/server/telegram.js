import { Telegraf } from 'telegraf';
import chalk from 'chalk';

export class TelegramBot {
    constructor(token, agent, configManager, io) {
        this.bot = new Telegraf(token);
        this.agent = agent;
        this.configManager = configManager;
        this.io = io; // Socket.io instance for emitting events

        this._setupHandlers();
    }

    launch() {
        this.bot.launch().then(() => {
            console.log(chalk.blue('Telegram Bot launched!'));
        }).catch(err => {
            console.error(chalk.red('Telegram Bot failed to launch:', err));
        });

        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    _setupHandlers() {
        this.bot.on('message', async (ctx) => {
            // Basic text messages only for now
            if (!ctx.message.text) return;

            const chatId = ctx.chat.id.toString();
            const username = ctx.from.username || ctx.from.first_name || 'Unknown';
            const text = ctx.message.text;

            console.log(chalk.gray(`[Telegram] Message from ${username} (${chatId}): ${text}`));

            // 1. Check Auth
            const approvedIds = this.configManager.get('approved_telegram_ids') || [];

            if (!approvedIds.includes(chatId)) {
                // Not approved
                await ctx.reply(`Access Denied. Your Chat ID is: ${chatId}. \nPlease ask the admin to approve this ID on the dashboard.`);

                // Emit event to dashboard
                if (this.io) {
                    this.io.emit('bot-request', { chatId, username, text });
                }
                return;
            }

            // 2. Approved -> Send to Agent
            await ctx.sendChatAction('typing');
            try {
                const response = await this.agent.run(text); // Agent.run returns string
                await ctx.reply(response);
            } catch (error) {
                console.error("Agent Error:", error);
                await ctx.reply("Sorry, I encountered an error processing your request.");
            }
        });
    }
}
