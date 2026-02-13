const socket = typeof io !== 'undefined' ? io() : null;
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const approvalList = document.getElementById('approval-list');
const connectionStatus = document.getElementById('connection-status');
const configForm = document.getElementById('config-form');

// Elements for Hardware Monitor
const hwTemp = document.getElementById('hw-temp');
const hwCpuText = document.getElementById('hw-cpu-text');
const hwCpuBar = document.getElementById('hw-cpu-bar');
const hwRamText = document.getElementById('hw-ram-text');
const hwRamBar = document.getElementById('hw-ram-bar');


// --- Status & Config ---
async function updateStatus() {
    try {
        const res = await fetch('/api/status');
        const status = await res.json();

        // Connectivity
        updateStatusItem('status-ollama', status.ollama === 'online');
        updateStatusItem('status-internet', status.internet === 'online');
        updateStatusItem('status-telegram', status.telegram === 'configured');
        updateStatusItem('status-gmail', status.gmail === 'ready');

        connectionStatus.textContent = "Agent Online";
        connectionStatus.style.color = "var(--success-color)";

        // Hardware
        if (status.hardware && !status.hardware.error) {
            hwTemp.textContent = `${Math.round(status.hardware.temp)}°C`;

            const cpu = Math.round(status.hardware.cpu_load);
            hwCpuText.textContent = `${cpu}%`;
            hwCpuBar.style.width = `${cpu}%`;

            const ram = Math.round(status.hardware.mem_percent);
            hwRamText.textContent = `${ram}%`;
            hwRamBar.style.width = `${ram}%`;
        }

    } catch (e) {
        connectionStatus.textContent = "Agent Offline";
        connectionStatus.style.color = "var(--error-color)";
    }
}

function updateStatusItem(id, isGood) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `status-item ${isGood ? 'good' : 'bad'}`;
}

// Poll status
setInterval(updateStatus, 3000); // Poll every 3 seconds for HW stats
updateStatus();

// --- View Switching ---
const viewButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('page-title');

viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const viewName = btn.dataset.view;
        switchView(viewName);

        // Mobile: close sidebar on selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

async function switchView(viewName) {
    // Update Nav
    viewButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add('active');

    // Update View
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    // View specific logic
    if (viewName === 'chat') {
        pageTitle.textContent = "Chat Workspace";
    } else if (viewName === 'logs') {
        pageTitle.textContent = "System Logs";
        document.getElementById('system-logs').scrollTop = document.getElementById('system-logs').scrollHeight;
    } else if (viewName === 'settings') {
        pageTitle.textContent = "Configuration";
        await loadConfig();
    }
}

// --- Settings Logic ---
let availableModels = {};

async function loadAvailableModels() {
    try {
        const res = await fetch('/api/models');
        availableModels = await res.json();
    } catch (e) {
        console.error("Failed to load available models", e);
    }
}

function updateModelDropdown(provider) {
    const modelSelect = document.getElementById('cfg-model');
    const models = availableModels[provider] || [];
    
    modelSelect.innerHTML = '';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = `${model.label} - ${model.description}`;
        modelSelect.appendChild(option);
    });
}

// Load models on startup
loadAvailableModels();

// Update model dropdown when provider changes
document.getElementById('cfg-provider').addEventListener('change', (e) => {
    updateModelDropdown(e.target.value);
});

async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();

        document.getElementById('cfg-profile').value = config.agent_profile || 'high';
        document.getElementById('cfg-provider').value = config.llm_provider || 'ollama';
        
        // Update model dropdown based on provider, then set selected model
        updateModelDropdown(config.llm_provider || 'ollama');
        document.getElementById('cfg-model').value = config.model_name || '';
        
        document.getElementById('cfg-openai').value = config.openai_api_key || '';
        document.getElementById('cfg-telegram').value = config.telegram_token || '';
        document.getElementById('cfg-gmail-id').value = config.gmail_client_id || '';
        document.getElementById('cfg-gmail-secret').value = config.gmail_client_secret || '';
    } catch (e) {
        console.error("Failed to load config", e);
    }
}

configForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(configForm);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.needsRestart) {
            // Show restart notification
            if (confirm("Provider or model changed. The application needs to restart. Restart now?")) {
                addLog("Restarting application...", 'warning');
                
                // Call restart endpoint
                await fetch('/api/system/restart', { method: 'POST' });
                
                // Show restart message
                alert("Application is restarting... Please wait 10 seconds and the page will reload automatically.");
                
                // Wait a bit then reload page
                setTimeout(() => {
                    window.location.reload();
                }, 10000); // Wait 10 seconds to allow server to restart
            }
        } else {
            alert("Configuration saved successfully!");
        }
    } catch (e) {
        alert("Error saving config: " + e.message);
    }
}

// Restart Ollama Handler
const btnRestartOllama = document.getElementById('btn-restart-ollama');
if (btnRestartOllama) {
    btnRestartOllama.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to restart the Ollama service? This will terminate any running generations.")) return;

        try {
            addLog("Sending restart command to Ollama...", 'warning');
            const res = await fetch('/api/system/restart-ollama', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                alert("Restart command sent. Please wait a few seconds for Ollama to come back online.");
                addLog("Ollama restart command sent successfully.", 'success');
            } else {
                alert("Error: " + data.error);
                addLog("Failed to restart Ollama: " + data.error, 'error');
            }
        } catch (e) {
            alert("Request failed: " + e.message);
            addLog("Request failed: " + e.message, 'error');
        }
    });
}



// --- Chat Logic ---
async function loadHistory() {
    const res = await fetch('/api/history');
    const messages = await res.json();
    chatWindow.innerHTML = '';
    // Add default welcome message first
    const welcome = document.createElement('div');
    welcome.className = 'message assistant';
    welcome.innerHTML = `<div class="avatar">⚡</div><div class="bubble">Hello! I'm MiniClawd. How can I help you today?</div>`;
    chatWindow.appendChild(welcome);

    messages.forEach(msg => addMessageToUI(msg.role, msg.content));
}

function tryParseJSON(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
}

function addMessageToUI(role, content) {
    const div = document.createElement('div');
    div.classList.add('message', role);

    let bubbleContent = content;
    let isTool = false;

    const json = tryParseJSON(content);
    if (json && (json.tool || json.answer)) {
        if (json.tool) {
            isTool = true;
            bubbleContent = `<div class="tool-exec">🛠️ <strong>${json.tool}</strong><br>${JSON.stringify(json.args, null, 2)}</div>`;
        } else {
            bubbleContent = json.answer;
        }
    }

    const avatar = role === 'assistant' ? '⚡' : '👤';

    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble">${bubbleContent}</div>
    `;

    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Helper function to add a simple bubble message
function addBubble(content, role = 'assistant') {
    addMessageToUI(role, content);
}

// Thought Visibility Toggle
let showThoughts = true;
let statusMsgId = null;

// Add Toggle Control to Header (dynamically if needed, or assume it exists)
// For now, let's just create a button in the UI or check a config
// We'll expose a window function to toggle it via console or new UI button if added

if (socket) {
    socket.on('agent-activity', (data) => {
        const chatWindow = document.getElementById('chat-window');

    // Remove existing status if exists
    if (statusMsgId) {
        const el = document.getElementById(statusMsgId);
        if (el) el.remove();
        statusMsgId = null;
    }

    if (data.type === 'done' || data.type === 'answer') return;

    // Handle Thoughts
    if (data.type === 'thought') {
        if (!showThoughts) return; // Skip if disabled

        const div = document.createElement('div');
        div.classList.add('message', 'assistant', 'thought-bubble');
        // Use details/summary for collapsible thinking
        div.innerHTML = `
            <div class="avatar">🧠</div>
            <div class="bubble thought">
                <details open>
                    <summary>Thinking Process</summary>
                    <div class="thought-content">${data.message.replace(/\n/g, '<br>')}</div>
                </details>
            </div>
        `;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return;
    }

    // Create new status bubble
    const div = document.createElement('div');
    statusMsgId = 'status-' + Date.now();
    div.id = statusMsgId;
    div.classList.add('message', 'assistant', 'status-message');

    let content = '';
    if (data.type === 'thinking') {
        content = `<span class="pulse">🧠</span> Thinking...`;
    } else if (data.type === 'tool') {
        content = `<span class="spin">⚙️</span> Using <strong>${data.tool}</strong>...`;
    } else if (data.type === 'observation') {
        content = `<span>👀</span> Analyzed tool output`;
    } else if (data.type === 'error') {
        content = `<span>❌</span> Error: ${data.message}`;
    }

    div.innerHTML = `
        <div class="avatar">⚡</div>
        <div class="bubble status">${content}</div>
    `;

    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
});
}

// Helper to switch mode programmatically
async function switchMode(profile) {
    try {
        const config = await fetch('/api/config').then(res => res.json());
        config.agent_profile = profile;

        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        // Update UI Header to reflect mode
        const header = document.querySelector('header');
        // Simple visual feedback based on mode
        if (profile === 'chat') {
            header.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // Green for Fast
        } else {
            header.style.background = ''; // Reset to CSS default (Work mode)
        }

    } catch (e) {
        console.error("Failed to switch mode", e);
        addLog("Failed to switch mode: " + e.message, 'error');
    }
}

// Slash command to toggle thoughts
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // --- SLASH COMMANDS ---
    if (text.startsWith('/')) {
        const cmd = text.split(' ')[0].toLowerCase();

        if (cmd === '/clear') {
            document.getElementById('chat-window').innerHTML = '';
            addLog('Chat cleared', 'info');
            userInput.value = '';
            return;
        }

        if (cmd === '/thoughts') {
            showThoughts = !showThoughts;
            addBubble(showThoughts ? '🧠 Thoughts ENABLED' : '🧠 Thoughts DISABLED', 'assistant');
            userInput.value = '';
            return;
        }

        if (cmd === '/fast' || cmd === '/chat') {
            await switchMode('chat');
            addBubble('⚡ Switched to Fast Mode', 'assistant');
            userInput.value = '';
            return;
        }

        if (cmd === '/work' || cmd === '/low' || cmd === '/high') {
            await switchMode('low');
            addBubble('🛠️ Switched to Work Mode', 'assistant');
            userInput.value = '';
            return;
        }

        if (cmd === '/help') {
            addBubble(`Available Commands:
/fast - Fast Mode
/work - Work Mode
/thoughts - Toggle Thinking Display
/clear - Clear Chat`, 'assistant');
            userInput.value = '';
            return;
        }
    }

    addMessageToUI('user', text);
    userInput.value = '';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        addMessageToUI('assistant', data.response);
    } catch (err) {
        addMessageToUI('assistant', 'Error: ' + err.message);
    }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

window.approveUser = async (chatId) => {
    await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
    });
};

window.denyUser = async (chatId) => {
    await fetch('/api/auth/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
    });
};

function addLog(message, type = 'info') {
    const container = document.getElementById('system-logs');
    const div = document.createElement('div');
    div.classList.add('log-entry', type);

    const time = new Date().toLocaleTimeString();
    div.textContent = `[${time}] ${message}`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}


// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });
}

