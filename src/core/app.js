import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../..');
const envPath = resolve(projectRoot, '.env');

// Manual .env loader
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
const helmet = (await import('helmet')).default;
const rateLimit = (await import('express-rate-limit')).default;
const { SlackBot } = await import('../slack/bot.js');
const { GitHubClient } = await import('../github/client.js');
const { DevBotEngine } = await import('./engine.js');
const { registerStripeRoutes } = await import('../api/stripe.js');
const { registerAffiliateRoutes } = await import('../api/affiliates.js');
const { whiteLabelRouter } = await import('../api/whitelabel.js');
const { registerCreditsRoutes } = await import('../api/credits.js');
const { registerZapierRoutes } = await import('../api/zapier.js');
const { registerNewRevenueRoutes, NEW_REVENUE_STREAMS } = await import('../api/newrevenue.js');
const { registerRevenue42_49Routes, REVENUE_42_49 } = await import('../api/revenue42_49.js');
const { registerAgentKitRoutes } = await import('../trading/agentkit.js');
const { registerSchedulerRoutes } = await import('../trading/scheduler.js');
const { registerDropshippingRoutes } = await import('../api/dropshipping.js');

const app = express();

// ===== SECURITY MIDDLEWARE =====

// Helmet — sets security headers (XSS protection, content type sniffing, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Allow API responses
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting — prevent API abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 generations per hour per IP
  message: { success: false, error: 'Generation limit reached. Upgrade your plan for more.' },
});

// Stripe webhook needs raw body — must be before express.json()
app.post('/api/webhook', express.raw({ type: 'application/json' }));

// Body parser with size limit — prevent DoS from huge payloads
app.use(express.json({ limit: '1mb' }));

// CORS — restrict to known origins
const ALLOWED_ORIGINS = [
  'https://devbotai.store',
  'https://ds335033.github.io',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://127.0.0.1:3000',
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

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// ===== ROUTES =====

// Stripe payment routes
registerStripeRoutes(app);

// Affiliate program routes
registerAffiliateRoutes(app);

// White-label routes
whiteLabelRouter(app);

// Credits system routes
registerCreditsRoutes(app);

// Initialize core components
const engine = new DevBotEngine();
const github = new GitHubClient();
const slackBot = new SlackBot(engine, github);

// Zapier automation routes (needs engine + github)
registerZapierRoutes(app, engine, github);

// New revenue stream routes (34-41)
registerNewRevenueRoutes(app);

// Revenue streams 42-49 (Crypto Trading Bot, Marketplace, Academy, Hosting, Chatbot, Pipeline, Mobile, Compliance)
registerRevenue42_49Routes(app);

// Coinbase AgentKit — live on-chain trading (swaps, transfers, wallets, strategies)
registerAgentKitRoutes(app);

// Auto-trading scheduler — recurring trades on interval
registerSchedulerRoutes(app);
registerDropshippingRoutes(app);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    name: 'DevBot AI',
    version: '4.0.0',
    model: 'claude-opus-4-6',
    uptime: process.uptime(),
    revenueStreams: 49,
    streams_34_41: NEW_REVENUE_STREAMS,
    streams_42_49: REVENUE_42_49,
    security: {
      helmet: true,
      rateLimiting: true,
      corsRestricted: true,
      inputValidation: true,
      adminProtected: true,
      zapierSecretRequired: true,
    },
  });
});

// API endpoint for app generation — with validation and rate limiting
app.post('/api/generate', generateLimiter, async (req, res) => {
  try {
    const { prompt, language, framework } = req.body;

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'A prompt string is required.' });
    }

    if (prompt.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Prompt must be at least 10 characters. Be descriptive!' });
    }

    if (prompt.length > 5000) {
      return res.status(400).json({ success: false, error: 'Prompt must be under 5000 characters.' });
    }

    // Sanitize inputs
    const cleanPrompt = prompt.trim().slice(0, 5000);
    const cleanLang = typeof language === 'string' ? language.trim().slice(0, 50) : 'auto';
    const cleanFramework = typeof framework === 'string' ? framework.trim().slice(0, 50) : 'auto';

    const startTime = Date.now();
    const result = await engine.generateApp({
      prompt: cleanPrompt,
      language: cleanLang,
      framework: cleanFramework,
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Validate output
    const fileCount = result.files ? Object.keys(result.files).length : 0;
    const totalChars = result.files
      ? Object.values(result.files).reduce((sum, content) => sum + content.length, 0)
      : 0;

    res.json({
      success: true,
      result,
      meta: {
        files: fileCount,
        total_chars: totalChars,
        generation_time: `${elapsed}s`,
        model: 'claude-sonnet-4',
      },
    });
  } catch (err) {
    console.error('[DevBot] Generation error:', err.message, err.stack?.split('\n')[1]);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Code review endpoint
app.post('/api/review', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Code string is required.' });
    }

    if (code.length > 50000) {
      return res.status(400).json({ success: false, error: 'Code must be under 50,000 characters.' });
    }

    const review = await engine.reviewCode(code.trim(), language || 'auto');
    res.json({ success: true, review });
  } catch (err) {
    console.error('[DevBot] Review error:', err.message);
    res.status(500).json({ success: false, error: 'Review failed. Please try again.' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found. Available endpoints: /health, /api/generate, /api/review, /api/checkout, /api/zapier/status' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[DevBot] Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ===== START =====
const PORT = process.env.PORT || 3000;

async function start() {
  await slackBot.start();
  app.listen(PORT, () => {
    console.log(`[DevBot] Server running on port ${PORT}`);
    console.log(`[DevBot] Slack bot connected`);
    console.log(`[DevBot] Security: Helmet + Rate Limiting + CORS + Input Validation`);
    console.log(`[DevBot] Powered by Claude Opus 4.6 (1M context)`);
    console.log(`[DevBot] 49 revenue streams active.`);
    console.log(`[DevBot] Crypto Trading Bot with AES-256 Vault: ONLINE`);
    console.log(`[DevBot] Ready to create world-class apps.`);
  });
}

start().catch(console.error);
