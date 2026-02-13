/**
 * Model Configuration for MiniClawd
 * Defines available models for each LLM provider
 */

export const AVAILABLE_MODELS = {
    ollama: [
        { value: 'llama3.2:1b', label: 'Llama 3.2 (1B) - Fast & Efficient', description: 'Best for Raspberry Pi 3/4' },
        { value: 'qwen3:0.6b', label: 'Qwen 3 (0.6B) - Ultra Light', description: 'Best for Raspberry Pi Zero/1/2' }
    ],
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini - Cheapest & Fast', description: '$0.15/1M input tokens' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo - Reliable', description: '$0.50/1M input tokens' },
        { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini (Legacy)', description: 'Older snapshot' }
    ]
};

export const DEFAULT_MODELS = {
    ollama: 'llama3.2:1b',
    openai: 'gpt-4o-mini'
};
