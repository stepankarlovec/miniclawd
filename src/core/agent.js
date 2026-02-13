import { Memory } from './memory.js';
import chalk from 'chalk';

export class Agent {
    constructor(llm, tools = [], options = {}) {
        this.llm = llm;
        this.tools = new Map(tools.map(tool => [tool.name, tool]));
        this.memory = new Memory(options.memoryPath);
        this.systemPrompt = this._buildSystemPrompt();
    }

    _buildSystemPrompt() {
        const toolDescriptions = Array.from(this.tools.values())
            .map(tool => `- ${tool.name}: ${tool.description} (Args: ${JSON.stringify(tool.schema.shape)})`) // simplified schema rep
            .join('\n');

        return `You are a helpful AI assistant. You have access to the following tools:

${toolDescriptions}

You must respond in strictly VALID JSON format. Do not add any markdown formatting or explanations outside the JSON.
Depending on what you want to do, your JSON response should be one of the following two schemas:

1. To use a tool:
{
  "tool": "tool_name",
  "args": { ... }
}

2. To provide a final answer to the user:
{
  "answer": "your final response here"
}

IMPORTANT:
- RESPONSE MUST BE ONLY JSON.
- DO NOT PREPEND "Here is the JSON" OR MARKDOWN BACKTICKS.
- IF YOU ARE UNSURE, USE THE "answer" SCHEMA TO ASK FOR CLARIFICATION.

Example 1 (Using a tool):
{
  "tool": "read_file",
  "args": { "path": "./README.md" }
}

Example 2 (Final answer):
{
  "answer": "The file contains instructions on how to set up the project."
}
`;
    }

    async run(userInput) {
        await this.memory.init();
        this.memory.addMessage('user', userInput);

        let steps = 0;
        const maxSteps = 10;

        while (steps < maxSteps) {
            console.log(chalk.gray(`Thinking... (Step ${steps + 1})`));

            // Construct messages for LLM
            const messages = [
                { role: 'system', content: this.systemPrompt },
                ...this.memory.getMessages()
            ];

            const response = await this.llm.chat(messages);

            // Try to parse parsing JSON
            let action;
            try {
                // Strip markdown code blocks if present
                const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
                action = JSON.parse(jsonStr);
            } catch (e) {
                console.warn(chalk.yellow("Failed to parse JSON response. Raw response:"), response);
                // If parsing fails, treat as a final answer if it looks like text, or retry?
                // For now, let's treat as answer to be robust.
                return response;
            }

            if (action.answer) {
                this.memory.addMessage('assistant', action.answer);
                return action.answer;
            }

            if (action.tool) {
                const tool = this.tools.get(action.tool);
                if (tool) {
                    console.log(chalk.blue(`Executing tool: ${action.tool} with args:`), action.args);
                    try {
                        const result = await tool.execute(action.args);
                        this.memory.addMessage('assistant', JSON.stringify(action)); // Log the tool call
                        this.memory.addMessage('user', `Tool Output: ${result}`); // Log the output
                    } catch (error) {
                        this.memory.addMessage('assistant', JSON.stringify(action));
                        this.memory.addMessage('user', `Tool Execution Error: ${error.message}`);
                    }
                } else {
                    this.memory.addMessage('user', `Error: Tool '${action.tool}' not found.`);
                }
            } else {
                // Fallback if JSON is valid but neither tool nor answer
                this.memory.addMessage('assistant', JSON.stringify(action));
                return "I'm not sure what to do with this response: " + JSON.stringify(action);
            }

            steps++;
        }

        return "Agent step limit reached.";
    }
}
