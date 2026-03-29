/**
 * DevBot AI — Integration REST API Routes
 *
 * Express Router providing endpoints for all 5 integrations:
 * Registry, SharePoint, Financial, Chatbot Builder, Agent Benchmarks,
 * and Prompt Academy.
 */

import { Router } from 'express';
import { initializeIntegrations } from '../integrations/index.js';

/** @type {import('../integrations/registry.js').Registry} */
let registry;
/** @type {import('../integrations/sharepoint.js').SharePointDocsService} */
let sharepoint;
/** @type {import('../integrations/financial.js').FinancialDataService} */
let financial;
/** @type {import('../integrations/chatbot-builder.js').ChatbotBuilderService} */
let chatbotBuilder;
/** @type {import('../integrations/agent-benchmarks.js').AgentBenchmarkService} */
let agentBenchmarks;
/** @type {import('../integrations/prompt-academy.js').PromptAcademyService} */
let promptAcademy;

/**
 * Register integration API routes on the Express app.
 * @param {import('express').Express} app - Express app instance
 * @param {Object} [services] - Injected DevBot services (engine, github, etc.)
 */
export function registerIntegrationRoutes(app, services = {}) {
  const integrations = initializeIntegrations(services);
  registry = integrations.registry;
  sharepoint = integrations.sharepoint;
  financial = integrations.financial;
  chatbotBuilder = integrations.chatbotBuilder;
  agentBenchmarks = integrations.agentBenchmarks;
  promptAcademy = integrations.promptAcademy;

  const router = Router();

  // ─── Registry Endpoints ─────────────────────────────────────────────────

  /**
   * GET /api/integrations
   * List all registered integrations.
   */
  router.get('/integrations', (_req, res) => {
    try {
      const list = registry.list();
      res.json({ success: true, count: list.length, integrations: list });
    } catch (err) {
      console.error('[DevBot][API] Failed to list integrations:', err.message);
      res.status(500).json({ success: false, error: 'Failed to list integrations' });
    }
  });

  /**
   * GET /api/integrations/:id
   * Get integration details by ID.
   */
  router.get('/integrations/:id', (req, res) => {
    try {
      const integration = registry.get(req.params.id);
      if (!integration) {
        return res.status(404).json({ success: false, error: `Integration not found: ${req.params.id}` });
      }
      res.json({ success: true, integration });
    } catch (err) {
      console.error('[DevBot][API] Failed to get integration:', err.message);
      res.status(500).json({ success: false, error: 'Failed to get integration' });
    }
  });

  /**
   * GET /api/integrations/:id/capabilities
   * List capabilities for a specific integration.
   */
  router.get('/integrations/:id/capabilities', (req, res) => {
    try {
      const integration = registry.get(req.params.id);
      if (!integration) {
        return res.status(404).json({ success: false, error: `Integration not found: ${req.params.id}` });
      }
      res.json({ success: true, id: integration.id, capabilities: integration.capabilities });
    } catch (err) {
      console.error('[DevBot][API] Failed to get capabilities:', err.message);
      res.status(500).json({ success: false, error: 'Failed to get capabilities' });
    }
  });

  // ─── SharePoint Endpoints ───────────────────────────────────────────────

  /**
   * GET /api/sharepoint/topics
   * List all SharePoint dev topics.
   */
  router.get('/sharepoint/topics', (_req, res) => {
    try {
      res.json({ success: true, topics: sharepoint.listTopics() });
    } catch (err) {
      console.error('[DevBot][API] SharePoint topics error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to list topics' });
    }
  });

  /**
   * GET /api/sharepoint/search?q=
   * Search SharePoint documentation.
   */
  router.get('/sharepoint/search', (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
      }
      const results = sharepoint.searchDocs(q);
      res.json({ success: true, query: q, count: results.length, results });
    } catch (err) {
      console.error('[DevBot][API] SharePoint search error:', err.message);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  });

  /**
   * POST /api/sharepoint/generate/app
   * Generate an SPFx application.
   */
  router.post('/sharepoint/generate/app', async (req, res) => {
    try {
      const { description } = req.body || {};
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ success: false, error: 'Request body must include "description" (string)' });
      }
      const result = await sharepoint.generateSPFxApp(description);
      res.json({ success: true, result });
    } catch (err) {
      console.error('[DevBot][API] SPFx app generation error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/sharepoint/generate/webpart
   * Generate a custom web part.
   */
  router.post('/sharepoint/generate/webpart', async (req, res) => {
    try {
      const config = req.body;
      if (!config || !config.name) {
        return res.status(400).json({ success: false, error: 'Request body must include "name" (string)' });
      }
      const result = await sharepoint.generateWebPart(config);
      res.json({ success: true, result });
    } catch (err) {
      console.error('[DevBot][API] Web part generation error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Financial Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/financial/quote/:symbol
   * Get stock quote.
   */
  router.get('/financial/quote/:symbol', async (req, res) => {
    try {
      const quote = await financial.getStockQuote(req.params.symbol);
      if (!quote) {
        return res.status(404).json({ success: false, error: `No quote found for ${req.params.symbol}` });
      }
      res.json({ success: true, quote });
    } catch (err) {
      console.error('[DevBot][API] Stock quote error:', err.message);
      const status = err.message.includes('not configured') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/financial/profile/:symbol
   * Get company profile.
   */
  router.get('/financial/profile/:symbol', async (req, res) => {
    try {
      const profile = await financial.getCompanyProfile(req.params.symbol);
      if (!profile) {
        return res.status(404).json({ success: false, error: `No profile found for ${req.params.symbol}` });
      }
      res.json({ success: true, profile });
    } catch (err) {
      console.error('[DevBot][API] Company profile error:', err.message);
      const status = err.message.includes('not configured') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/financial/statements/:symbol
   * Get financial statements. Query param: ?type=income|balance|cashflow
   */
  router.get('/financial/statements/:symbol', async (req, res) => {
    try {
      const type = req.query.type || 'income';
      const statements = await financial.getFinancialStatements(req.params.symbol, type);
      res.json({ success: true, symbol: req.params.symbol, type, statements });
    } catch (err) {
      console.error('[DevBot][API] Financial statements error:', err.message);
      const status = err.message.includes('Invalid statement') ? 400 : err.message.includes('not configured') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/financial/market/movers
   * Get market movers (gainers, losers, most active).
   */
  router.get('/financial/market/movers', async (_req, res) => {
    try {
      const movers = await financial.getMarketMovers();
      res.json({ success: true, movers });
    } catch (err) {
      console.error('[DevBot][API] Market movers error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/financial/crypto/:symbols
   * Get crypto quotes. Symbols comma-separated.
   */
  router.get('/financial/crypto/:symbols', async (req, res) => {
    try {
      const quotes = await financial.getCryptoQuotes(req.params.symbols);
      res.json({ success: true, quotes });
    } catch (err) {
      console.error('[DevBot][API] Crypto quotes error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/financial/screen
   * Stock screener. Query params for criteria.
   */
  router.get('/financial/screen', async (req, res) => {
    try {
      const criteria = {
        marketCapMin: req.query.marketCapMin ? Number(req.query.marketCapMin) : undefined,
        marketCapMax: req.query.marketCapMax ? Number(req.query.marketCapMax) : undefined,
        priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
        priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
        sector: req.query.sector,
        industry: req.query.industry,
        dividendMin: req.query.dividendMin ? Number(req.query.dividendMin) : undefined,
        volumeMin: req.query.volumeMin ? Number(req.query.volumeMin) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      };
      const results = await financial.screenStocks(criteria);
      res.json({ success: true, criteria, results });
    } catch (err) {
      console.error('[DevBot][API] Stock screener error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/financial/report/:symbol
   * Generate AI financial report.
   */
  router.post('/financial/report/:symbol', async (req, res) => {
    try {
      const report = await financial.generateFinancialReport(req.params.symbol);
      res.json({ success: true, report });
    } catch (err) {
      console.error('[DevBot][API] Financial report error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/financial/signal/:symbol
   * Generate AI trading signal.
   */
  router.post('/financial/signal/:symbol', async (req, res) => {
    try {
      const { strategy } = req.body || {};
      const signal = await financial.generateTradingSignal(req.params.symbol, strategy);
      res.json({ success: true, signal });
    } catch (err) {
      console.error('[DevBot][API] Trading signal error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Chatbot Endpoints ──────────────────────────────────────────────────

  /**
   * POST /api/chatbots/create
   * Create a new chatbot.
   */
  router.post('/chatbots/create', (req, res) => {
    try {
      const config = req.body;
      if (!config || !config.name) {
        return res.status(400).json({ success: false, error: 'Request body must include "name" (string)' });
      }
      if (!config.industry) {
        return res.status(400).json({ success: false, error: 'Request body must include "industry" (string)' });
      }
      const chatbot = chatbotBuilder.createChatbot(config);
      res.status(201).json({ success: true, chatbot });
    } catch (err) {
      console.error('[DevBot][API] Create chatbot error:', err.message);
      const status = err.message.includes('Unknown industry') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/chatbots/templates
   * List industry templates.
   */
  router.get('/chatbots/templates', (_req, res) => {
    try {
      res.json({ success: true, templates: chatbotBuilder.listTemplates() });
    } catch (err) {
      console.error('[DevBot][API] List templates error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to list templates' });
    }
  });

  /**
   * GET /api/chatbots/:id
   * Get chatbot configuration.
   */
  router.get('/chatbots/:id', (req, res) => {
    try {
      const chatbot = chatbotBuilder.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ success: false, error: `Chatbot not found: ${req.params.id}` });
      }
      res.json({ success: true, chatbot });
    } catch (err) {
      console.error('[DevBot][API] Get chatbot error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to get chatbot' });
    }
  });

  /**
   * POST /api/chatbots/:id/test
   * Test a chatbot conversation.
   */
  router.post('/chatbots/:id/test', async (req, res) => {
    try {
      const { messages } = req.body || {};
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'Request body must include "messages" (string array)' });
      }
      const conversation = await chatbotBuilder.testConversation(req.params.id, messages);
      res.json({ success: true, conversation });
    } catch (err) {
      console.error('[DevBot][API] Test conversation error:', err.message);
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/chatbots/:id/deploy
   * Get deployment configuration for a chatbot.
   */
  router.post('/chatbots/:id/deploy', (req, res) => {
    try {
      const config = chatbotBuilder.deploymentConfig(req.params.id);
      res.json({ success: true, deployment: config });
    } catch (err) {
      console.error('[DevBot][API] Deploy chatbot error:', err.message);
      const status = err.message.includes('required') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // ─── Benchmark Endpoints ────────────────────────────────────────────────

  /**
   * GET /api/benchmarks/agents
   * List all agents.
   */
  router.get('/benchmarks/agents', (_req, res) => {
    try {
      const agents = agentBenchmarks.listAgents();
      res.json({ success: true, count: agents.length, agents });
    } catch (err) {
      console.error('[DevBot][API] List agents error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to list agents' });
    }
  });

  /**
   * GET /api/benchmarks/agents/:name
   * Get detailed agent report.
   */
  router.get('/benchmarks/agents/:name', (req, res) => {
    try {
      const report = agentBenchmarks.getAgentReport(req.params.name);
      if (!report) {
        return res.status(404).json({ success: false, error: `Agent not found: ${req.params.name}` });
      }
      res.json({ success: true, report });
    } catch (err) {
      console.error('[DevBot][API] Agent report error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to get agent report' });
    }
  });

  /**
   * GET /api/benchmarks/compare?agents=cursor,claude-code
   * Compare two agents.
   */
  router.get('/benchmarks/compare', (req, res) => {
    try {
      const agentsParam = req.query.agents;
      if (!agentsParam || typeof agentsParam !== 'string') {
        return res.status(400).json({ success: false, error: 'Query parameter "agents" is required (comma-separated, e.g., cursor,claude-code)' });
      }
      const [agent1, agent2] = agentsParam.split(',').map(s => s.trim());
      if (!agent1 || !agent2) {
        return res.status(400).json({ success: false, error: 'Provide exactly 2 agent names separated by comma' });
      }
      const comparison = agentBenchmarks.compareAgents(agent1, agent2);
      res.json({ success: true, comparison });
    } catch (err) {
      console.error('[DevBot][API] Compare agents error:', err.message);
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/benchmarks/ranking
   * Get overall agent ranking.
   */
  router.get('/benchmarks/ranking', (_req, res) => {
    try {
      const ranking = agentBenchmarks.getOverallRanking();
      res.json({ success: true, ranking });
    } catch (err) {
      console.error('[DevBot][API] Ranking error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to get ranking' });
    }
  });

  /**
   * POST /api/benchmarks/recommend
   * Get AI recommendation for a project.
   */
  router.post('/benchmarks/recommend', async (req, res) => {
    try {
      const { projectDescription } = req.body || {};
      if (!projectDescription || typeof projectDescription !== 'string') {
        return res.status(400).json({ success: false, error: 'Request body must include "projectDescription" (string)' });
      }
      const recommendation = await agentBenchmarks.generateRecommendation(projectDescription);
      res.json({ success: true, recommendation });
    } catch (err) {
      console.error('[DevBot][API] Recommendation error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Academy Endpoints ──────────────────────────────────────────────────

  /**
   * GET /api/academy/lessons
   * List all lessons.
   */
  router.get('/academy/lessons', (_req, res) => {
    try {
      const lessons = promptAcademy.getLessons();
      res.json({ success: true, count: lessons.length, lessons });
    } catch (err) {
      console.error('[DevBot][API] List lessons error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to list lessons' });
    }
  });

  /**
   * GET /api/academy/lessons/:id
   * Get a specific lesson.
   */
  router.get('/academy/lessons/:id', (req, res) => {
    try {
      const lesson = promptAcademy.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ success: false, error: `Lesson not found: ${req.params.id}` });
      }
      res.json({ success: true, lesson });
    } catch (err) {
      console.error('[DevBot][API] Get lesson error:', err.message);
      res.status(500).json({ success: false, error: 'Failed to get lesson' });
    }
  });

  /**
   * POST /api/academy/exercise/:lessonId
   * Generate a new exercise for a lesson.
   */
  router.post('/academy/exercise/:lessonId', async (req, res) => {
    try {
      const exercise = await promptAcademy.generateExercise(req.params.lessonId);
      res.json({ success: true, exercise });
    } catch (err) {
      console.error('[DevBot][API] Generate exercise error:', err.message);
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/academy/evaluate
   * Evaluate a user's prompt attempt.
   */
  router.post('/academy/evaluate', async (req, res) => {
    try {
      const { prompt, criteria } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'Request body must include "prompt" (string)' });
      }
      if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
        return res.status(400).json({ success: false, error: 'Request body must include "criteria" (string array)' });
      }
      const evaluation = await promptAcademy.evaluatePrompt(prompt, criteria);
      res.json({ success: true, evaluation });
    } catch (err) {
      console.error('[DevBot][API] Evaluate prompt error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/academy/progress/:userId
   * Get user progress.
   */
  router.get('/academy/progress/:userId', (req, res) => {
    try {
      const progress = promptAcademy.getProgress(req.params.userId);
      const certification = promptAcademy.getCertification(req.params.userId);
      res.json({ success: true, userId: req.params.userId, progress, certification });
    } catch (err) {
      console.error('[DevBot][API] Get progress error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/academy/certificate
   * Generate a completion certificate.
   */
  router.post('/academy/certificate', (req, res) => {
    try {
      const { userId, name } = req.body || {};
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, error: 'Request body must include "userId" (string)' });
      }
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ success: false, error: 'Request body must include "name" (string)' });
      }
      const certificate = promptAcademy.generateCertificate(userId, name);
      res.json({ success: true, certificate });
    } catch (err) {
      console.error('[DevBot][API] Certificate error:', err.message);
      const status = err.message.includes('Not eligible') ? 400 : 500;
      res.status(status).json({ success: false, error: err.message });
    }
  });

  // ─── Mount Router ───────────────────────────────────────────────────────

  app.use('/api', router);
  console.log('[DevBot][API] Integration routes registered');

  return { registry, sharepoint, financial, chatbotBuilder, agentBenchmarks, promptAcademy };
}

export default registerIntegrationRoutes;
