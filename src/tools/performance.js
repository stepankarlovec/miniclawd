import { BaseTool } from './base.js';

// Simple performance tracking utility
class PerformanceTracker {
    constructor() {
        this.metrics = {
            llmCalls: 0,
            toolCalls: 0,
            totalTime: 0,
            averageTime: 0,
            toolStats: {}
        };
        this.startTime = Date.now();
    }

    recordLLMCall(duration) {
        this.metrics.llmCalls++;
        this.metrics.totalTime += duration;
        this.metrics.averageTime = this.metrics.totalTime / this.metrics.llmCalls;
    }

    recordToolCall(toolName, duration) {
        this.metrics.toolCalls++;
        if (!this.metrics.toolStats[toolName]) {
            this.metrics.toolStats[toolName] = { calls: 0, totalTime: 0, avgTime: 0 };
        }
        this.metrics.toolStats[toolName].calls++;
        this.metrics.toolStats[toolName].totalTime += duration;
        this.metrics.toolStats[toolName].avgTime = 
            this.metrics.toolStats[toolName].totalTime / this.metrics.toolStats[toolName].calls;
    }

    getStats() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.startTime,
            uptimeFormatted: this._formatDuration(Date.now() - this.startTime)
        };
    }

    reset() {
        this.metrics = {
            llmCalls: 0,
            toolCalls: 0,
            totalTime: 0,
            averageTime: 0,
            toolStats: {}
        };
        this.startTime = Date.now();
    }

    _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

// Global tracker instance
export const perfTracker = new PerformanceTracker();

export class PerformanceMetricsTool extends BaseTool {
    constructor() {
        super(
            'get_performance_metrics',
            'Get performance metrics for LLM and tool calls',
            {
                type: 'object',
                properties: {
                    reset: {
                        type: 'boolean',
                        description: 'Reset metrics after retrieving'
                    }
                }
            }
        );
    }

    async execute(args) {
        try {
            const stats = perfTracker.getStats();
            
            const report = {
                uptime: stats.uptimeFormatted,
                llm: {
                    totalCalls: stats.llmCalls,
                    averageTime: stats.averageTime.toFixed(2) + 'ms'
                },
                tools: {
                    totalCalls: stats.toolCalls,
                    breakdown: Object.entries(stats.toolStats).map(([name, stat]) => ({
                        tool: name,
                        calls: stat.calls,
                        avgTime: stat.avgTime.toFixed(2) + 'ms'
                    }))
                }
            };

            if (args.reset) {
                perfTracker.reset();
            }

            return JSON.stringify(report, null, 2);
        } catch (error) {
            return `Error getting performance metrics: ${error.message}`;
        }
    }
}
