import { StorageManager } from './storage.js';

export class Memory {
    constructor(storagePath) {
        this.messages = [];
        if (storagePath) {
            this.storage = new StorageManager(storagePath, { messages: [] });
        }
    }

    async init() {
        if (this.storage) {
            await this.storage.init();
            this.messages = this.storage.get('messages') || [];
        }
    }

    async addMessage(role, content) {
        this.messages.push({ role, content });
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
}
