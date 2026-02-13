import { Tool } from './base.js';
import { z } from 'zod';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class RunCommandTool extends Tool {
    constructor() {
        super(
            'run_command',
            'Execute a shell command.',
            z.object({
                command: z.string().describe('The command to execute'),
            })
        );
    }

    async execute({ command }) {
        try {
            const { stdout, stderr } = await execPromise(command);
            return stdout || stderr;
        } catch (error) {
            return `Error executing command: ${error.message}`;
        }
    }
}
