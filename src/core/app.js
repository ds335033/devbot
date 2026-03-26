import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const envPath = resolve(projectRoot, '.env');

// Manual .env loader (dotenv has issues on this system)
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
  console.log('[DevBot] .env loaded from', envPath);
} catch (e) {
  console.error('[DevBot] Failed to load .env:', e.message);
}
console.log('[DevBot] API key loaded:', !!process.env.ANTHROPIC_API_KEY);

// Dynamic imports AFTER env is loaded
const express = (await import('express')).default;
const { SlackBot } = await import('../slack/bot.js');
const { GitHubClient } = await import('../github/client.js');
const { DevBotEngine } = await import('./engine.js');
const { registerStripeRoutes } = await import('../api/stripe.js');

const app = express();
app.use(express.json());

// Enable CORS for the GitHub Pages frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Stripe payment routes
registerStripeRoutes(app);

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
