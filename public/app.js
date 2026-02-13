const socket = io();
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const approvalList = document.getElementById('approval-list');
const connectionStatus = document.getElementById('connection-status');
const modal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeBtn = document.getElementsByClassName('close')[0];
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

// --- Settings Modal ---
settingsBtn.onclick = async () => {
    modal.style.display = "block";
    const res = await fetch('/api/config');
    const config = await res.json();

    document.getElementById('cfg-provider').value = config.llm_provider || 'ollama';
    document.getElementById('cfg-model').value = config.model_name || '';
    document.getElementById('cfg-openai').value = config.openai_api_key || '';
    document.getElementById('cfg-telegram').value = config.telegram_token || '';
    document.getElementById('cfg-gmail-id').value = config.gmail_client_id || '';
    document.getElementById('cfg-gmail-secret').value = config.gmail_client_secret || '';
}

closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
}

configForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(configForm);
    const data = Object.fromEntries(formData.entries());

    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert("Configuration saved!");
        modal.style.display = "none";
    } catch (e) {
        alert("Error saving config: " + e.message);
    }
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

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

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

// Socket Events
socket.on('bot-request', (data) => {
    if (document.getElementById(`req-${data.chatId}`)) return;
    const li = document.createElement('li');
    li.id = `req-${data.chatId}`;
    li.classList.add('approval-item');
    li.innerHTML = `
        <span><strong>${data.username || 'User'}</strong> (${data.chatId})</span>
        <button class="approval-btn" onclick="approveUser('${data.chatId}')">Approve</button>
    `;
    approvalList.appendChild(li);
    document.getElementById('no-pending').style.display = 'none';
});

socket.on('bot-access-granted', (data) => {
    const li = document.getElementById(`req-${data.chatId}`);
    if (li) li.remove();
    if (approvalList.children.length === 0) {
        document.getElementById('no-pending').style.display = 'block';
    }
});

window.approveUser = async (chatId) => {
    await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
    });
};

loadHistory();
