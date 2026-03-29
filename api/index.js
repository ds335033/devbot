/**
 * Vercel Serverless Function entrypoint for DevBot API.
 * Wraps the Express app for serverless execution.
 * Env vars are loaded from Vercel's environment settings, not .env file.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Load .env only if it exists (local dev), otherwise rely on Vercel env vars
const envPath = resolve(projectRoot, '.env');
if (existsSync(envPath)) {
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
  } catch (e) {
    // Ignore .env errors on Vercel
  }
}

// Dynamic imports AFTER env is loaded
const express = (await import('express')).default;
const helmet = (await import('helmet')).default;
const rateLimit = (await import('express-rate-limit')).default;

// Gracefully import modules — some may fail without full env
let SlackBot, GitHubClient, DevBotEngine;
let registerStripeRoutes, registerAffiliateRoutes, whiteLabelRouter;
let registerCreditsRoutes, registerZapierRoutes;
let registerNewRevenueRoutes, NEW_REVENUE_STREAMS;
let registerRevenue42_49Routes, REVENUE_42_49;
let registerAgentKitRoutes, registerSchedulerRoutes;
let registerDropshippingRoutes, registerEmailRoutes;
let registerWorkflowRoutes, registerIntegrationRoutes, initializeIntegrations;

try { ({ SlackBot } = await import('../src/slack/bot.js')); } catch(e) { console.log('[Vercel] Slack bot skipped:', e.message); }
try { ({ GitHubClient } = await import('../src/github/client.js')); } catch(e) { console.log('[Vercel] GitHub client skipped:', e.message); }
try { ({ DevBotEngine } = await import('../src/core/engine.js')); } catch(e) { console.log('[Vercel] Engine skipped:', e.message); }
try { ({ registerStripeRoutes } = await import('../src/api/stripe.js')); } catch(e) { console.log('[Vercel] Stripe skipped:', e.message); }
try { ({ registerAffiliateRoutes } = await import('../src/api/affiliates.js')); } catch(e) { console.log('[Vercel] Affiliates skipped:', e.message); }
try { ({ whiteLabelRouter } = await import('../src/api/whitelabel.js')); } catch(e) { console.log('[Vercel] WhiteLabel skipped:', e.message); }
try { ({ registerCreditsRoutes } = await import('../src/api/credits.js')); } catch(e) { console.log('[Vercel] Credits skipped:', e.message); }
try { ({ registerZapierRoutes } = await import('../src/api/zapier.js')); } catch(e) { console.log('[Vercel] Zapier skipped:', e.message); }
try { ({ registerNewRevenueRoutes, NEW_REVENUE_STREAMS } = await import('../src/api/newrevenue.js')); } catch(e) { NEW_REVENUE_STREAMS = []; }
try { ({ registerRevenue42_49Routes, REVENUE_42_49 } = await import('../src/api/revenue42_49.js')); } catch(e) { REVENUE_42_49 = []; }
try { ({ registerAgentKitRoutes } = await import('../src/trading/agentkit.js')); } catch(e) { console.log('[Vercel] AgentKit skipped:', e.message); }
try { ({ registerSchedulerRoutes } = await import('../src/trading/scheduler.js')); } catch(e) { console.log('[Vercel] Scheduler skipped:', e.message); }
try { ({ registerDropshippingRoutes } = await import('../src/api/dropshipping.js')); } catch(e) { console.log('[Vercel] Dropshipping skipped:', e.message); }
try { ({ registerEmailRoutes } = await import('../src/api/email.js')); } catch(e) { console.log('[Vercel] Email skipped:', e.message); }
try { ({ registerWorkflowRoutes } = await import('../src/api/workflows.js')); } catch(e) { console.log('[Vercel] Workflows skipped:', e.message); }
try { ({ registerIntegrationRoutes } = await import('../src/api/integrations.js')); } catch(e) { console.log('[Vercel] Integrations skipped:', e.message); }
try { ({ initializeIntegrations } = await import('../src/integrations/index.js')); } catch(e) { console.log('[Vercel] Integration init skipped:', e.message); }

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Generation limit reached.' },
});

app.post('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// CORS
const ALLOWED_ORIGINS = [
  'https://devbotai.store',
  'https://dwvbotai.store',
  'https://devbot-pearl.vercel.app',
  'https://ds335033.github.io',
  'http://localhost:3000',
  'http://localhost:8080',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-admin-secret');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api/', apiLimiter);

// Initialize core components (gracefully)
let engine = null, github = null, slackBot = null, integrations = null;

try { engine = DevBotEngine ? new DevBotEngine() : null; } catch(e) {}
try { github = GitHubClient ? new GitHubClient() : null; } catch(e) {}

// Register routes (gracefully)
if (registerStripeRoutes) try { registerStripeRoutes(app); } catch(e) {}
if (registerAffiliateRoutes) try { registerAffiliateRoutes(app); } catch(e) {}
if (whiteLabelRouter) try { whiteLabelRouter(app); } catch(e) {}
if (registerCreditsRoutes) try { registerCreditsRoutes(app); } catch(e) {}
if (registerZapierRoutes && engine && github) try { registerZapierRoutes(app, engine, github); } catch(e) {}
if (registerNewRevenueRoutes) try { registerNewRevenueRoutes(app); } catch(e) {}
if (registerRevenue42_49Routes) try { registerRevenue42_49Routes(app); } catch(e) {}
if (registerAgentKitRoutes) try { registerAgentKitRoutes(app); } catch(e) {}
if (registerSchedulerRoutes) try { registerSchedulerRoutes(app); } catch(e) {}
if (registerDropshippingRoutes) try { registerDropshippingRoutes(app); } catch(e) {}
if (registerEmailRoutes) try { registerEmailRoutes(app); } catch(e) {}
if (registerWorkflowRoutes) try { registerWorkflowRoutes(app, { engine, github, slackBot }); } catch(e) {}

// Integrations
if (initializeIntegrations) {
  try {
    integrations = initializeIntegrations({ engine, github, slackBot });
    if (registerIntegrationRoutes) registerIntegrationRoutes(app, integrations);
  } catch(e) {
    console.log('[Vercel] Integration routes skipped:', e.message);
  }
}

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    name: 'DevBot AI',
    version: '5.0.0',
    platform: 'vercel',
    model: 'claude-opus-4-6',
    uptime: process.uptime(),
    revenueStreams: 49,
    integrations: integrations?.registry?.list()?.map(i => ({ id: i.id, name: i.name, status: i.status })) || [],
    services: {
      api: { status: 'online' },
      workflows: { status: registerWorkflowRoutes ? 'online' : 'degraded' },
      integrations: { status: integrations ? 'online' : 'degraded' },
      storefront: { status: 'online', url: '/' },
    },
  });
});

// Generate
app.post('/api/generate', generateLimiter, async (req, res) => {
  if (!engine) return res.status(503).json({ success: false, error: 'AI engine not available. Set ANTHROPIC_API_KEY.' });
  try {
    const { prompt, language, framework } = req.body;
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ success: false, error: 'A prompt string is required.' });
    if (prompt.trim().length < 10) return res.status(400).json({ success: false, error: 'Prompt must be at least 10 characters.' });
    if (prompt.length > 5000) return res.status(400).json({ success: false, error: 'Prompt must be under 5000 characters.' });
    const result = await engine.generateApp({ prompt: prompt.trim(), language, framework });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Generation failed.' });
  }
});

// Review
app.post('/api/review', async (req, res) => {
  if (!engine) return res.status(503).json({ success: false, error: 'AI engine not available.' });
  try {
    const { code, language } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ success: false, error: 'Code string is required.' });
    const review = await engine.reviewCode(code.trim(), language || 'auto');
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Review failed.' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found. Try /health, /api/generate, /api/integrations, /api/workflows/templates' });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;
