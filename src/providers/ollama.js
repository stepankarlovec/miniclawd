import ollama from 'ollama';

export class OllamaProvider {
    /**
     * @param {string} modelName - e.g. 'llama3.2:1b'
     */
    constructor(modelName = 'llama3.2:1b') {
        this.modelName = modelName;
    }

    async generate(prompt) {
        try {
            const response = await ollama.generate({
                model: this.modelName,
                prompt: prompt,
                stream: false,
            });
            return response.response;
        } catch (error) {
            console.error("Ollama Generation Error:", error);
            throw error;
        }
    }

    async chat(messages) {
        try {
            const response = await ollama.chat({
                model: this.modelName,
                messages: messages,
                stream: false
            });
            return response.message.content;
        } catch (error) {
            console.error("Ollama Chat Error:", error);
            throw error;
        }
    }
}
