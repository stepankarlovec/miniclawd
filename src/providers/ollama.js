import ollama from 'ollama';

export class OllamaProvider {
    /**
     * @param {string} modelName - e.g. 'llama3.2:1b'
     * @param {object} options - Additional options like timeout
     */
    constructor(modelName = 'llama3.2:1b', options = {}) {
        this.modelName = modelName;
        this.timeout = options.timeout || 30000; // Default 30s timeout
        this.enableStreaming = options.enableStreaming || false;
    }

    async generate(prompt) {
        try {
            const response = await this._withTimeout(
                ollama.generate({
                    model: this.modelName,
                    prompt: prompt,
                    stream: false,
                }),
                this.timeout
            );
            return response.response;
        } catch (error) {
            console.error("Ollama Generation Error:", error);
            throw error;
        }
    }

    async chat(messages, onStream = null) {
        try {
            // Support streaming if callback provided and enabled
            if (this.enableStreaming && onStream) {
                let fullResponse = '';
                const stream = await ollama.chat({
                    model: this.modelName,
                    messages: messages,
                    stream: true
                });

                for await (const chunk of stream) {
                    const content = chunk.message?.content || '';
                    fullResponse += content;
                    onStream(content);
                }
                return fullResponse;
            } else {
                // Non-streaming mode with timeout
                const response = await this._withTimeout(
                    ollama.chat({
                        model: this.modelName,
                        messages: messages,
                        stream: false
                    }),
                    this.timeout
                );
                return response.message.content;
            }
        } catch (error) {
            console.error("Ollama Chat Error:", error);
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
