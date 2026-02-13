# Ollama Troubleshooting Guide

This guide helps you diagnose and fix common Ollama connectivity and response issues.

## Quick Diagnostics

Run this command to check Ollama status:
```bash
curl http://127.0.0.1:11434/api/tags
```

**Good response**: You'll see JSON with `{"models": [...]}`
**Bad response**: Connection refused or timeout

---

## Problem 1: "Cannot connect to Ollama" / "Not getting any response"

### Symptoms
- Error: `Cannot connect to Ollama at http://127.0.0.1:11434`
- Error: `ECONNREFUSED`
- Application hangs or times out when trying to use Ollama

### Root Causes
1. Ollama is not installed
2. Ollama is installed but not running
3. Ollama is running on a different port/host

### Solutions

#### Step 1: Check if Ollama is installed
```bash
which ollama
ollama --version
```

If not installed:
```bash
# Install Ollama (Linux/macOS/WSL)
curl -fsSL https://ollama.ai/install.sh | sh

# Or use the installer script
./install.sh
```

#### Step 2: Start Ollama service
```bash
# Start Ollama server
ollama serve
```

**Note**: Keep this terminal open, or run in background:
```bash
nohup ollama serve > /tmp/ollama.log 2>&1 &
```

#### Step 3: Verify Ollama is running
```bash
curl http://127.0.0.1:11434
```

Should return: `Ollama is running`

---

## Problem 2: "Model not found" / Empty model list

### Symptoms
- Error: `model 'llama3.2:1b' not found`
- Setup wizard shows "No models available"
- Ollama is running but no responses

### Solutions

#### Check installed models
```bash
ollama list
```

#### Pull required model
```bash
# For Raspberry Pi 3/4 (LOW POWER)
ollama pull llama3.2:1b

# For Raspberry Pi Zero/1/2 (ultra lightweight)
ollama pull qwen:0.5b
ollama pull qwen2.5:0.5b

# For Desktop/Server (HIGH POWER)
ollama pull llama3:8b
ollama pull mistral:7b
```

#### Verify model is loaded
```bash
ollama list
```

---

## Problem 3: Slow or Timeout Responses

### Symptoms
- Error: `Request timeout after 60000ms`
- Very slow responses (> 1 minute)
- First response is slow, subsequent ones are faster

### Diagnostics

Check MiniClawd logs for timing info:
```
[Ollama] Chat completed in 45000ms  # ← This shows actual duration
[Ollama] Time to First Byte: 2000ms # ← Time for first response chunk
```

### Solutions

#### 1. Use a smaller model
Your current model may be too large for your hardware.

**Raspberry Pi Zero/1/2**:
```bash
ollama pull qwen:0.5b    # 0.5B parameters
```

**Raspberry Pi 3/4**:
```bash
ollama pull llama3.2:1b  # 1B parameters
```

#### 2. Increase timeout in config
Edit `data/config.json`:
```json
{
  "timeout": 90000  // Increase to 90 seconds
}
```

Or set in code (advanced):
```javascript
const llm = new OllamaProvider('llama3.2:1b', { 
    timeout: 90000  // 90 seconds
});
```

#### 3. Enable streaming for faster perceived response
Edit `data/config.json`:
```json
{
  "enable_streaming": true
}
```

This shows results as they're generated instead of waiting for completion.

#### 4. Check for CPU throttling (Raspberry Pi)
```bash
vcgencmd get_throttled
```

If throttled:
- Improve cooling (heatsink, fan)
- Reduce load on device
- Use a smaller model

---

## Problem 4: First run is slow, subsequent runs are fast

### Cause
Model needs to be loaded into memory on first use.

### Solution
This is **normal behavior**. The model stays in memory after first load.

To pre-warm the model:
```bash
ollama run llama3.2:1b "Hello"
```

---

## Problem 5: Ollama works from CLI but not from MiniClawd

### Diagnostics

Test Ollama directly:
```bash
curl http://127.0.0.1:11434/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "Say hello",
  "stream": false
}'
```

If this works but MiniClawd doesn't, check:

#### 1. Config file is correct
```bash
cat data/config.json
```

Should have:
```json
{
  "llm_provider": "ollama",
  "model_name": "llama3.2:1b"
}
```

#### 2. Model name matches exactly
```bash
ollama list
```

Model names are case-sensitive and must match exactly.

#### 3. Run the test suite
```bash
npm run test:ollama
```

This will show detailed diagnostics.

---

## Problem 6: Memory issues / System crashes

### Symptoms
- System becomes unresponsive
- Out of memory errors
- Ollama crashes

### Solutions

#### 1. Use smaller model
```bash
ollama pull qwen:0.5b  # Only ~300MB RAM
```

#### 2. Close other applications
Free up RAM before running Ollama.

#### 3. Add swap space (Raspberry Pi)
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### 4. Use LOW POWER mode
Edit `data/config.json`:
```json
{
  "power_mode": "LOW_POWER"
}
```

---

## Verification Checklist

Use this checklist to verify your Ollama setup:

- [ ] Ollama is installed: `ollama --version`
- [ ] Ollama is running: `curl http://127.0.0.1:11434`
- [ ] At least one model is installed: `ollama list`
- [ ] Model works from CLI: `ollama run llama3.2:1b "hello"`
- [ ] MiniClawd config has correct provider: `cat data/config.json | grep llm_provider`
- [ ] MiniClawd config has correct model: `cat data/config.json | grep model_name`
- [ ] Model name matches exactly: compare `ollama list` with config
- [ ] Test suite passes: `npm run test:ollama`

---

## Getting Detailed Logs

### MiniClawd logs with verbose Ollama output

MiniClawd now includes verbose Ollama logging by default. Look for lines like:
```
[Ollama] Starting chat request...
[Ollama] Model: llama3.2:1b
[Ollama] Messages count: 2
[Ollama] Chat completed in 1250ms
```

### Ollama service logs

If running Ollama as a service:
```bash
journalctl -u ollama -f
```

If running manually:
```bash
# Check the log file
tail -f /tmp/ollama.log
```

### Enable debug mode

For maximum verbosity:
```bash
OLLAMA_DEBUG=1 ollama serve
```

---

## Still Having Issues?

### Run the automated test
```bash
npm run test:ollama
```

This will:
1. Check Ollama connectivity
2. List available models
3. Test a simple chat request
4. Show detailed error messages

### Common error messages and fixes

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `ECONNREFUSED` | Ollama not running | Run `ollama serve` |
| `model 'X' not found` | Model not pulled | Run `ollama pull X` |
| `timeout after 60000ms` | Model too large/slow | Use smaller model or increase timeout |
| `Cannot find module 'ollama'` | Dependencies not installed | Run `npm install` |
| `404 Not Found` | Wrong endpoint | Check if using `http://127.0.0.1:11434` |

### Report an issue

If you're still stuck, please provide:
1. Output of `ollama --version`
2. Output of `ollama list`
3. Output of `npm run test:ollama`
4. Your `data/config.json` (without sensitive info)
5. MiniClawd error logs
6. Hardware specs (Raspberry Pi model, RAM, etc.)

---

## Additional Resources

- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [MiniClawd Ollama Improvements Guide](./OLLAMA_IMPROVEMENTS.md)
- [MiniClawd Power Modes Guide](../POWER_MODES_IMPLEMENTATION.md)
- [Ollama Model Library](https://ollama.ai/library)
