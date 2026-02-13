import { Memory } from './memory.js';
import { PROMPTS } from './prompts.js';
import chalk from 'chalk';

export class Agent {
    constructor(llm, tools = [], options = {}) {
        this.llm = llm;
        this.profile = options.profile || 'high'; // 'high', 'low', 'chat'

        // If chat mode, we disable tools completely to prevent hallucinations
        if (this.profile === 'chat') {
            this.tools = new Map();
        } else {
            this.tools = new Map(tools.map(tool => [tool.name, tool]));
        }

        this.memory = new Memory(options.memoryPath);
        this.systemPrompt = this._buildSystemPrompt();
    }

    _buildSystemPrompt() {
        const toolsJson = JSON.stringify(Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            schema: t.schema
        })), null, 2);

        const promptFn = PROMPTS[this.profile]?.system || PROMPTS['high'].system;
        return promptFn(toolsJson);
    }

    async run(userInput, onUpdate = null) {
        // Add user message to memory
        await this.memory.init();
        this.memory.addMessage('user', userInput);

        let turns = 0;
        const maxTurns = 5; // Prevent infinite loops

        while (turns < maxTurns) {
            turns++;

            // 1. Prepare history for LLM
            // For Low Profile: Limit history to last 3 turns to save tokens
            const history = this.profile === 'low'
                ? this.memory.getMessages().slice(-6)
                : this.memory.getMessages();

            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...history
            ];

            if (onUpdate) onUpdate({ type: 'thinking', message: 'Generating response...' });

            // 2. Call LLM
            const responseText = await this.llm.chat(messages);

            // 3. Parse Response
            let action;
            try {
                // Try finding JSON object in response
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    action = JSON.parse(jsonMatch[0]);
                } else {
                    // Fallback for chat mode or failed parse
                    action = { answer: responseText };
                }
            } catch (e) {
                console.error("JSON Parse Error:", e);
                action = { answer: responseText }; // Fallback
            }

            // 4. Handle Action
            if (action.answer) {
                this.memory.addMessage('assistant', responseText); // Store full raw response
                if (onUpdate) onUpdate({ type: 'answer', message: action.answer });
                return action.answer;

            } else if (action.tool) {
                const toolName = action.tool;
                const toolArgs = action.args || {};

                console.log(chalk.yellow(`[Tool] ${toolName} args: ${JSON.stringify(toolArgs)}`));
                if (onUpdate) onUpdate({ type: 'tool', tool: toolName, args: toolArgs });

                const tool = this.tools.get(toolName);
                let toolResult = "";

                if (tool) {
                    try {
                        // Special case for Gmail Auth which needs manual intervention often
                        // checking schema might be good but let's just run it
                        const result = await tool.func(toolArgs);
                        toolResult = typeof result === 'string' ? result : JSON.stringify(result);
                    } catch (err) {
                        toolResult = `Error executing tool ${toolName}: ${err.message}`;
                    }
                } else {
                    toolResult = `Error: Tool "${toolName}" not found.`;
                }

                // Add observation to memory
                // We mock the assistant's tool call in memory so the LLM knows it happened
                // Ideally we'd store the specific tool call format but raw text works for Llama usually
                this.memory.addMessage('assistant', JSON.stringify(action));
                this.memory.addMessage('user', `Tool Output: ${toolResult}`);

                if (onUpdate) onUpdate({ type: 'observation', message: toolResult.substring(0, 100) + "..." });

                // Continue loop
            } else {
                return "Error: Invalid response format from Agent.";
            }
        }

        return "Error: Maximum turns reached.";
    }
}
