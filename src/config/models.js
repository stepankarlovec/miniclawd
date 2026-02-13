/**
 * Model Configuration for MiniClawd
 * Defines available models for each LLM provider
 * Optimized for both LOW POWER (Raspberry Pi/Edge) and HIGH POWER (Desktop/Cloud) modes
 */

export const AVAILABLE_MODELS = {
    ollama: [
        // Ultra-lightweight models for LOW POWER mode on Raspberry Pi Zero/1/2
        { value: 'qwen:0.5b', label: 'Qwen (0.5B) - Ultra Light', description: 'Best for Raspberry Pi Zero/1/2 (LOW POWER)' },
        { value: 'qwen2.5:0.5b', label: 'Qwen 2.5 (0.5B) - Ultra Light', description: 'Best for Raspberry Pi Zero/1/2 (LOW POWER)' },
        
        // Lightweight models for LOW POWER mode on Raspberry Pi 3/4
        { value: 'llama3.2:1b', label: 'Llama 3.2 (1B) - Fast & Efficient', description: 'Best for Raspberry Pi 3/4 (LOW POWER)' },
        { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 (1.5B) - Balanced', description: 'Good balance for Raspberry Pi 3/4 (LOW POWER)' },
        { value: 'phi3:mini', label: 'Phi-3 Mini (3.8B) - Balanced', description: 'Good for Raspberry Pi 4/5 (LOW POWER)' },
        
        // Larger models for HIGH POWER mode on desktop/server
        { value: 'qwen2.5:3b', label: 'Qwen 2.5 (3B) - More Capable', description: 'Better quality, needs Pi 4+ with 4GB RAM (HIGH POWER)' },
        { value: 'llama3.2:3b', label: 'Llama 3.2 (3B) - Enhanced', description: 'Desktop/Server (HIGH POWER)' },
        { value: 'llama3:8b', label: 'Llama 3 (8B) - Powerful', description: 'Desktop/Server with GPU (HIGH POWER)' },
        { value: 'mistral:7b', label: 'Mistral (7B) - Advanced', description: 'Desktop/Server with GPU (HIGH POWER)' }
    ],
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini - Cheapest & Fast', description: '$0.15/1M input tokens (both modes)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo - Reliable', description: '$0.50/1M input tokens (both modes)' },
        { value: 'gpt-4o', label: 'GPT-4o - Most Capable', description: '$2.50/1M input tokens (HIGH POWER)' },
        { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o Mini (Legacy)', description: 'Older snapshot' }
    ]
};

export const DEFAULT_MODELS = {
    ollama: 'llama3.2:1b',  // Default to 1B model for good balance
    openai: 'gpt-4o-mini'   // Default to cheapest OpenAI option
};

// Recommended models by power mode
export const RECOMMENDED_MODELS = {
    LOW_POWER: {
        ollama: ['qwen:0.5b', 'qwen3:0.6b', 'llama3.2:1b'],
        openai: ['gpt-4o-mini', 'gpt-3.5-turbo']
    },
    HIGH_POWER: {
        ollama: ['llama3.2:3b', 'llama3:8b', 'mistral:7b'],
        openai: ['gpt-4o', 'gpt-4o-mini']
    }
};
