import { Telegraf } from 'telegraf';
import chalk from 'chalk';

export class TelegramBot {
    constructor(token, agent, configManager, io) {
        this.bot = new Telegraf(token);
        this.agent = agent;
        this.configManager = configManager;
        this.io = io; // Socket.io instance for emitting events

        this.startTime = Math.floor(Date.now() / 1000);
        this._setupHandlers();
    }

    launch() {
        this.bot.launch({ dropPendingUpdates: true }).then(() => {
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

            // Ignore old messages (older than boot time)
            if (ctx.message.date < this.startTime) {
                console.log(chalk.gray(`[Telegram] Ignoring old message from ${ctx.message.date} (Boot: ${this.startTime})`));
                return;
            }

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

            // Temporary Debug Reply (Remove later if annoying, but good for feedback now)
            // await ctx.reply("Wait a second..."); 

            try {
                console.log(chalk.cyan(`[Telegram] Sending text to agent: "${text}"`));
                const response = await this.agent.run(text);
                console.log(chalk.cyan(`[Telegram] Agent response len: ${response.length}`));

                await ctx.reply(response);
            } catch (error) {
                console.error(chalk.red("Telegram Agent Error:"), error);
                await ctx.reply(`❌ Error: ${error.message}`);
            }
        });
    }
}
