import axios from 'axios';
import si from 'systeminformation';

export class SystemHealthCheck {
    constructor(configManager, telegramBot, gmailManager, llmProvider) {
        this.configManager = configManager;
        this.telegramBot = telegramBot;
        this.gmailManager = gmailManager;
        this.llmProvider = llmProvider;
    }

    async check() {
        const hardware = await this._getHardwareStats();

        const status = {
            ollama: await this._checkOllama(),
            internet: await this._checkInternet(),
            telegram: this._checkTelegram(),
            gmail: this._checkGmail(),
            llm_configured: !!this.llmProvider,
            hardware: hardware
        };
        return status;
    }

    async _getHardwareStats() {
        try {
            // Parallelize independent calls
            const [temp, load, mem] = await Promise.all([
                si.cpuTemperature(),
                si.currentLoad(),
                si.mem()
            ]);

            return {
                temp: temp.main || 0, // Main cpu temp
                cpu_load: load.currentLoad || 0,
                mem_total: mem.total,
                mem_used: mem.active,
                mem_percent: (mem.active / mem.total) * 100
            };
        } catch (e) {
            console.error("Hardware Stats Error:", e.message);
            return { error: true };
        }
    }

    async _checkOllama() {
        const config = this.configManager.get();
        if (config.llm_provider !== 'ollama') return 'skipped';

        try {
            // Default Ollama port 11434
            await axios.head('http://127.0.0.1:11434');
            return 'online';
        } catch (e) {
            return 'offline';
        }
    }

    async _checkInternet() {
        try {
            await axios.head('https://www.google.com', { timeout: 2000 });
            return 'online';
        } catch (e) {
            return 'offline';
        }
    }

    _checkTelegram() {
        const config = this.configManager.get();
        if (!config.telegram_token) return 'not_configured';
        // Simplified status check
        return 'configured';
    }

    _checkGmail() {
        const config = this.configManager.get();
        if (!config.gmail_client_id) return 'not_configured';
        if (!this.gmailManager.isAuthenticated()) return 'auth_required';
        return 'ready';
    }
}
