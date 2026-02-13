import si from 'systeminformation';
import { BaseTool } from './base.js';
import fs from 'fs/promises';

export class SystemInfoTool extends BaseTool {
    constructor() {
        super(
            'system_info',
            'Get current system information including CPU, memory, temperature, and disk usage',
            {
                type: 'object',
                properties: {
                    detailed: {
                        type: 'boolean',
                        description: 'Get detailed system information'
                    }
                }
            }
        );
    }

    async execute(args) {
        try {
            const detailed = args.detailed || false;

            const [cpu, mem, temp, disk, load, os] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.cpuTemperature(),
                si.fsSize(),
                si.currentLoad(),
                si.osInfo()
            ]);

            const info = {
                os: `${os.distro} ${os.release} (${os.platform})`,
                cpu: {
                    model: cpu.manufacturer + ' ' + cpu.brand,
                    cores: cpu.cores,
                    speed: cpu.speed + ' GHz',
                    temperature: temp.main ? temp.main.toFixed(1) + '°C' : 'N/A',
                    load: load.currentLoad.toFixed(1) + '%'
                },
                memory: {
                    total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    used: (mem.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    free: (mem.free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    usage: ((mem.used / mem.total) * 100).toFixed(1) + '%'
                },
                disk: disk.map(d => ({
                    mount: d.mount,
                    size: (d.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    used: (d.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    usage: d.use.toFixed(1) + '%'
                }))
            };

            if (detailed) {
                const [network, uptime] = await Promise.all([
                    si.networkStats(),
                    si.time()
                ]);

                info.uptime = Math.floor(uptime.uptime / 3600) + ' hours';
                info.network = network.map(n => ({
                    interface: n.iface,
                    rx: (n.rx_bytes / 1024 / 1024).toFixed(2) + ' MB',
                    tx: (n.tx_bytes / 1024 / 1024).toFixed(2) + ' MB'
                }));
            }

            return JSON.stringify(info, null, 2);
        } catch (error) {
            return `Error getting system info: ${error.message}`;
        }
    }
}

export class ThrottleDetectionTool extends BaseTool {
    constructor() {
        super(
            'check_cpu_throttling',
            'Check if CPU is being throttled due to temperature on Raspberry Pi',
            { type: 'object', properties: {} }
        );
    }

    async execute(args) {
        try {
            // Check for Raspberry Pi throttling
            // This file exists on Raspberry Pi systems
            try {
                const throttled = await fs.readFile('/sys/devices/platform/soc/soc:firmware/get_throttled', 'utf8');
                const value = parseInt(throttled.trim(), 16);
                
                const status = {
                    raw: '0x' + value.toString(16),
                    underVoltage: !!(value & 0x1),
                    cpuThrottled: !!(value & 0x2),
                    tempLimitActive: !!(value & 0x4),
                    underVoltageOccurred: !!(value & 0x10000),
                    throttlingOccurred: !!(value & 0x20000),
                    tempLimitOccurred: !!(value & 0x40000)
                };

                let warnings = [];
                if (status.underVoltage) warnings.push('⚠️ Under-voltage detected!');
                if (status.cpuThrottled) warnings.push('🔥 CPU is currently throttled!');
                if (status.tempLimitActive) warnings.push('🌡️ Temperature limit active!');

                return JSON.stringify({
                    ...status,
                    warnings: warnings.length > 0 ? warnings : ['✅ No throttling detected'],
                    recommendation: warnings.length > 0 ? 
                        'Consider improving cooling or power supply' : 'System running normally'
                }, null, 2);
            } catch (e) {
                // Not a Raspberry Pi or file not accessible
                const temp = await si.cpuTemperature();
                return JSON.stringify({
                    message: 'Not a Raspberry Pi or throttling info not available',
                    currentTemp: temp.main ? temp.main.toFixed(1) + '°C' : 'N/A'
                }, null, 2);
            }
        } catch (error) {
            return `Error checking throttling: ${error.message}`;
        }
    }
}

export class MemoryStatsTool extends BaseTool {
    constructor(agent) {
        super(
            'get_memory_stats',
            'Get agent memory usage statistics',
            { type: 'object', properties: {} }
        );
        this.agent = agent;
    }

    async execute(args) {
        try {
            if (!this.agent || !this.agent.memory) {
                return 'Memory stats not available';
            }

            const stats = this.agent.memory.getStats();
            return JSON.stringify({
                messageCount: stats.messageCount,
                sizeKB: (stats.sizeBytes / 1024).toFixed(2),
                maxMessages: stats.maxMessages,
                maxSizeKB: (stats.maxSize / 1024).toFixed(2),
                utilization: ((stats.messageCount / stats.maxMessages) * 100).toFixed(1) + '%'
            }, null, 2);
        } catch (error) {
            return `Error getting memory stats: ${error.message}`;
        }
    }
}

export class ClearMemoryTool extends BaseTool {
    constructor(agent) {
        super(
            'clear_memory',
            'Clear agent conversation memory to free up resources',
            { type: 'object', properties: {} }
        );
        this.agent = agent;
    }

    async execute(args) {
        try {
            if (!this.agent || !this.agent.memory) {
                return 'Cannot clear memory - agent not available';
            }

            await this.agent.memory.clear();
            return 'Memory cleared successfully';
        } catch (error) {
            return `Error clearing memory: ${error.message}`;
        }
    }
}
