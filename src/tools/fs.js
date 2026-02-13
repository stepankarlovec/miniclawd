import { Tool } from './base.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export class ListDirTool extends Tool {
    constructor() {
        super(
            'list_dir',
            'List files and directories in a given path.',
            z.object({
                path: z.string().describe('The directory path to list'),
            })
        );
    }

    async execute({ path: dirPath }) {
        try {
            const files = await fs.readdir(dirPath);
            return JSON.stringify(files);
        } catch (error) {
            return `Error listing directory: ${error.message}`;
        }
    }
}

export class ReadFileTool extends Tool {
    constructor() {
        super(
            'read_file',
            'Read the contents of a file.',
            z.object({
                path: z.string().describe('The file path to read'),
            })
        );
    }

    async execute({ path: filePath }) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            return `Error reading file: ${error.message}`;
        }
    }
}

export class WriteFileTool extends Tool {
    constructor() {
        super(
            'write_file',
            'Write content to a file. OVERWRITES existing content.',
            z.object({
                path: z.string().describe('The file path to write to'),
                content: z.string().describe('The content to write'),
            })
        );
    }

    async execute({ path: filePath, content }) {
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            return `Successfully wrote to ${filePath}`;
        } catch (error) {
            return `Error writing file: ${error.message}`;
        }
    }
}
