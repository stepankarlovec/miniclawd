import { Tool } from './base.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

export class ScriptExecutionTool extends Tool {
    constructor() {
        super(
            'execute_code',
            'Write and execute a code snippet in a temporary file. Supported languages: javascript (node), python, bash/sh, powershell.',
            z.object({
                language: z.enum(['javascript', 'python', 'bash', 'powershell', 'sh']).describe('The programming language'),
                code: z.string().describe('The code to execute'),
            })
        );
    }

    async execute({ language, code }) {
        const tmpDir = os.tmpdir();
        const timestamp = Date.now();
        let filename, command;

        switch (language) {
            case 'javascript':
                filename = `script_${timestamp}.js`;
                command = `node ${filename}`;
                break;
            case 'python':
                filename = `script_${timestamp}.py`;
                command = `python ${filename}`; // Assumes python is in PATH
                break;
            case 'bash':
            case 'sh':
                filename = `script_${timestamp}.sh`;
                command = `bash ${filename}`;
                break;
            case 'powershell':
                filename = `script_${timestamp}.ps1`;
                command = `powershell -ExecutionPolicy Bypass -File ${filename}`;
                break;
            default:
                return "Unsupported language.";
        }

        const filePath = path.join(tmpDir, filename);

        try {
            await fs.writeFile(filePath, code);

            // Execute from tmp dir
            const { stdout, stderr } = await execPromise(command, { cwd: tmpDir });

            // Cleanup (optional, maybe keep for debugging? Let's delete to be clean)
            await fs.unlink(filePath).catch(() => { });

            return stdout ? `Output:\n${stdout}` : (stderr ? `Stderr:\n${stderr}` : "Script executed with no output.");
        } catch (error) {
            // Try to delete even if exec failed
            await fs.unlink(filePath).catch(() => { });

            return `Execution Error: ${error.message}\nStderr: ${error.stderr || ''}`;
        }
    }
}
