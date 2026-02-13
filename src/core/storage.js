import fs from 'fs/promises';
import path from 'path';

export class StorageManager {
    constructor(filePath, defaultData = {}) {
        this.filePath = filePath;
        this.defaultData = defaultData;
        this.data = null;
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });
            const content = await fs.readFile(this.filePath, 'utf-8');
            this.data = JSON.parse(content);
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.data = { ...this.defaultData };
                await this.save();
            } else {
                throw error;
            }
        }
    }

    get(key) {
        if (!this.data) throw new Error("Storage not initialized");
        return key ? this.data[key] : this.data;
    }

    set(key, value) {
        if (!this.data) throw new Error("Storage not initialized");
        this.data[key] = value;
        return this.save();
    }

    update(newData) {
        if (!this.data) throw new Error("Storage not initialized");
        this.data = { ...this.data, ...newData };
        return this.save();
    }

    async save() {
        await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    }
}
