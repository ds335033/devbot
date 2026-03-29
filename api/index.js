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
if (registerWorkflowRoutes) try { registerWorkflowRoutes(app, { engine, github, slackBot }); } catch(e) { console.log('[Vercel] Workflow routes error:', e.message); }

// Integrations — register independently so they work even if workflows fail
if (initializeIntegrations) {
  try {
    integrations = initializeIntegrations({ engine, github, slackBot });
    if (registerIntegrationRoutes) registerIntegrationRoutes(app, integrations);
    console.log('[Vercel] Integrations loaded:', integrations?.registry?.list()?.length || 0);
  } catch(e) {
    console.log('[Vercel] Integration routes error:', e.message);
  }
}

// Integration data — used for fallback endpoints and health check
const integrationData = [
    { id: 'sharepoint', name: 'SharePoint Dev Docs', repo_url: 'https://github.com/SharePoint/sp-dev-docs', type: 'docs', status: 'available', capabilities: ['search_docs', 'generate_spfx_app', 'generate_webpart'] },
    { id: 'financial', name: 'Financial Modeling Prep SDK', repo_url: 'https://github.com/daxm/fmpsdk', type: 'sdk', status: 'available', capabilities: ['stock_quotes', 'company_profiles', 'financial_statements', 'ai_reports'] },
    { id: 'chatbot-builder', name: 'AI Chatbot Generator', repo_url: 'https://github.com/MainakVerse/receptionist-chatbot-generator-consultancy', type: 'app', status: 'available', capabilities: ['create_chatbot', 'industry_templates', 'deploy'] },
    { id: 'agent-benchmarks', name: 'AI Agent Benchmarks', repo_url: 'https://github.com/The-Focus-AI/june-2025-coding-agent-report', type: 'data', status: 'available', capabilities: ['agent_reports', 'compare_agents', 'rankings', 'recommendations'] },
    { id: 'prompt-academy', name: 'Prompt Engineering Academy', repo_url: 'https://github.com/anthropics/prompt-eng-interactive-tutorial', type: 'tutorial', status: 'available', capabilities: ['lessons', 'exercises', 'certifications'] },
];

const workflowTemplates = [
    { id: 'full-app-pipeline', name: 'Full App Pipeline', description: 'Generate → Review → Fix → Push → Deploy' },
    { id: 'code-review-loop', name: 'Code Review Loop', description: 'Submit → Review → Fix → Re-review → PR' },
    { id: 'trading-setup', name: 'Trading Bot Setup', description: 'Wallet → Keys → Strategy → Schedule → Monitor' },
    { id: 'customer-onboarding', name: 'Customer Onboarding', description: 'Payment → Credits → Email → Repo → Starter App' },
    { id: 'dropship-fulfillment', name: 'Dropship Fulfillment', description: 'Order → Validate → Source → Ship → Confirm' },
    { id: 'marketplace-publish', name: 'Marketplace Publish', description: 'Generate → Review → Screenshot → List → Notify' },
    { id: 'security-audit', name: 'Security Audit', description: 'Scan → Dependencies → Contracts → Report → Email' },
    { id: 'affiliate-payout', name: 'Affiliate Payout', description: 'Calculate → Verify → Payout → Receipt → Leaderboard' },
    { id: 'devfone-store-order', name: 'DevFone Store Order', description: 'Cart → Charge → Supplier → Ship → Analytics' },
    { id: 'ai-chatbot-deploy', name: 'AI Chatbot Deploy', description: 'Configure → Generate → Test → Deploy → Monitor' },
];

const benchmarkAgents = [
    { name: 'Cursor', overallScore: 92, bestFor: ['Full-stack development', 'Rapid prototyping'] },
    { name: 'v0', overallScore: 90, bestFor: ['UI/UX generation', 'React components'] },
    { name: 'Claude Code', overallScore: 89, bestFor: ['Complex reasoning', 'Large codebases'] },
    { name: 'GitHub Copilot', overallScore: 87, bestFor: ['Code completion', 'IDE integration'] },
    { name: 'Windsurf', overallScore: 85, bestFor: ['Collaborative coding', 'Multi-file edits'] },
    { name: 'Replit', overallScore: 83, bestFor: ['Quick prototypes', 'Deployment'] },
    { name: 'Warp', overallScore: 81, bestFor: ['Terminal workflows', 'DevOps'] },
    { name: 'Aider', overallScore: 80, bestFor: ['Git integration', 'CLI workflows'] },
    { name: 'Codex CLI', overallScore: 79, bestFor: ['OpenAI ecosystem', 'Scripting'] },
    { name: 'Devin', overallScore: 78, bestFor: ['Autonomous tasks', 'Issue resolution'] },
];

const academyLessons = [
    { id: '0', title: 'Tutorial How-To', difficulty: 'beginner' },
    { id: '1', title: 'Basic Prompt Structure', difficulty: 'beginner' },
    { id: '2', title: 'Being Clear and Direct', difficulty: 'beginner' },
    { id: '3', title: 'Role Prompting', difficulty: 'beginner' },
    { id: '4', title: 'Separating Data and Instructions', difficulty: 'intermediate' },
    { id: '5', title: 'Formatting Output', difficulty: 'intermediate' },
    { id: '6', title: 'Chain of Thought (Step by Step)', difficulty: 'intermediate' },
    { id: '7', title: 'Few-Shot Prompting', difficulty: 'intermediate' },
    { id: '8', title: 'Avoiding Hallucinations', difficulty: 'advanced' },
    { id: '9', title: 'Complex Prompts from Scratch', difficulty: 'advanced' },
    { id: '10a', title: 'Chaining Prompts', difficulty: 'advanced' },
    { id: '10b', title: 'Tool Use', difficulty: 'advanced' },
    { id: '10c', title: 'Search & Retrieval', difficulty: 'advanced' },
];

app.get('/api/integrations', (req, res) => res.json({ success: true, count: integrationData.length, integrations: integrationData }));
app.get('/api/integrations/:id', (req, res) => {
  const i = integrationData.find(x => x.id === req.params.id);
  return i ? res.json({ success: true, integration: i }) : res.status(404).json({ error: 'Not found' });
});
app.get('/api/workflows/templates', (req, res) => res.json({ success: true, count: workflowTemplates.length, templates: workflowTemplates }));
app.get('/api/workflows/dashboard', (req, res) => res.json({ success: true, active: 0, completed: 0, failed: 0, queued: 0, successRate: 100 }));
app.get('/api/benchmarks/ranking', (req, res) => res.json({ success: true, ranking: benchmarkAgents }));
app.get('/api/benchmarks/agents', (req, res) => res.json({ success: true, agents: benchmarkAgents }));
app.get('/api/benchmarks/agents/:name', (req, res) => {
  const a = benchmarkAgents.find(x => x.name.toLowerCase() === req.params.name.toLowerCase());
  return a ? res.json({ success: true, agent: a }) : res.status(404).json({ error: 'Agent not found' });
});
app.get('/api/academy/lessons', (req, res) => res.json({ success: true, count: academyLessons.length, lessons: academyLessons }));
app.get('/api/academy/lessons/:id', (req, res) => {
  const l = academyLessons.find(x => x.id === req.params.id);
  return l ? res.json({ success: true, lesson: l }) : res.status(404).json({ error: 'Lesson not found' });
});
app.get('/api/chatbots/templates', (req, res) => res.json({ success: true, templates: ['healthcare','legal','realestate','restaurant','ecommerce','saas','fitness','education'].map(id => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1) })) }));
app.get('/api/sharepoint/topics', (req, res) => res.json({ success: true, topics: ['webparts','extensions','library','provisioning','search','lists','permissions','sites','flows','teams','graph','auth','spfx','deployment','migration'] }));

// Wave 2+3 fallback endpoints for Vercel serverless
const wave2Integrations = [
  { id: 'langchain-rag', name: 'LangChain RAG', repo_url: 'https://github.com/langchain-ai/langchain', type: 'sdk', status: 'available', capabilities: ['knowledge_bases', 'document_query', 'semantic_search'] },
  { id: 'image-gen', name: 'AI Image Generation', repo_url: 'https://github.com/comfyanonymous/ComfyUI', type: 'sdk', status: 'available', capabilities: ['generate_image', 'upscale', 'remove_bg', 'variations'] },
  { id: 'voice-ai', name: 'Voice AI Pipeline', repo_url: 'https://github.com/openai/whisper', type: 'sdk', status: 'available', capabilities: ['transcribe', 'tts', 'voice_clone', 'voice_agent'] },
  { id: 'dify-builder', name: 'Dify No-Code AI Builder', repo_url: 'https://github.com/langgenius/dify', type: 'app', status: 'available', capabilities: ['create_app', 'publish', 'test', 'analytics'] },
  { id: 'llama-index', name: 'LlamaIndex Enterprise RAG', repo_url: 'https://github.com/run-llama/llama_index', type: 'sdk', status: 'available', capabilities: ['vector_index', 'sql_index', 'multi_modal', 'knowledge_graph'] },
  { id: 'commerce', name: 'Headless Commerce', repo_url: 'https://github.com/medusajs/medusa', type: 'app', status: 'available', capabilities: ['stores', 'products', 'orders', 'ai_descriptions'] },
  { id: 'cms', name: 'Unified CMS', repo_url: 'https://github.com/strapi/strapi', type: 'app', status: 'available', capabilities: ['sites', 'content', 'ai_generation', 'seo'] },
  { id: 'billing', name: 'Billing & Invoicing', repo_url: 'https://github.com/crater-invoice-inc/crater', type: 'app', status: 'available', capabilities: ['invoices', 'subscriptions', 'quotes', 'revenue_dashboard'] },
  { id: 'shopify-sync', name: 'Shopify Deep Sync', repo_url: 'https://github.com/Shopify/shopify-api-js', type: 'sdk', status: 'available', capabilities: ['product_sync', 'order_sync', 'discounts', 'themes'] },
  { id: 'workflow-automation', name: 'Visual Workflow Automation', repo_url: 'https://github.com/n8n-io/n8n', type: 'app', status: 'available', capabilities: ['automations', 'triggers', 'templates', 'execution'] },
  { id: 'notifications', name: 'Unified Notifications', repo_url: 'https://github.com/novuhq/novu', type: 'sdk', status: 'available', capabilities: ['email', 'sms', 'push', 'slack', 'whatsapp', 'in_app'] },
  { id: 'whatsapp', name: 'WhatsApp Business Bot', repo_url: 'https://github.com/wwebjs/whatsapp-web.js', type: 'app', status: 'available', capabilities: ['bots', 'messages', 'menus', 'templates'] },
  { id: 'auth', name: 'Multi-Tenant Auth', repo_url: 'https://github.com/better-auth/better-auth', type: 'sdk', status: 'available', capabilities: ['tenants', 'users', '2fa', 'api_keys', 'roles', 'sso'] },
  { id: 'email-templates', name: 'Email Template Engine', repo_url: 'https://github.com/resend/react-email', type: 'sdk', status: 'available', capabilities: ['templates', 'render', 'ai_generate', 'analytics'] },
  { id: 'low-code', name: 'Low-Code App Builder', repo_url: 'https://github.com/appsmithorg/appsmith', type: 'app', status: 'available', capabilities: ['apps', 'widgets', 'datasources', 'ai_generate'] },
  { id: 'analytics', name: 'Analytics & Dashboards', repo_url: 'https://github.com/grafana/grafana', type: 'app', status: 'available', capabilities: ['dashboards', 'widgets', 'reports', 'metrics'] },
];

// Merge all integrations for the listing endpoint
const allIntegrations = [
  ...(integrationData || []),
  ...wave2Integrations,
];

app.get('/api/integrations/all', (req, res) => res.json({ success: true, count: allIntegrations.length, integrations: allIntegrations }));

// Wave 2 service info endpoints
app.get('/api/rag/models', (req, res) => res.json({ success: true, models: ['langchain-chroma', 'llama-index-vector', 'llama-index-kg'] }));
app.get('/api/images/models', (req, res) => res.json({ success: true, models: ['sdxl', 'flux-dev', 'flux-schnell', 'stable-diffusion-3', 'dall-e-style'] }));
app.get('/api/images/styles', (req, res) => res.json({ success: true, styles: ['photorealistic', 'anime', 'oil-painting', 'watercolor', 'digital-art', 'pixel-art', '3d-render', 'comic-book', 'minimalist', 'cyberpunk'] }));
app.get('/api/voice/voices', (req, res) => res.json({ success: true, voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'custom'] }));
app.get('/api/dify/tools', (req, res) => res.json({ success: true, tools: ['web-search', 'calculator', 'code-interpreter', 'image-gen', 'file-reader', 'api-call', 'database-query'] }));
app.get('/api/commerce/currencies', (req, res) => res.json({ success: true, currencies: ['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'JPY'] }));
app.get('/api/cms/templates', (req, res) => res.json({ success: true, templates: ['blog', 'docs', 'portfolio', 'landing', 'academy', 'wiki', 'knowledge-base'] }));
app.get('/api/automation/templates', (req, res) => res.json({ success: true, templates: ['lead-capture-to-crm', 'order-notification-flow', 'content-publish-pipeline', 'customer-onboarding-sequence', 'invoice-payment-reminder', 'social-media-scheduler', 'bug-report-to-github', 'meeting-summary-to-slack', 'price-alert-trading', 'review-response-automation'] }));
app.get('/api/notifications/channels', (req, res) => res.json({ success: true, channels: ['email', 'sms', 'push', 'slack', 'whatsapp', 'in-app', 'webhook'] }));
app.get('/api/lowcode/widgets', (req, res) => res.json({ success: true, widgets: ['table', 'chart', 'form', 'text', 'image', 'button', 'input', 'select', 'date-picker', 'file-upload', 'map', 'calendar', 'kanban', 'timeline', 'metric-card', 'progress-bar'] }));
app.get('/api/analytics/prebuilt', (req, res) => res.json({ success: true, dashboards: ['revenue-overview', 'trading-performance', 'chatbot-usage', 'api-usage', 'customer-growth', 'workflow-efficiency'] }));
app.get('/api/auth/providers', (req, res) => res.json({ success: true, providers: ['google', 'github', 'microsoft', 'apple', 'facebook', 'twitter', 'linkedin', 'discord', 'slack'] }));

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    name: 'DevBot AI',
    version: '6.0.0',
    platform: 'vercel',
    model: 'claude-opus-4-6',
    uptime: process.uptime(),
    revenueStreams: 49,
    totalIntegrations: allIntegrations.length,
    integrations: allIntegrations.map(i => ({ id: i.id, name: i.name, status: i.status })),
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
