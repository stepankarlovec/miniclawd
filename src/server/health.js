import axios from 'axios';
import si from 'systeminformation';

export class SystemHealthCheck {
    constructor(configManager, telegramBot, gmailManager, llmProvider) {
        this.configManager = configManager;
        this.telegramBot = telegramBot;
        this.gmailManager = gmailManager;
        this.llmProvider = llmProvider;
        
        // Add caching with TTL
        this.cache = {
            hardware: { data: null, timestamp: 0 },
            ollama: { data: null, timestamp: 0 },
            internet: { data: null, timestamp: 0 }
        };
        this.cacheTTL = 5000; // 5 second cache
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
        // Check cache
        const now = Date.now();
        if (this.cache.hardware.data && (now - this.cache.hardware.timestamp) < this.cacheTTL) {
            return this.cache.hardware.data;
        }

        try {
            // Parallelize independent calls
            const [temp, load, mem] = await Promise.all([
                si.cpuTemperature(),
                si.currentLoad(),
                si.mem()
            ]);

            const stats = {
                temp: temp.main || 0, // Main cpu temp
                cpu_load: load.currentLoad || 0,
                mem_total: mem.total,
                mem_used: mem.active,
                mem_percent: (mem.active / mem.total) * 100
            };

            // Update cache
            this.cache.hardware = { data: stats, timestamp: now };
            return stats;
        } catch (e) {
            console.error("Hardware Stats Error:", e.message);
            return { error: true };
        }
    }

    async _checkOllama() {
        const config = this.configManager.get();
        if (config.llm_provider !== 'ollama') return 'skipped';

        // Check cache
        const now = Date.now();
        if (this.cache.ollama.data && (now - this.cache.ollama.timestamp) < this.cacheTTL) {
            return this.cache.ollama.data;
        }

        try {
            // Default Ollama port 11434
            await axios.head('http://127.0.0.1:11434', { timeout: 2000 });
            this.cache.ollama = { data: 'online', timestamp: now };
            return 'online';
        } catch (e) {
            this.cache.ollama = { data: 'offline', timestamp: now };
            return 'offline';
        }
    }

    async _checkInternet() {
        // Check cache
        const now = Date.now();
        if (this.cache.internet.data && (now - this.cache.internet.timestamp) < this.cacheTTL) {
            return this.cache.internet.data;
        }

        try {
            await axios.head('https://www.google.com', { timeout: 2000 });
            this.cache.internet = { data: 'online', timestamp: now };
            return 'online';
        } catch (e) {
            this.cache.internet = { data: 'offline', timestamp: now };
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

    // Clear cache manually if needed
    clearCache() {
        this.cache = {
            hardware: { data: null, timestamp: 0 },
            ollama: { data: null, timestamp: 0 },
            internet: { data: null, timestamp: 0 }
        };
    }

    // Check if temperature is critical
    checkTemperatureAlert(thresholdCelsius = 70) {
        if (this.cache.hardware.data && this.cache.hardware.data.temp) {
            const temp = this.cache.hardware.data.temp;
            if (temp > thresholdCelsius) {
                return {
                    alert: true,
                    temp: temp,
                    threshold: thresholdCelsius,
                    message: `⚠️ CPU Temperature Alert: ${temp.toFixed(1)}°C (threshold: ${thresholdCelsius}°C)`
                };
            }
        }
        return { alert: false };
    }
}
