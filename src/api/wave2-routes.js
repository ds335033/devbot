/**
 * DevBot AI — Wave 2+3 API Routes
 *
 * Express Router providing ALL endpoints for the 16 Wave 2+3 integrations:
 * RAG, Image Gen, Voice AI, Dify Builder, LlamaIndex, Commerce, CMS,
 * Billing, Shopify, Automation, Notifications, WhatsApp, Auth,
 * Email Templates, Low-Code, Analytics.
 */

import { Router } from 'express';

/**
 * Register all Wave 2+3 API routes on the Express app.
 * @param {import('express').Express} app - Express app instance
 * @param {Object} services - Service instances from initializeWave2Integrations
 */
export function registerWave2Routes(app, services) {
  const router = Router();

  const {
    rag, imageGen, voiceAI, difyBuilder, llamaIndex,
    commerce, cms, billing, shopifySync, workflowAutomation,
    notifications, whatsapp, auth, emailTemplates, lowCode, analytics,
  } = services;

  // ═══════════════════════════════════════════════════════════════════════
  // RAG Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/rag/knowledge-base — Create knowledge base */
  router.post('/rag/knowledge-base', (req, res) => {
    try {
      const { name, description, documents, chunkSize, overlapSize, userId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = rag.createKnowledgeBase({ name, description, documents, chunkSize, overlapSize, userId });
      console.log('[DevBot API] POST /api/rag/knowledge-base');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating knowledge base:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/rag/knowledge-bases — List knowledge bases */
  router.get('/rag/knowledge-bases', (req, res) => {
    try {
      const result = rag.listKnowledgeBases(req.query.userId);
      console.log('[DevBot API] GET /api/rag/knowledge-bases');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing knowledge bases:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/rag/query — Query knowledge base */
  router.post('/rag/query', (req, res) => {
    try {
      const { knowledgeBaseId, query, topK } = req.body;
      if (!knowledgeBaseId || !query) return res.status(400).json({ success: false, error: 'knowledgeBaseId and query are required' });
      const result = rag.query({ knowledgeBaseId, query, topK });
      console.log('[DevBot API] POST /api/rag/query');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error querying RAG:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/rag/knowledge-base/:id/documents — Add documents */
  router.post('/rag/knowledge-base/:id/documents', (req, res) => {
    try {
      const { documents } = req.body;
      if (!documents || !Array.isArray(documents)) return res.status(400).json({ success: false, error: 'documents array is required' });
      const result = rag.addDocuments(req.params.id, documents);
      console.log('[DevBot API] POST /api/rag/knowledge-base/:id/documents');
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error adding documents:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Image Generation Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/images/generate — Generate image */
  router.post('/images/generate', (req, res) => {
    try {
      const { prompt, model, style, width, height, userId } = req.body;
      if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });
      const result = imageGen.generate({ prompt, model, style, width, height, userId });
      console.log('[DevBot API] POST /api/images/generate');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error generating image:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/images/:id/upscale — Upscale image */
  router.post('/images/:id/upscale', (req, res) => {
    try {
      const result = imageGen.upscale(req.params.id, req.body.scale);
      console.log('[DevBot API] POST /api/images/:id/upscale');
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error upscaling image:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/images/:id/remove-bg — Remove background */
  router.post('/images/:id/remove-bg', (req, res) => {
    try {
      const result = imageGen.removeBackground(req.params.id);
      console.log('[DevBot API] POST /api/images/:id/remove-bg');
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error removing background:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/images/history — Generation history */
  router.get('/images/history', (req, res) => {
    try {
      const result = imageGen.getHistory(req.query.userId);
      console.log('[DevBot API] GET /api/images/history');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting image history:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/images/models — List models */
  router.get('/images/models', (_req, res) => {
    try {
      const result = imageGen.listModels();
      console.log('[DevBot API] GET /api/images/models');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing models:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/images/styles — List styles */
  router.get('/images/styles', (_req, res) => {
    try {
      const result = imageGen.listStyles();
      console.log('[DevBot API] GET /api/images/styles');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing styles:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Voice AI Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/voice/transcribe — Speech to text */
  router.post('/voice/transcribe', (req, res) => {
    try {
      const { audio, language, format } = req.body;
      if (!audio) return res.status(400).json({ success: false, error: 'audio is required' });
      const result = voiceAI.transcribe({ audio, language, format });
      console.log('[DevBot API] POST /api/voice/transcribe');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error transcribing:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/voice/tts — Text to speech */
  router.post('/voice/tts', (req, res) => {
    try {
      const { text, voice, speed, format } = req.body;
      if (!text) return res.status(400).json({ success: false, error: 'text is required' });
      const result = voiceAI.textToSpeech({ text, voice, speed, format });
      console.log('[DevBot API] POST /api/voice/tts');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error generating speech:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/voice/clone — Clone voice */
  router.post('/voice/clone', (req, res) => {
    try {
      const { name, samples } = req.body;
      if (!name || !samples) return res.status(400).json({ success: false, error: 'name and samples are required' });
      const result = voiceAI.cloneVoice({ name, samples });
      console.log('[DevBot API] POST /api/voice/clone');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error cloning voice:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/voice/voices — List voices */
  router.get('/voice/voices', (_req, res) => {
    try {
      const result = voiceAI.listVoices();
      console.log('[DevBot API] GET /api/voice/voices');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing voices:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/voice/agent — Start voice agent */
  router.post('/voice/agent', (req, res) => {
    try {
      const { config } = req.body;
      if (!config) return res.status(400).json({ success: false, error: 'config is required' });
      const result = voiceAI.startAgent(config);
      console.log('[DevBot API] POST /api/voice/agent');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error starting voice agent:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/voice/usage — Usage stats */
  router.get('/voice/usage', (req, res) => {
    try {
      const result = voiceAI.getUsage(req.query.userId);
      console.log('[DevBot API] GET /api/voice/usage');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting voice usage:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Dify Builder Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/dify/apps — Create app */
  router.post('/dify/apps', (req, res) => {
    try {
      const { name, description, type, config } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = difyBuilder.createApp({ name, description, type, config });
      console.log('[DevBot API] POST /api/dify/apps');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating Dify app:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/dify/apps — List apps */
  router.get('/dify/apps', (req, res) => {
    try {
      const result = difyBuilder.listApps(req.query.userId);
      console.log('[DevBot API] GET /api/dify/apps');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing Dify apps:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/dify/apps/:id/test — Test app */
  router.post('/dify/apps/:id/test', (req, res) => {
    try {
      const { input } = req.body;
      if (!input) return res.status(400).json({ success: false, error: 'input is required' });
      const result = difyBuilder.testApp(req.params.id, input);
      console.log('[DevBot API] POST /api/dify/apps/:id/test');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error testing Dify app:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/dify/apps/:id/publish — Publish app */
  router.post('/dify/apps/:id/publish', (req, res) => {
    try {
      const result = difyBuilder.publishApp(req.params.id);
      console.log('[DevBot API] POST /api/dify/apps/:id/publish');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error publishing Dify app:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/dify/apps/:id/analytics — App analytics */
  router.get('/dify/apps/:id/analytics', (req, res) => {
    try {
      const result = difyBuilder.getAnalytics(req.params.id);
      console.log('[DevBot API] GET /api/dify/apps/:id/analytics');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting Dify analytics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LlamaIndex Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/llamaindex/indexes — Create index */
  router.post('/llamaindex/indexes', (req, res) => {
    try {
      const { name, documents, type } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = llamaIndex.createIndex({ name, documents, type });
      console.log('[DevBot API] POST /api/llamaindex/indexes');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating index:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/llamaindex/query — Query index */
  router.post('/llamaindex/query', (req, res) => {
    try {
      const { indexId, query } = req.body;
      if (!indexId || !query) return res.status(400).json({ success: false, error: 'indexId and query are required' });
      const result = llamaIndex.query({ indexId, query });
      console.log('[DevBot API] POST /api/llamaindex/query');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error querying index:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/llamaindex/sql — Natural language SQL */
  router.post('/llamaindex/sql', (req, res) => {
    try {
      const { query, database } = req.body;
      if (!query) return res.status(400).json({ success: false, error: 'query is required' });
      const result = llamaIndex.naturalLanguageSQL({ query, database });
      console.log('[DevBot API] POST /api/llamaindex/sql');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error executing NL SQL:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/llamaindex/indexes — List indexes */
  router.get('/llamaindex/indexes', (req, res) => {
    try {
      const result = llamaIndex.listIndexes(req.query.userId);
      console.log('[DevBot API] GET /api/llamaindex/indexes');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing indexes:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Commerce Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/commerce/stores — Create store */
  router.post('/commerce/stores', (req, res) => {
    try {
      const { name, description, currency, userId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = commerce.createStore({ name, description, currency, userId });
      console.log('[DevBot API] POST /api/commerce/stores');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating store:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/commerce/stores — List stores */
  router.get('/commerce/stores', (req, res) => {
    try {
      const result = (commerce.listStores ? commerce.listStores(req.query.userId) : { success: true, stores: [] });
      console.log('[DevBot API] GET /api/commerce/stores');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing stores:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/commerce/stores/:id/products — Add product */
  router.post('/commerce/stores/:id/products', (req, res) => {
    try {
      const { name, price, description, sku, inventory } = req.body;
      if (!name || price === undefined) return res.status(400).json({ success: false, error: 'name and price are required' });
      const result = commerce.addProduct(req.params.id, { name, price, description, sku, inventory });
      console.log('[DevBot API] POST /api/commerce/stores/:id/products');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error adding product:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/commerce/stores/:id/products — List products */
  router.get('/commerce/stores/:id/products', (req, res) => {
    try {
      const result = commerce.listProducts(req.params.id);
      console.log('[DevBot API] GET /api/commerce/stores/:id/products');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing products:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/commerce/stores/:id/orders — Create order */
  router.post('/commerce/stores/:id/orders', (req, res) => {
    try {
      const { items, customer } = req.body;
      if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, error: 'items array is required' });
      const result = commerce.createOrder(req.params.id, { items, customer });
      console.log('[DevBot API] POST /api/commerce/stores/:id/orders');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating order:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/commerce/stores/:id/analytics — Store analytics */
  router.get('/commerce/stores/:id/analytics', (req, res) => {
    try {
      const result = commerce.getStoreAnalytics(req.params.id);
      console.log('[DevBot API] GET /api/commerce/stores/:id/analytics');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting store analytics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/commerce/ai/description — AI product description */
  router.post('/commerce/ai/description', (req, res) => {
    try {
      const { productName, keywords, tone } = req.body;
      if (!productName) return res.status(400).json({ success: false, error: 'productName is required' });
      const result = commerce.generateProductDescription({ productName, keywords, tone });
      console.log('[DevBot API] POST /api/commerce/ai/description');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error generating description:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // CMS Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/cms/sites — Create site */
  router.post('/cms/sites', (req, res) => {
    try {
      const { name, template, domain, userId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = cms.createSite({ name, template, domain, userId });
      console.log('[DevBot API] POST /api/cms/sites');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating site:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/cms/sites — List sites */
  router.get('/cms/sites', (req, res) => {
    try {
      const result = (cms.listSites ? cms.listSites(req.query.userId) : { success: true, sites: [] });
      console.log('[DevBot API] GET /api/cms/sites');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing sites:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/cms/sites/:id/content — Create content */
  router.post('/cms/sites/:id/content', (req, res) => {
    try {
      const { title, body, type, slug } = req.body;
      if (!title) return res.status(400).json({ success: false, error: 'title is required' });
      const result = cms.createContent(req.params.id, { title, body, type, slug });
      console.log('[DevBot API] POST /api/cms/sites/:id/content');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating content:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/cms/sites/:id/content — List content */
  router.get('/cms/sites/:id/content', (req, res) => {
    try {
      const result = cms.listContent(req.params.id);
      console.log('[DevBot API] GET /api/cms/sites/:id/content');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing content:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/cms/ai/generate — AI content generation */
  router.post('/cms/ai/generate', (req, res) => {
    try {
      const { topic, type, tone, length } = req.body;
      if (!topic) return res.status(400).json({ success: false, error: 'topic is required' });
      const result = cms.generateContent({ topic, type, tone, length });
      console.log('[DevBot API] POST /api/cms/ai/generate');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error generating content:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/cms/ai/seo — AI SEO generation */
  router.post('/cms/ai/seo', (req, res) => {
    try {
      const { url, content, keywords } = req.body;
      if (!content && !url) return res.status(400).json({ success: false, error: 'content or url is required' });
      const result = cms.generateSEO({ url, content, keywords });
      console.log('[DevBot API] POST /api/cms/ai/seo');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error generating SEO:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/cms/templates — Site templates */
  router.get('/cms/templates', (_req, res) => {
    try {
      const result = (cms.getTemplates ? cms.getTemplates() : { success: true, templates: ['blog','docs','portfolio','landing','academy','wiki','knowledge-base'] });
      console.log('[DevBot API] GET /api/cms/templates');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing templates:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Billing Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/billing/invoices — Create invoice */
  router.post('/billing/invoices', (req, res) => {
    try {
      const { customer, items, dueDate, currency } = req.body;
      if (!customer || !items) return res.status(400).json({ success: false, error: 'customer and items are required' });
      const result = billing.createInvoice({ customer, items, dueDate, currency });
      console.log('[DevBot API] POST /api/billing/invoices');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating invoice:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/billing/invoices — List invoices */
  router.get('/billing/invoices', (req, res) => {
    try {
      const result = billing.listInvoices(req.query.userId);
      console.log('[DevBot API] GET /api/billing/invoices');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing invoices:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/billing/invoices/:id/send — Send invoice */
  router.post('/billing/invoices/:id/send', (req, res) => {
    try {
      const result = billing.sendInvoice(req.params.id);
      console.log('[DevBot API] POST /api/billing/invoices/:id/send');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error sending invoice:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/billing/subscriptions — Create subscription */
  router.post('/billing/subscriptions', (req, res) => {
    try {
      const { customer, plan, interval } = req.body;
      if (!customer || !plan) return res.status(400).json({ success: false, error: 'customer and plan are required' });
      const result = billing.createSubscription({ customer, plan, interval });
      console.log('[DevBot API] POST /api/billing/subscriptions');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating subscription:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/billing/dashboard — Revenue dashboard */
  router.get('/billing/dashboard', (req, res) => {
    try {
      const result = billing.getDashboard(req.query.userId);
      console.log('[DevBot API] GET /api/billing/dashboard');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting billing dashboard:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/billing/quotes — Create quote */
  router.post('/billing/quotes', (req, res) => {
    try {
      const { customer, items, validUntil } = req.body;
      if (!customer || !items) return res.status(400).json({ success: false, error: 'customer and items are required' });
      const result = billing.createQuote({ customer, items, validUntil });
      console.log('[DevBot API] POST /api/billing/quotes');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating quote:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Shopify Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/shopify/connect — Connect store */
  router.post('/shopify/connect', (req, res) => {
    try {
      const { shopUrl, accessToken } = req.body;
      if (!shopUrl || !accessToken) return res.status(400).json({ success: false, error: 'shopUrl and accessToken are required' });
      const result = shopifySync.connect({ shopUrl, accessToken });
      console.log('[DevBot API] POST /api/shopify/connect');
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error connecting Shopify:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/shopify/sync/products — Sync products */
  router.post('/shopify/sync/products', (req, res) => {
    try {
      const { storeId } = req.body;
      if (!storeId) return res.status(400).json({ success: false, error: 'storeId is required' });
      const result = shopifySync.syncProducts(storeId);
      console.log('[DevBot API] POST /api/shopify/sync/products');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error syncing products:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/shopify/sync/orders — Sync orders */
  router.post('/shopify/sync/orders', (req, res) => {
    try {
      const { storeId } = req.body;
      if (!storeId) return res.status(400).json({ success: false, error: 'storeId is required' });
      const result = shopifySync.syncOrders(storeId);
      console.log('[DevBot API] POST /api/shopify/sync/orders');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error syncing orders:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/shopify/discounts — Create discount */
  router.post('/shopify/discounts', (req, res) => {
    try {
      const { storeId, code, type, value } = req.body;
      if (!storeId || !code) return res.status(400).json({ success: false, error: 'storeId and code are required' });
      const result = shopifySync.createDiscount({ storeId, code, type, value });
      console.log('[DevBot API] POST /api/shopify/discounts');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating discount:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/shopify/analytics — Shopify analytics */
  router.get('/shopify/analytics', (req, res) => {
    try {
      const result = shopifySync.getAnalytics(req.query.storeId);
      console.log('[DevBot API] GET /api/shopify/analytics');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting Shopify analytics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Automation Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/automation/create — Create automation */
  router.post('/automation/create', (req, res) => {
    try {
      const { name, trigger, actions, userId } = req.body;
      if (!name || !trigger) return res.status(400).json({ success: false, error: 'name and trigger are required' });
      const result = workflowAutomation.createAutomation({ name, trigger, actions, userId });
      console.log('[DevBot API] POST /api/automation/create');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating automation:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/automation/list — List automations */
  router.get('/automation/list', (req, res) => {
    try {
      const result = workflowAutomation.listAutomations(req.query.userId);
      console.log('[DevBot API] GET /api/automation/list');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing automations:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/automation/:id/run — Run automation */
  router.post('/automation/:id/run', (req, res) => {
    try {
      const result = workflowAutomation.runAutomation(req.params.id, req.body.input);
      console.log('[DevBot API] POST /api/automation/:id/run');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error running automation:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/automation/:id/pause — Pause automation */
  router.post('/automation/:id/pause', (req, res) => {
    try {
      const result = workflowAutomation.pauseAutomation(req.params.id);
      console.log('[DevBot API] POST /api/automation/:id/pause');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error pausing automation:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/automation/templates — Template gallery */
  router.get('/automation/templates', (_req, res) => {
    try {
      const result = workflowAutomation.getTemplates();
      console.log('[DevBot API] GET /api/automation/templates');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing automation templates:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/automation/:id/history — Execution history */
  router.get('/automation/:id/history', (req, res) => {
    try {
      const result = workflowAutomation.getHistory(req.params.id);
      console.log('[DevBot API] GET /api/automation/:id/history');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting automation history:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Notification Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/notifications/send — Send notification */
  router.post('/notifications/send', (req, res) => {
    try {
      const { channel, recipient, message, template } = req.body;
      if (!recipient || (!message && !template)) return res.status(400).json({ success: false, error: 'recipient and message (or template) are required' });
      const result = notifications.send({ channel, recipient, message, template });
      console.log('[DevBot API] POST /api/notifications/send');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error sending notification:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/notifications/bulk — Send bulk notifications */
  router.post('/notifications/bulk', (req, res) => {
    try {
      const { recipients, message, template, channel } = req.body;
      if (!recipients || !Array.isArray(recipients)) return res.status(400).json({ success: false, error: 'recipients array is required' });
      const result = notifications.sendBulk({ recipients, message, template, channel });
      console.log('[DevBot API] POST /api/notifications/bulk');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error sending bulk notifications:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/notifications/templates — Create template */
  router.post('/notifications/templates', (req, res) => {
    try {
      const { name, subject, body, channel } = req.body;
      if (!name || !body) return res.status(400).json({ success: false, error: 'name and body are required' });
      const result = notifications.createTemplate({ name, subject, body, channel });
      console.log('[DevBot API] POST /api/notifications/templates');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating notification template:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/notifications/templates — List templates */
  router.get('/notifications/templates', (_req, res) => {
    try {
      const result = notifications.listTemplates();
      console.log('[DevBot API] GET /api/notifications/templates');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing notification templates:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/notifications/analytics — Delivery analytics */
  router.get('/notifications/analytics', (req, res) => {
    try {
      const result = notifications.getAnalytics(req.query.period);
      console.log('[DevBot API] GET /api/notifications/analytics');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting notification analytics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** PUT /api/notifications/preferences — Set preferences */
  router.put('/notifications/preferences', (req, res) => {
    try {
      const { userId, preferences } = req.body;
      if (!userId || !preferences) return res.status(400).json({ success: false, error: 'userId and preferences are required' });
      const result = notifications.setPreferences(userId, preferences);
      console.log('[DevBot API] PUT /api/notifications/preferences');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error setting preferences:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // WhatsApp Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/whatsapp/bots — Create bot */
  router.post('/whatsapp/bots', (req, res) => {
    try {
      const { name, phoneNumber, config, userId } = req.body;
      if (!name || !phoneNumber) return res.status(400).json({ success: false, error: 'name and phoneNumber are required' });
      const result = whatsapp.createBot({ name, phoneNumber, config, userId });
      console.log('[DevBot API] POST /api/whatsapp/bots');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating WhatsApp bot:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/whatsapp/bots — List bots */
  router.get('/whatsapp/bots', (req, res) => {
    try {
      const result = whatsapp.listBots(req.query.userId);
      console.log('[DevBot API] GET /api/whatsapp/bots');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing WhatsApp bots:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/whatsapp/bots/:id/send — Send message */
  router.post('/whatsapp/bots/:id/send', (req, res) => {
    try {
      const { to, message, type } = req.body;
      if (!to || !message) return res.status(400).json({ success: false, error: 'to and message are required' });
      const result = whatsapp.sendMessage(req.params.id, { to, message, type });
      console.log('[DevBot API] POST /api/whatsapp/bots/:id/send');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error sending WhatsApp message:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/whatsapp/bots/:id/menu — Create menu */
  router.post('/whatsapp/bots/:id/menu', (req, res) => {
    try {
      const { title, items } = req.body;
      if (!title || !items) return res.status(400).json({ success: false, error: 'title and items are required' });
      const result = whatsapp.createMenu(req.params.id, { title, items });
      console.log('[DevBot API] POST /api/whatsapp/bots/:id/menu');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating WhatsApp menu:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/whatsapp/bots/:id/analytics — Bot analytics */
  router.get('/whatsapp/bots/:id/analytics', (req, res) => {
    try {
      const result = whatsapp.getAnalytics(req.params.id);
      console.log('[DevBot API] GET /api/whatsapp/bots/:id/analytics');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting WhatsApp analytics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/whatsapp/bots/:id/conversations — Conversations */
  router.get('/whatsapp/bots/:id/conversations', (req, res) => {
    try {
      const result = whatsapp.getConversations(req.params.id);
      console.log('[DevBot API] GET /api/whatsapp/bots/:id/conversations');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting conversations:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Auth Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/auth/tenants — Create tenant */
  router.post('/auth/tenants', (req, res) => {
    try {
      const { name, domain, plan } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = auth.createTenant({ name, domain, plan });
      console.log('[DevBot API] POST /api/auth/tenants');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating tenant:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/auth/register — Register user */
  router.post('/auth/register', (req, res) => {
    try {
      const { email, password, name, tenantId } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, error: 'email and password are required' });
      const result = auth.register({ email, password, name, tenantId });
      console.log('[DevBot API] POST /api/auth/register');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error registering user:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/auth/login — Authenticate */
  router.post('/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, error: 'email and password are required' });
      const result = auth.login({ email, password });
      console.log('[DevBot API] POST /api/auth/login');
      res.status(result.success ? 200 : 401).json(result);
    } catch (err) {
      console.error('[DevBot API] Error during login:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/auth/2fa/enable — Enable 2FA */
  router.post('/auth/2fa/enable', (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
      const result = auth.enable2FA(userId);
      console.log('[DevBot API] POST /api/auth/2fa/enable');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error enabling 2FA:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/auth/2fa/verify — Verify 2FA */
  router.post('/auth/2fa/verify', (req, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) return res.status(400).json({ success: false, error: 'userId and code are required' });
      const result = auth.verify2FA(userId, code);
      console.log('[DevBot API] POST /api/auth/2fa/verify');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error verifying 2FA:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/auth/api-keys — Generate API key */
  router.post('/auth/api-keys', (req, res) => {
    try {
      const { userId, name, scopes } = req.body;
      if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
      const result = auth.generateApiKey({ userId, name, scopes });
      console.log('[DevBot API] POST /api/auth/api-keys');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error generating API key:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/auth/audit-log — Audit log */
  router.get('/auth/audit-log', (req, res) => {
    try {
      const result = auth.getAuditLog(req.query.tenantId, req.query.limit);
      console.log('[DevBot API] GET /api/auth/audit-log');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting audit log:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/auth/roles — Create role */
  router.post('/auth/roles', (req, res) => {
    try {
      const { name, permissions, tenantId } = req.body;
      if (!name || !permissions) return res.status(400).json({ success: false, error: 'name and permissions are required' });
      const result = auth.createRole({ name, permissions, tenantId });
      console.log('[DevBot API] POST /api/auth/roles');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating role:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Email Template Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/email-templates/create — Create template */
  router.post('/email-templates/create', (req, res) => {
    try {
      const { name, subject, html, variables, category } = req.body;
      if (!name || !subject || !html) return res.status(400).json({ success: false, error: 'name, subject, and html are required' });
      const result = emailTemplates.createTemplate({ name, subject, html, variables, category });
      console.log('[DevBot API] POST /api/email-templates/create');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating email template:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/email-templates — List templates */
  router.get('/email-templates', (req, res) => {
    try {
      const result = emailTemplates.listTemplates(req.query.category);
      console.log('[DevBot API] GET /api/email-templates');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing email templates:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/email-templates/:id/render — Render with data */
  router.post('/email-templates/:id/render', (req, res) => {
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ success: false, error: 'data is required' });
      const result = emailTemplates.renderTemplate(req.params.id, data);
      console.log('[DevBot API] POST /api/email-templates/:id/render');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error rendering email template:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/email-templates/ai/generate — AI generate template */
  router.post('/email-templates/ai/generate', (req, res) => {
    try {
      const { purpose, tone, brand } = req.body;
      if (!purpose) return res.status(400).json({ success: false, error: 'purpose is required' });
      const result = emailTemplates.aiGenerate({ purpose, tone, brand });
      console.log('[DevBot API] POST /api/email-templates/ai/generate');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error AI generating email template:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/email-templates/send — Send email */
  router.post('/email-templates/send', (req, res) => {
    try {
      const { templateId, to, data } = req.body;
      if (!templateId || !to) return res.status(400).json({ success: false, error: 'templateId and to are required' });
      const result = emailTemplates.sendEmail({ templateId, to, data });
      console.log('[DevBot API] POST /api/email-templates/send');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error sending email:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/email-templates/:id/analytics — Email analytics */
  router.get('/email-templates/:id/analytics', (req, res) => {
    try {
      const result = emailTemplates.getAnalytics(req.params.id);
      console.log('[DevBot API] GET /api/email-templates/:id/analytics');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting email analytics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Low-Code Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/lowcode/apps — Create app */
  router.post('/lowcode/apps', (req, res) => {
    try {
      const { name, description, template, userId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = lowCode.createApp({ name, description, template, userId });
      console.log('[DevBot API] POST /api/lowcode/apps');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating low-code app:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/lowcode/apps — List apps */
  router.get('/lowcode/apps', (req, res) => {
    try {
      const result = lowCode.listApps(req.query.userId);
      console.log('[DevBot API] GET /api/lowcode/apps');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing low-code apps:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/lowcode/apps/:id/widgets — Add widget */
  router.post('/lowcode/apps/:id/widgets', (req, res) => {
    try {
      const { type, config, position } = req.body;
      if (!type) return res.status(400).json({ success: false, error: 'type is required' });
      const result = lowCode.addWidget(req.params.id, { type, config, position });
      console.log('[DevBot API] POST /api/lowcode/apps/:id/widgets');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error adding widget:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/lowcode/apps/:id/deploy — Deploy app */
  router.post('/lowcode/apps/:id/deploy', (req, res) => {
    try {
      const result = lowCode.deployApp(req.params.id, req.body.environment);
      console.log('[DevBot API] POST /api/lowcode/apps/:id/deploy');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error deploying app:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/lowcode/ai/generate — AI generate app */
  router.post('/lowcode/ai/generate', (req, res) => {
    try {
      const { description, type } = req.body;
      if (!description) return res.status(400).json({ success: false, error: 'description is required' });
      const result = lowCode.aiGenerate({ description, type });
      console.log('[DevBot API] POST /api/lowcode/ai/generate');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error AI generating app:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/lowcode/widgets — List widget types */
  router.get('/lowcode/widgets', (_req, res) => {
    try {
      const result = lowCode.getWidgetTypes();
      console.log('[DevBot API] GET /api/lowcode/widgets');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing widget types:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/lowcode/datasources — List data source types */
  router.get('/lowcode/datasources', (_req, res) => {
    try {
      const result = lowCode.getDataSourceTypes();
      console.log('[DevBot API] GET /api/lowcode/datasources');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing data sources:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Analytics Endpoints
  // ═══════════════════════════════════════════════════════════════════════

  /** POST /api/analytics/dashboards — Create dashboard */
  router.post('/analytics/dashboards', (req, res) => {
    try {
      const { name, description, widgets, refreshInterval, userId } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = analytics.createDashboard({ name, description, widgets, refreshInterval, userId });
      console.log('[DevBot API] POST /api/analytics/dashboards');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating dashboard:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/analytics/dashboards — List dashboards */
  router.get('/analytics/dashboards', (req, res) => {
    try {
      const result = analytics.listDashboards(req.query.userId);
      console.log('[DevBot API] GET /api/analytics/dashboards');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error listing dashboards:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/analytics/dashboards/:id — Get dashboard */
  router.get('/analytics/dashboards/:id', (req, res) => {
    try {
      const result = analytics.getDashboard(req.params.id);
      console.log('[DevBot API] GET /api/analytics/dashboards/:id');
      res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting dashboard:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/analytics/dashboards/:id/widgets — Add widget */
  router.post('/analytics/dashboards/:id/widgets', (req, res) => {
    try {
      const { type, title, dataSource, query, config } = req.body;
      if (!type) return res.status(400).json({ success: false, error: 'type is required' });
      const result = analytics.addWidget(req.params.id, { type, title, dataSource, query, config });
      console.log('[DevBot API] POST /api/analytics/dashboards/:id/widgets');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error adding widget:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/analytics/dashboards/:id/share — Share dashboard */
  router.post('/analytics/dashboards/:id/share', (req, res) => {
    try {
      const result = analytics.shareDashboard(req.params.id, req.body);
      console.log('[DevBot API] POST /api/analytics/dashboards/:id/share');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error sharing dashboard:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/analytics/metrics/:source — Get metrics */
  router.get('/analytics/metrics/:source', (req, res) => {
    try {
      const result = analytics.getMetrics(req.params.source, req.query.period);
      console.log('[DevBot API] GET /api/analytics/metrics/:source');
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting metrics:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** POST /api/analytics/reports — Create report */
  router.post('/analytics/reports', (req, res) => {
    try {
      const { name, dashboards, schedule, recipients, format } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name is required' });
      const result = analytics.createReport({ name, dashboards, schedule, recipients, format });
      console.log('[DevBot API] POST /api/analytics/reports');
      res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
      console.error('[DevBot API] Error creating report:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/analytics/health — System health */
  router.get('/analytics/health', (_req, res) => {
    try {
      const result = analytics.getSystemHealth();
      console.log('[DevBot API] GET /api/analytics/health');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting system health:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /** GET /api/analytics/prebuilt — Pre-built dashboards */
  router.get('/analytics/prebuilt', (_req, res) => {
    try {
      const result = analytics.getPrebuiltDashboards();
      console.log('[DevBot API] GET /api/analytics/prebuilt');
      res.json(result);
    } catch (err) {
      console.error('[DevBot API] Error getting pre-built dashboards:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ─── Mount router ───────────────────────────────────────────────────────

  app.use('/api', router);
  console.log('[DevBot API] Wave 2+3 routes registered — 16 services, all endpoints active');
}

export default registerWave2Routes;
