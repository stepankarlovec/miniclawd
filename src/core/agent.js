import { Memory } from './memory.js';
import { PROMPTS } from './prompts.js';
import chalk from 'chalk';

// Pre-compile regex patterns for better performance
const JSON_REGEX = /\{[\s\S]*?\}/g;
const THINK_REGEX = /<think>([\s\S]*?)<\/think>/;

// Memory limits for different power modes (in bytes)
const MEMORY_LIMITS = {
    LOW_POWER: {
        maxMessages: 20,
        maxSize: 50000  // ~49KB - optimized for Raspberry Pi and edge devices
    },
    HIGH_POWER: {
        maxMessages: 100,
        maxSize: 200000 // ~195KB - full context for desktop/cloud deployments
    }
};

export class Agent {
    constructor(llm, tools = [], options = {}) {
        this.llm = llm;
        // Support both old terminology (for backwards compatibility) and new power mode names
        this.profile = this._normalizePowerMode(options.profile || options.powerMode || 'HIGH_POWER');
        this.timeout = options.timeout || 30000; // Default 30s timeout

        // If chat mode, we disable tools completely to prevent hallucinations
        if (this.profile === 'chat') {
            this.tools = new Map();
        } else {
            this.tools = new Map(tools.map(tool => [tool.name, tool]));
        }

        // Memory with limits based on power mode
        const memoryOptions = this.profile === 'LOW_POWER' 
            ? MEMORY_LIMITS.LOW_POWER  // Minimal history for resource-constrained devices
            : MEMORY_LIMITS.HIGH_POWER; // Full history with extended context
        
        this.memory = new Memory(options.memoryPath, memoryOptions);
        this.systemPrompt = this._buildSystemPrompt();
    }

    _normalizePowerMode(mode) {
        // Normalize to uppercase and handle legacy names
        const normalized = String(mode).toUpperCase();
        
        // Map legacy names to new power modes
        if (normalized === 'LOW' || normalized === 'LOW_POWER') return 'LOW_POWER';
        if (normalized === 'HIGH' || normalized === 'HIGH_POWER') return 'HIGH_POWER';
        if (normalized === 'CHAT') return 'chat';
        
        // Default to HIGH_POWER for unknown modes
        return 'HIGH_POWER';
    }

    _buildSystemPrompt() {
        const toolsJson = JSON.stringify(Array.from(this.tools.values()).map(t => ({
            name: t.name,
            description: t.description,
            schema: t.schema
        })), null, 2);

        // Get prompt for current profile, with fallback for legacy names
        const promptKey = this.profile === 'LOW_POWER' ? 'LOW_POWER' : 
                         this.profile === 'HIGH_POWER' ? 'HIGH_POWER' : 
                         this.profile;
        
        const promptFn = PROMPTS[promptKey]?.system || PROMPTS['HIGH_POWER'].system;
        return promptFn(toolsJson);
    }

    async run(userInput, onUpdate = null) {
        // --- 1. FAST PATH: Chat Mode (Zero history, Zero tools, Raw speed) ---
        if (this.profile === 'chat') {
            if (onUpdate) onUpdate({ type: 'thinking', message: 'Chatting...' });

            // Build message array with NO system prompt (handled in prompts.js returning empty)
            // But we might need at least one user message
            const messages = [
                { role: 'user', content: userInput }
            ];

            try {
                const rawResponse = await this.llm.chat(messages);

                // Extract thinking even in chat mode (use pre-compiled regex)
                let finalResponse = rawResponse;
                const thinkMatch = rawResponse.match(THINK_REGEX);

                if (thinkMatch) {
                    const thoughtContent = thinkMatch[1].trim();
                    finalResponse = rawResponse.replace(/<think>[\s\S]*?<\/think>/, '').trim();

                    if (onUpdate) onUpdate({ type: 'thought', message: thoughtContent });
                    console.log(chalk.magenta(`[Thought] ${thoughtContent.substring(0, 50)}...`));
                }

                if (onUpdate) onUpdate({ type: 'answer', message: finalResponse });
                return finalResponse;
            } catch (e) {
                return "Error: " + e.message;
            }
        }

        // --- 2. STANDARD PATH: Work Mode (Tools, History) ---

        // Add user message to memory
        await this.memory.init();
        // Track where this run started to enforce "0 History" for low profile
        const runStartIndex = this.memory.getMessages().length;
        this.memory.addMessage('user', userInput);

        let turns = 0;
        const maxTurns = 5; // Prevent infinite loops

        while (turns < maxTurns) {
            turns++;

            // History Management based on Power Mode
            let history;
            if (this.profile === 'LOW_POWER') {
                // LOW POWER Mode: Zero previous history. Only current run's context.
                // Optimized for Raspberry Pi and low-end devices with limited memory
                history = this.memory.getMessages().slice(runStartIndex);
            } else {
                // HIGH POWER Mode: Full conversation history for better context
                history = this.memory.getMessages();
            }

            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...history
            ];

            if (onUpdate) onUpdate({ type: 'thinking', message: 'Generating response...' });

            // Call LLM
            console.log(chalk.gray(`[LLM] Requesting response...`));
            const responseText = await this.llm.chat(messages);
            console.log(chalk.cyan(`[LLM] Raw Output:\n${responseText}`));

            // Extract thinking process if present (use pre-compiled regex)
            let cleanedResponse = responseText;
            const thinkMatch = responseText.match(THINK_REGEX);
            if (thinkMatch) {
                const thoughtContent = thinkMatch[1].trim();
                cleanedResponse = responseText.replace(THINK_REGEX, '').trim();

                if (onUpdate) onUpdate({ type: 'thought', message: thoughtContent });
                console.log(chalk.magenta(`[Thought] ${thoughtContent.substring(0, 100)}...`));
            }

            // Parse Response - Support Multiple Actions
            let actions = [];
            try {
                // First, try to parse the entire response as JSON
                try {
                    const parsed = JSON.parse(cleanedResponse);
                    if (parsed.tool || parsed.answer) {
                        actions.push(parsed);
                    }
                } catch (directParseError) {
                    // Direct JSON parsing failed - this is expected when LLM returns
                    // text mixed with JSON or multiple JSON objects
                    // Fall back to regex-based extraction
                    console.log(chalk.gray(`[Agent] Direct JSON parse failed, using regex fallback`));
                    
                    const matches = cleanedResponse.matchAll(JSON_REGEX);
                    for (const match of matches) {
                        try {
                            const parsed = JSON.parse(match[0]);
                            if (parsed.tool || parsed.answer) {
                                actions.push(parsed);
                            }
                        } catch (e) {
                            // Ignore invalid JSON chunks from regex matches
                        }
                    }
                }

                // Fallback if no valid JSON found but text exists
                if (actions.length === 0) {
                    actions.push({ answer: cleanedResponse });
                }
            } catch (e) {
                console.error(chalk.red("JSON Parse Error:"), e.message);
                actions.push({ answer: cleanedResponse });
            }

            // Execute Actions
            let finalAnswer = null;

            for (const action of actions) {
                if (action.answer) {
                    this.memory.addMessage('assistant', JSON.stringify(action));
                    if (onUpdate) onUpdate({ type: 'answer', message: action.answer });
                    console.log(chalk.green(`[Agent] Answer: ${action.answer}`));
                    finalAnswer = action.answer;

                } else if (action.tool) {
                    const toolName = action.tool;
                    const toolArgs = action.args || {};

                    console.log(chalk.yellow(`[Tool] Executing: ${toolName}`));
                    console.log(chalk.gray(`[Tool] Args: ${JSON.stringify(toolArgs)}`));

                    if (onUpdate) {
                        onUpdate({ type: 'tool', tool: toolName, args: toolArgs });
                        onUpdate({ type: 'log', message: `Executing tool: ${toolName}` });
                    }

                    const tool = this.tools.get(toolName);
                    let toolResult = "";

                    if (tool) {
                        try {
                            const result = await tool.execute(toolArgs);
                            toolResult = typeof result === 'string' ? result : JSON.stringify(result);
                        } catch (err) {
                            toolResult = `Error executing tool ${toolName}: ${err.message}`;
                        }
                    } else {
                        toolResult = `Error: Tool "${toolName}" not found.`;
                    }

                    console.log(chalk.blue(`[Tool] Result: ${toolResult.substring(0, 100)}...`));

                    // Add observation
                    this.memory.addMessage('assistant', JSON.stringify(action));
                    this.memory.addMessage('user', `Tool Output: ${toolResult}`);

                    if (onUpdate) onUpdate({ type: 'observation', message: toolResult.substring(0, 100) + "..." });
                }
            }

            // If we found an answer, we can stop, or we continue if there were tools
            if (finalAnswer) return finalAnswer;

            // If we executed tools but no answer yet, the loop continues to generate next response
            // unless we want to force an answer? usually LLM sees tool output and generates answer next turn.
            if (actions.some(a => a.tool)) continue;

            return "Error: No valid action found.";
        }

        return "Error: Maximum turns reached.";
    }
}
