# Ollama Provider Improvements

## Overview

This document describes the improvements made to the Ollama provider to address performance issues and enable thinking process display.

## Changes Made

### 1. Model Name Corrections

**Issue**: The configuration used `gwen3:0.6b` which was a typo.

**Fix**: Updated to use correct Qwen model names:
- `qwen2.5:0.5b` - Ultra lightweight model
- `qwen2.5:1.5b` - Balanced model
- `qwen2.5:3b` - More capable model

**Files Changed**:
- `src/index.js` - Default config
- `src/config/models.js` - Available models list
- `README.md` - Documentation
- `OPTIMIZATION_SUMMARY.md` - Performance guide

### 2. Comprehensive Logging

**Issue**: When Ollama was slow or failing, there was no visibility into what was happening.

**Fix**: Added verbose logging throughout the Ollama provider:

```javascript
// Constructor now accepts verbose option
new OllamaProvider(modelName, { 
    verbose: true,  // Enable detailed logging
    timeout: 60000  // 60s timeout
});
```

**Logging Features**:
- ✅ Request start timestamp
- ✅ Model name and configuration
- ✅ Message count and prompt length
- ✅ Response completion time
- ✅ Time to First Byte (TTFB) for streaming
- ✅ Response length
- ✅ Detailed error messages with timing
- ✅ Ollama connectivity checks on error

**Example Output**:
```
[Ollama] Starting chat request...
[Ollama] Model: qwen2.5:0.5b
[Ollama] Messages count: 2
[Ollama] Streaming: disabled
[Ollama] Using non-streaming mode...
[Ollama] Chat completed in 1250ms
[Ollama] Response length: 342 chars
```

### 3. Thinking Process Display

**Issue**: Models like Qwen that use `<think>` tags for reasoning had their thoughts hidden or mixed with the answer.

**Fix**: Added thinking extraction in both chat mode and work mode:

**How it works**:
1. Agent receives response from LLM
2. Regex pattern extracts content between `<think>` and `</think>` tags
3. Thinking content is emitted via `onUpdate` callback with type `'thought'`
4. Thinking tags are removed from the final answer
5. Web UI displays thinking in collapsible sections

**Code Location**: `src/core/agent.js` lines 107-122 (work mode) and lines 56-66 (chat mode)

**Web UI Display**: `public/app.js` lines 290-308
- Shows thinking in a collapsible `<details>` element
- Uses 🧠 emoji indicator
- Can be toggled with `/thoughts` command

### 4. Increased Timeouts

**Issue**: 30-second timeout was too short for slower Raspberry Pi devices.

**Fix**: Increased default timeout to 60 seconds:
- Ollama provider: 60s default
- Can be configured per instance

### 5. Performance Metrics

**New Metrics Tracked**:
- Total request duration
- Time to First Byte (TTFB) for streaming requests
- Response length
- Error duration (how long before failure)

**Benefits**:
- Identify bottlenecks (network vs. inference)
- Detect slow models
- Diagnose timeout issues

### 6. Better Error Diagnostics

**New Error Features**:
- Logs the exact duration before error
- Includes model name in error
- Shows truncated message context
- Automatically checks Ollama connectivity
- Provides actionable error messages

**Example Error Output**:
```
[Ollama] Chat Error after 5234ms:
[Ollama] Model: qwen2.5:0.5b
[Ollama] Messages: [{"role":"user","content":"..."}]...
[Ollama] Error details: Request timeout after 60000ms
[Ollama] WARNING: Cannot connect to Ollama at http://127.0.0.1:11434
[Ollama] Make sure Ollama is running: ollama serve
```

## Testing

### Test Suite

Created two test files:

1. **`test/test_thinking_extraction.js`**
   - Verifies thinking tags are extracted
   - Confirms thoughts are emitted via callback
   - Ensures final answer is clean
   - Run: `npm run test:thinking`

2. **`test/test_ollama_logging.js`**
   - Checks Ollama connectivity
   - Lists available models
   - Tests verbose logging output
   - Run: `npm run test:ollama`

Run all tests: `npm test`

### Manual Testing

To verify the improvements work:

1. **Start Ollama** (on your Raspberry Pi or local machine):
   ```bash
   ollama serve
   ```

2. **Pull a Qwen model**:
   ```bash
   ollama pull qwen2.5:0.5b
   ```

3. **Update config** (`data/config.json`):
   ```json
   {
     "llm_provider": "ollama",
     "model_name": "qwen2.5:0.5b",
     "agent_profile": "low"
   }
   ```

4. **Start MiniClawd**:
   ```bash
   npm start
   ```

5. **Check logs** for the new verbose output:
   - Look for `[Ollama]` prefixed messages
   - Check timing information
   - Verify thinking extraction

6. **Test in Web UI** (http://localhost:3000):
   - Send a message
   - Look for thinking bubbles (🧠)
   - Check if thoughts are collapsible
   - Use `/thoughts` to toggle display

## Performance Impact

### Positive Impacts
- ✅ Better visibility into slow operations
- ✅ Easier debugging of timeout issues
- ✅ Thinking display improves UX
- ✅ Longer timeout prevents false failures

### Negative Impacts
- ⚠️ Slightly more console output (can disable verbose)
- ⚠️ Minimal overhead from regex matching (pre-compiled, negligible)

## Configuration Options

### Ollama Provider

```javascript
const llm = new OllamaProvider('qwen2.5:0.5b', {
    timeout: 60000,        // Request timeout in ms
    enableStreaming: true, // Enable streaming responses
    verbose: true          // Enable verbose logging
});
```

### Web UI Thinking Display

Users can toggle thinking display with the `/thoughts` command in the chat.

### Environment-Specific Recommendations

**Raspberry Pi Zero/1/2**:
```json
{
  "model_name": "qwen2.5:0.5b",
  "timeout": 90000,
  "enable_streaming": false
}
```

**Raspberry Pi 3/4**:
```json
{
  "model_name": "qwen2.5:1.5b",
  "timeout": 60000,
  "enable_streaming": true
}
```

**Raspberry Pi 5 / Desktop**:
```json
{
  "model_name": "qwen2.5:3b",
  "timeout": 30000,
  "enable_streaming": true
}
```

## Troubleshooting

### Issue: "Cannot connect to Ollama"

**Symptoms**:
```
[Ollama] WARNING: Cannot connect to Ollama at http://127.0.0.1:11434
```

**Solutions**:
1. Check if Ollama is running: `curl http://127.0.0.1:11434`
2. Start Ollama: `ollama serve`
3. Check firewall settings
4. Verify Ollama installation: `ollama --version`

### Issue: Requests timing out

**Symptoms**:
```
[Ollama] Chat Error after 60000ms:
[Ollama] Error details: Request timeout after 60000ms
```

**Solutions**:
1. Increase timeout in config
2. Use a smaller model (e.g., qwen2.5:0.5b instead of 3b)
3. Check CPU throttling: `vcgencmd get_throttled`
4. Improve cooling/reduce load
5. Enable streaming to get faster initial response

### Issue: Thinking not displayed

**Symptoms**: Model generates `<think>` tags but they're not shown

**Solutions**:
1. Check web UI console for errors
2. Verify `/thoughts` toggle is enabled
3. Confirm model is actually generating `<think>` tags
4. Check browser console for WebSocket errors

### Issue: Slow performance

**Symptoms**: Long delays before seeing responses

**Investigation**:
1. Check `[Ollama]` logs for timing breakdown:
   - High TTFB → Model loading or network issue
   - High total time → Model too large for device
2. Use `get_performance_metrics` tool
3. Check system resources: `system_info` tool

**Solutions**:
1. Use smaller model
2. Enable streaming for perceived speed
3. Reduce agent_profile to 'low'
4. Clear memory: `/clear` command

## Future Improvements

Potential enhancements:
- [ ] Add model warm-up detection
- [ ] Track and display token/s generation speed
- [ ] Add automatic model selection based on device capabilities
- [ ] Support alternative Ollama endpoints (not just localhost)
- [ ] Add progress indicators for long-running requests
- [ ] Cache small model responses

## References

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Qwen Models on Ollama](https://ollama.ai/library/qwen2.5)
- [MiniClawd Documentation](../README.md)
