import 'dotenv/config';

export class OpenAIProvider {
    constructor(apiKey, modelName = 'gpt-3.5-turbo') {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY;
        this.modelName = modelName;
    }

    async chat(messages) {
        if (!this.apiKey) {
            throw new Error("OpenAI API Key not provided. Set OPENAI_API_KEY in .env");
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: messages
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`OpenAI API Error: ${err}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("OpenAI Chat Error:", error);
            throw error;
        }
    }
}
