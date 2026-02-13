import express from 'express';
import { AVAILABLE_MODELS } from './src/config/models.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/models', (req, res) => {
    res.json(AVAILABLE_MODELS);
});

app.get('/api/config', (req, res) => {
    res.json({
        llm_provider: 'ollama',
        model_name: 'llama3.2:1b',
        agent_profile: 'high'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        ollama: 'offline',
        internet: 'online',
        telegram: 'not configured',
        gmail: 'not ready',
        hardware: { temp: 50, cpu_load: 10, mem_percent: 20 }
    });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Test server running on http://localhost:${port}`);
});
