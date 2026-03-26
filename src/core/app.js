import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Dynamic imports AFTER env is loaded
const express = (await import('express')).default;
const { SlackBot } = await import('../slack/bot.js');
const { GitHubClient } = await import('../github/client.js');
const { DevBotEngine } = await import('./engine.js');

const app = express();
app.use(express.json());

// Initialize core components
const engine = new DevBotEngine();
const github = new GitHubClient();
const slackBot = new SlackBot(engine, github);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    name: 'DevBot',
    version: '1.0.0',
    model: 'claude-opus-4-6',
    uptime: process.uptime(),
  });
});

// API endpoint for direct app generation
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, language, framework } = req.body;
    const result = await engine.generateApp({ prompt, language, framework });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start everything
const PORT = process.env.PORT || 3000;

async function start() {
  await slackBot.start();
  app.listen(PORT, () => {
    console.log(`[DevBot] Server running on port ${PORT}`);
    console.log(`[DevBot] Slack bot connected`);
    console.log(`[DevBot] Powered by Claude Opus 4.6 (1M context)`);
    console.log(`[DevBot] Ready to create world-class apps.`);
  });
}

start().catch(console.error);
