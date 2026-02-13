# MiniClawd - Lightweight AI Agent Framework

MiniClawd is a powerful, resource-efficient AI agent framework designed to run on devices like Raspberry Pi. It provides a flexible agentic system with multiple interfaces (CLI, Web UI, Telegram Bot) and extensive tool integration.

## 🚀 Features

### Core Capabilities
- **Multi-Provider LLM Support**: Works with local Ollama models or cloud OpenAI
- **Agentic Tool Execution**: Autonomous task completion with 15+ built-in tools
- **Multiple Interfaces**: CLI, Web Dashboard, Telegram Bot
- **Persistent Memory**: Conversation history with automatic pruning
- **Profile-Based Operation**: Switch between high-end, low-end, and chat modes

### 🆕 Raspberry Pi Optimizations (v1.1)
- **Memory Management**: Automatic circular buffer with configurable limits
- **Hardware Metrics Caching**: 5-second TTL to reduce system calls
- **Pre-compiled Regex Patterns**: Faster JSON parsing in agent loop
- **Request Timeouts**: Prevent hanging on slow operations (30s default)
- **Streaming Support**: Reduced latency with LLM response streaming
- **CPU Throttle Detection**: Monitor Raspberry Pi thermal throttling
- **Temperature Alerts**: Automatic warnings when CPU exceeds thresholds

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
- LLM provider (Ollama or OpenAI)
- Model selection (optimized defaults for Raspberry Pi)
- Agent profile (high/low/chat)
- Web server settings
- Telegram bot integration (optional)
- Gmail integration (optional)

### Agent Profiles

| Profile | Memory | Tools | Use Case |
|---------|--------|-------|----------|
| **high** | Full history (100 msgs) | All tools enabled | Full-featured agent on capable hardware |
| **low** | Current session only (20 msgs) | All tools enabled | Resource-constrained devices (Raspberry Pi) |
| **chat** | No history | No tools | Fast Q&A without tools |

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

### For Raspberry Pi 3/4
```json
{
  "llm_provider": "ollama",
  "model_name": "qwen2.5:0.5b",
  "agent_profile": "low",
  "enable_streaming": true
}
```

### For Raspberry Pi Zero/1/2
Consider using an even smaller model or cloud API:
```json
{
  "llm_provider": "ollama",
  "model_name": "qwen2.5:0.5b",
  "agent_profile": "low"
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

### v1.1.0 (Current)
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
