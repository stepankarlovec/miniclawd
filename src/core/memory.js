import { StorageManager } from './storage.js';

export class Memory {
    constructor(storagePath, options = {}) {
        this.messages = [];
        this.maxMessages = options.maxMessages || 100; // Limit total messages
        this.maxSize = options.maxSize || 100000; // 100KB limit
        if (storagePath) {
            this.storage = new StorageManager(storagePath, { messages: [] });
        }
    }

    async init() {
        if (this.storage) {
            await this.storage.init();
            this.messages = this.storage.get('messages') || [];
            // Auto-prune on init if needed
            await this._autoPrune();
        }
    }

    async addMessage(role, content) {
        this.messages.push({ role, content });
        await this._autoPrune();
        if (this.storage) {
            await this.storage.set('messages', this.messages);
        }
    }

    getMessages() {
        return this.messages;
    }

    async clear() {
        this.messages = [];
        if (this.storage) {
            await this.storage.set('messages', []);
        }
    }

    // Auto-prune memory when it exceeds limits
    async _autoPrune() {
        // Check message count limit
        if (this.messages.length > this.maxMessages) {
            // Keep only the most recent messages
            this.messages = this.messages.slice(-this.maxMessages);
        }

        // Check size limit
        const currentSize = JSON.stringify(this.messages).length;
        if (currentSize > this.maxSize) {
            // Remove oldest messages until under size limit
            while (this.messages.length > 10 && JSON.stringify(this.messages).length > this.maxSize) {
                this.messages.shift();
            }
        }
    }

    // Get memory usage stats
    getStats() {
        return {
            messageCount: this.messages.length,
            sizeBytes: JSON.stringify(this.messages).length,
            maxMessages: this.maxMessages,
            maxSize: this.maxSize
        };
    }
}
