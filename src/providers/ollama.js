import ollama from 'ollama';
import chalk from 'chalk';

export class OllamaProvider {
    /**
     * @param {string} modelName - e.g. 'llama3.2:1b'
     * @param {object} options - Additional options like timeout
     */
    constructor(modelName = 'llama3.2:1b', options = {}) {
        this.modelName = modelName;
        this.timeout = options.timeout || 60000; // Increased from 30s to 60s timeout for slower devices
        this.enableStreaming = options.enableStreaming || false;
        this.verbose = options.verbose !== false; // Enable verbose logging by default
    }

    async generate(prompt) {
        const startTime = Date.now();
        try {
            if (this.verbose) {
                console.log(chalk.cyan('[Ollama] Starting generate request...'));
                console.log(chalk.gray(`[Ollama] Model: ${this.modelName}`));
                console.log(chalk.gray(`[Ollama] Prompt length: ${prompt.length} chars`));
            }

            const response = await this._withTimeout(
                ollama.generate({
                    model: this.modelName,
                    prompt: prompt,
                    stream: false,
                }),
                this.timeout
            );

            const duration = Date.now() - startTime;
            if (this.verbose) {
                console.log(chalk.green(`[Ollama] Generate completed in ${duration}ms`));
                console.log(chalk.gray(`[Ollama] Response length: ${response.response?.length || 0} chars`));
            }

            return response.response;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(chalk.red(`[Ollama] Generation Error after ${duration}ms:`), error);
            console.error(chalk.red(`[Ollama] Model: ${this.modelName}`));
            console.error(chalk.red(`[Ollama] Error details: ${error.message}`));
            throw error;
        }
    }

    async chat(messages, onStream = null) {
        const startTime = Date.now();
        try {
            if (this.verbose) {
                console.log(chalk.cyan('[Ollama] Starting chat request...'));
                console.log(chalk.gray(`[Ollama] Model: ${this.modelName}`));
                console.log(chalk.gray(`[Ollama] Messages count: ${messages.length}`));
                console.log(chalk.gray(`[Ollama] Streaming: ${this.enableStreaming && onStream ? 'enabled' : 'disabled'}`));
            }

            // Support streaming if callback provided and enabled
            if (this.enableStreaming && onStream) {
                if (this.verbose) {
                    console.log(chalk.cyan('[Ollama] Using streaming mode...'));
                }

                let fullResponse = '';
                let firstChunkTime = null;
                const stream = await ollama.chat({
                    model: this.modelName,
                    messages: messages,
                    stream: true
                });

                for await (const chunk of stream) {
                    if (!firstChunkTime) {
                        firstChunkTime = Date.now();
                        const ttfb = firstChunkTime - startTime; // Time to first byte
                        if (this.verbose) {
                            console.log(chalk.green(`[Ollama] First chunk received after ${ttfb}ms (TTFB)`));
                        }
                    }

                    const content = chunk.message?.content || '';
                    fullResponse += content;
                    onStream(content);
                }

                const duration = Date.now() - startTime;
                if (this.verbose) {
                    console.log(chalk.green(`[Ollama] Streaming completed in ${duration}ms`));
                    console.log(chalk.gray(`[Ollama] Total response length: ${fullResponse.length} chars`));
                }

                return fullResponse;
            } else {
                if (this.verbose) {
                    console.log(chalk.cyan('[Ollama] Using non-streaming mode...'));
                }

                // Non-streaming mode with timeout
                const response = await this._withTimeout(
                    ollama.chat({
                        model: this.modelName,
                        messages: messages,
                        stream: false
                    }),
                    this.timeout
                );

                const duration = Date.now() - startTime;
                if (this.verbose) {
                    console.log(chalk.green(`[Ollama] Chat completed in ${duration}ms`));
                    console.log(chalk.gray(`[Ollama] Response length: ${response.message?.content?.length || 0} chars`));
                }

                return response.message.content;
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(chalk.red(`[Ollama] Chat Error after ${duration}ms:`), error);
            console.error(chalk.red(`[Ollama] Model: ${this.modelName}`));
            console.error(chalk.red(`[Ollama] Messages: ${JSON.stringify(messages.slice(0, 2))}...`));
            console.error(chalk.red(`[Ollama] Error details: ${error.message}`));

            // Check if Ollama is running
            try {
                await fetch('http://127.0.0.1:11434');
            } catch (e) {
                console.error(chalk.red('[Ollama] WARNING: Cannot connect to Ollama at http://127.0.0.1:11434'));
                console.error(chalk.red('[Ollama] Make sure Ollama is running: ollama serve'));
            }

            throw error;
        }
    }

    // Helper to add timeout to promises
    _withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    }
}
