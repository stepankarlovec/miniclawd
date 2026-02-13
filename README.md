# MiniClawd - Lightweight AI Agent Framework

MiniClawd is a powerful, resource-efficient AI agent framework designed to run on devices ranging from Raspberry Pi to cloud servers. It provides a flexible agentic system with multiple interfaces (CLI, Web UI, Telegram Bot) and extensive tool integration.

## 🚀 Core Concept

MiniClawd transforms a Large Language Model into a **functional autonomous agent** that can:
- **Reason**: Analyze user intent and plan actions
- **Act**: Execute tools and commands in the real world
- **Observe**: Process results and iterate until task completion

The framework operates on a continuous **reason-act-observe loop**, making it capable of complex, multi-step tasks rather than just generating text.

## ⚡ Power Modes

MiniClawd features **two distinct operating modes** optimized for different hardware capabilities:

### 🔋 LOW POWER Mode
**Designed for**: Raspberry Pi, Edge Devices, Low-End Hardware

**Optimizations**:
- ✅ Minimal memory footprint (20 messages, ~49KB max)
- ✅ Current session only (no persistent history)
- ✅ Optimized for tiny models (llama3.2:1b, qwen:0.5b)
- ✅ Reduced context window
- ✅ Fast response times
- ✅ Runs on devices with < 2GB RAM

**Perfect for**: IoT devices, Raspberry Pi projects, always-on edge agents

### ⚡ HIGH POWER Mode  
**Designed for**: Desktop, Cloud, Powerful Servers

**Features**:
- ✅ Full conversation history (100+ messages)
- ✅ Extended context window (~195KB max)
- ✅ Support for larger models (llama3:8b, mistral:7b)
- ✅ Enhanced reasoning capabilities
- ✅ Complex multi-step task execution
- ✅ Complete memory persistence

**Perfect for**: Development workstations, cloud deployments, complex automation

## 🚀 Features

### Core Capabilities
- **Dual Power Modes**: LOW POWER (Raspberry Pi) and HIGH POWER (Desktop/Cloud)
- **Multi-Provider LLM Support**: Local Ollama or cloud OpenAI/Anthropic
- **Autonomous Agent Loop**: Reason → Act → Observe continuously
- **Tool Registry**: 15+ built-in tools with extensible framework
- **Multiple Interfaces**: CLI, Web Dashboard, Telegram Bot
- **Persistent Memory**: Conversation history with automatic pruning
- **Streaming Support**: Real-time LLM response streaming

### 🆕 Raspberry Pi Optimizations (v1.1)
- **Memory Management**: Automatic circular buffer with configurable limits
- **Hardware Metrics Caching**: 5-second TTL to reduce system calls
- **Pre-compiled Regex Patterns**: Faster JSON parsing in agent loop
- **Request Timeouts**: Prevent hanging on slow operations (30s default)
- **Streaming Support**: Reduced latency with LLM response streaming
- **CPU Throttle Detection**: Monitor Raspberry Pi thermal throttling
- **Temperature Alerts**: Automatic warnings when CPU exceeds thresholds

### 🤖 Autonomous Agent Architecture

MiniClawd implements a **modular orchestration layer** that transforms static LLMs into autonomous agents:

1. **Tool Registry**: Extensible system of capabilities (file ops, web browsing, APIs)
2. **Reasoning Engine**: LLM analyzes context and selects appropriate tools
3. **Execution Layer**: Sandboxed tool execution with error handling
4. **Memory System**: Persistent conversation state and context management
5. **Interface Adapters**: CLI, Web UI, Telegram for multi-channel access

**Reason-Act-Observe Loop**:
```
User Request → Agent Reasons → Selects Tool → Executes Action → 
Observes Result → Reasons Again → ... → Final Answer
```

This architecture enables:
- ✅ Multi-step task completion without human intervention
- ✅ Real-world interaction (file system, web, email)
- ✅ Self-correction based on tool feedback
- ✅ Complex workflow automation

### 🛠️ Built-in Tools

#### System & Performance
- `system_info` - Get CPU, memory, temperature, disk usage
- `check_cpu_throttling` - Detect Raspberry Pi throttling
- `get_memory_stats` - View agent memory utilization
- `clear_memory` - Free up memory resources
- `get_performance_metrics` - Track LLM and tool performance

#### File System
- `list_dir` - Browse directories
- `read_file` - Read file contents
- `write_file` - Create/modify files

#### Execution
- `run_command` - Execute shell commands
- `execute_code` - Run scripts (JS, Python, Bash, PowerShell)

#### Web & API
- `search_web` - DuckDuckGo search
- `read_web_page` - Extract page content
- `weather` - Get weather data (Open-Meteo)
- `crypto_price` - Cryptocurrency prices (CoinGecko)
- `random_fact` - Fun facts

#### Email
- `gmail_auth` - Authenticate with Gmail
- `gmail_send` - Send emails
- `gmail_read` - Read inbox

## 📦 Installation

### Quick Install (Raspberry Pi)
```bash
curl -fsSL https://raw.githubusercontent.com/stepankarlovec/miniclawd/main/install.sh | bash
```

### Manual Installation
```bash
# Clone repository
git clone https://github.com/stepankarlovec/miniclawd.git
cd miniclawd

# Install dependencies
npm install

# Run configuration wizard
npm run setup

# Start the agent
npm start
```

## ⚙️ Configuration

The configuration wizard (`npm run setup`) will help you configure:
- **Power Mode**: LOW POWER (Raspberry Pi) or HIGH POWER (Desktop/Cloud)
- **LLM Provider**: Ollama (local) or OpenAI (API)
- **Model Selection**: Optimized defaults for each power mode
- **Web Server**: Dashboard settings
- **Telegram Bot**: Optional integration
- **Gmail**: Optional email integration

### Power Mode Comparison

| Feature | LOW POWER | HIGH POWER |
|---------|-----------|------------|
| **Target Hardware** | Raspberry Pi, Edge | Desktop, Cloud |
| **Memory Limit** | 20 messages (~49KB) | 100 messages (~195KB) |
| **History** | Current session only | Full conversation |
| **Recommended Models (Ollama)** | llama3.2:1b, qwen:0.5b | llama3:8b, mistral:7b |
| **Recommended Models (OpenAI)** | gpt-4o-mini | gpt-4o |
| **Context Window** | Minimal | Extended |
| **Use Case** | IoT, Edge AI, Always-on | Complex tasks, Development |

## 🎯 Usage Examples

### CLI Mode
```bash
npm start
```

### Systemd Service (24/7 Operation)
```bash
# Enable auto-start on boot
sudo systemctl enable miniclawd

# Start service
sudo systemctl start miniclawd

# Check status
sudo systemctl status miniclawd

# View logs
sudo journalctl -u miniclawd -f
```

### Web Dashboard
Access at `http://raspberry-pi-ip:3000`
- Real-time system health monitoring
- CPU temperature, memory, disk usage
- Agent configuration management
- Conversation interface

### Telegram Bot
Configure via setup wizard, then chat with your agent on Telegram!

## 🔧 Performance Tuning

### LOW POWER Mode - Raspberry Pi 3/4
```json
{
  "llm_provider": "ollama",
  "model_name": "llama3.2:1b",
  "power_mode": "LOW_POWER",
  "enable_streaming": true
}
```

### LOW POWER Mode - Raspberry Pi Zero/1/2
```json
{
  "llm_provider": "ollama",
  "model_name": "qwen:0.5b",
  "power_mode": "LOW_POWER"
}
```

### HIGH POWER Mode - Desktop/Server with GPU
```json
{
  "llm_provider": "ollama",
  "model_name": "llama3:8b",
  "power_mode": "HIGH_POWER",
  "enable_streaming": true
}
```

### Using Cloud API (Both Power Modes)
```json
{
  "llm_provider": "openai",
  "model_name": "gpt-4o-mini",
  "power_mode": "LOW_POWER",
  "openai_api_key": "sk-..."
}
```

## 📊 Monitoring

Check system performance:
```
You: Check system info
Agent: (uses system_info tool)

You: Check if CPU is throttling
Agent: (uses check_cpu_throttling tool)

You: Show memory usage
Agent: (uses get_memory_stats tool)
```

## 🧪 Testing

Run the test suite to verify installation:
```bash
# Run all tests
npm test

# Run interactive demonstration
npm run test:demo
```

The test suite verifies:
- ✅ LOW POWER mode configuration (20 msgs, ~49KB)
- ✅ HIGH POWER mode configuration (100 msgs, ~195KB)
- ✅ Backward compatibility with legacy profiles
- ✅ Memory limits for each mode
- ✅ Agent reasoning loop execution

## 🔒 Security Notes

- Gmail OAuth credentials stored in `data/gmail_credentials.json`
- Telegram approval system via `approved_telegram_ids` in config
- File system tools operate within working directory
- Command execution available - restrict access appropriately

## 🤝 Contributing

Contributions welcome! Please ensure:
- Code follows existing patterns
- New tools extend `BaseTool` class
- Performance optimizations preserve functionality
- Documentation updated for new features

## 📝 License

ISC License - See LICENSE file

## 🐛 Troubleshooting

### High CPU Temperature
```bash
# Check throttling status
vcgencmd get_throttled

# Improve cooling or reduce load by using low profile
```

### Out of Memory
The agent now automatically prunes old messages, but you can manually clear:
```
You: Clear memory
Agent: (uses clear_memory tool)
```

### Ollama Connection Issues
```bash
# Verify Ollama is running
curl http://127.0.0.1:11434

# Install/start Ollama
curl https://ollama.ai/install.sh | sh
ollama serve
```

## 🎓 Advanced Topics

### Custom Tools
Create new tools by extending `BaseTool`:
```javascript
import { BaseTool } from './base.js';

export class MyCustomTool extends BaseTool {
    constructor() {
        super('my_tool', 'Description', { /* schema */ });
    }
    
    async execute(args) {
        // Your logic here
        return "Result";
    }
}
```

### Memory Limits
Customize in `src/core/agent.js`:
```javascript
const memoryOptions = {
    maxMessages: 50,    // Max conversation turns
    maxSize: 50000      // Max bytes (50KB)
};
```

## 📈 Changelog

### v1.2.0 (Current - Power Modes Update)
- ✅ **LOW POWER Mode**: Optimized for Raspberry Pi/Edge devices (minimal memory, concise prompts)
- ✅ **HIGH POWER Mode**: Full-featured agent for desktop/cloud (extended history, detailed reasoning)
- ✅ Power mode normalization with backward compatibility
- ✅ Enhanced model selection (support for llama3.2:1b, qwen:0.5b, and larger models)
- ✅ Updated setup wizard with clear power mode options
- ✅ Fixed JSON parsing bug for nested objects
- ✅ Fixed tool execution bug (execute method)
- ✅ Comprehensive test suite
- ✅ Updated documentation with power mode explanations

### v1.1.0
- ✅ Memory auto-pruning with circular buffer
- ✅ Hardware metrics caching (5s TTL)
- ✅ Pre-compiled regex patterns
- ✅ Request timeout handling
- ✅ Streaming response support
- ✅ CPU throttle detection tool
- ✅ Performance metrics tracking
- ✅ Temperature alert system
- ✅ Enhanced system monitoring tools

### v1.0.0
- Initial release
- Basic agent framework
- Tool system
- Web/Telegram interfaces

---

Made with ❤️ for Raspberry Pi and edge AI
