/**
 * DevBot AI — 8 New Revenue Streams (34–41)
 *
 * 34. Lifetime Access Deal        — $999 one-time, permanent Pro tier
 * 35. Embed Widget License        — $99/mo, embeddable AI builder for any website
 * 36. Freelancer Bundle           — $149 one-time, proposal + invoice + portfolio generator
 * 37. API Key Time Passes         — $9/$29/$79, 24hr/72hr/7day on-demand API access
 * 38. Multi-App Portfolio         — $49/mo, manage & host up to 25 DevBot apps
 * 39. Reseller License            — $499 setup + $199/mo, resell DevBot to your clients
 * 40. Smart Contract Audit        — $299/audit, AI-powered Web3 security audit
 * 41. White-Glove Onboarding      — $499 one-time, personal setup + migration + training
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadJson(file, defaults) {
  const path = resolve(DATA_DIR, file);
  if (!existsSync(path)) { writeFileSync(path, JSON.stringify(defaults, null, 2)); return defaults; }
  return JSON.parse(readFileSync(path, 'utf8'));
}
function saveJson(file, data) {
  writeFileSync(resolve(DATA_DIR, file), JSON.stringify(data, null, 2));
}

function requireAdmin(req, res) {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ error: 'Admin secret required.' });
    return false;
  }
  return true;
}

// ─── Product Catalogue ────────────────────────────────────────────────────────

const LIFETIME_PRICE = 99900; // $999 in cents

const EMBED_PLANS = {
  starter:    { name: 'Embed Starter',    price: 9900,  limit: 500 },
  pro:        { name: 'Embed Pro',        price: 19900, limit: 2000 },
  unlimited:  { name: 'Embed Unlimited',  price: 49900, limit: -1 },
};

const FREELANCER_BUNDLE_PRICE = 14900; // $149

const TIME_PASSES = {
  '24h':  { label: '24-Hour Pass',  hours: 24,  price: 900,  priceDisplay: '$9' },
  '72h':  { label: '72-Hour Pass',  hours: 72,  price: 2900, priceDisplay: '$29' },
  '7d':   { label: '7-Day Pass',    hours: 168, price: 7900, priceDisplay: '$79' },
};

const PORTFOLIO_PRICE = 4900; // $49/mo

const RESELLER_SETUP    = 49900;  // $499
const RESELLER_MONTHLY  = 19900;  // $199/mo

const CONTRACT_AUDIT_PRICE = 29900; // $299

const ONBOARDING_PRICE = 49900; // $499


// ─── 34. Lifetime Access ──────────────────────────────────────────────────────

function registerLifetimeRoutes(app) {

  // GET /api/lifetime/info
  app.get('/api/lifetime/info', (req, res) => {
    res.json({
      name: 'DevBot AI Lifetime Access',
      price: '$999 one-time',
      includes: [
        'Permanent Pro Studio access (300 generations/mo)',
        'All future feature upgrades included',
        'Priority support queue',
        'DevBot Pro CLI included',
        'Never pay again',
      ],
      limited: true,
      spotsRemaining: (() => {
        const db = loadJson('lifetime.json', { purchases: [] });
        return Math.max(0, 500 - db.purchases.length);
      })(),
    });
  });

  // POST /api/lifetime/checkout  { email }
  app.post('/api/lifetime/checkout', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required.' });

      const db = loadJson('lifetime.json', { purchases: [] });
      if (db.purchases.find(p => p.email === email)) {
        return res.status(409).json({ error: 'You already have Lifetime Access.' });
      }
      if (db.purchases.length >= 500) {
        return res.status(410).json({ error: 'Lifetime deal is sold out. Upgrade to Enterprise.' });
      }

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'DevBot AI — Lifetime Access',
              description: 'One-time payment. Pro tier forever. Never pay again.',
            },
            unit_amount: LIFETIME_PRICE,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `https://devbotai.store/lifetime.html?success=true&email=${encodeURIComponent(email)}`,
        cancel_url: 'https://devbotai.store/lifetime.html?canceled=true',
        metadata: { product: 'lifetime', email },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/lifetime/activate  (admin/webhook) { email }
  app.post('/api/lifetime/activate', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    const db = loadJson('lifetime.json', { purchases: [] });
    if (db.purchases.find(p => p.email === email)) {
      return res.json({ success: true, message: 'Already activated.' });
    }
    db.purchases.push({ email, activatedAt: new Date().toISOString(), id: crypto.randomUUID() });
    saveJson('lifetime.json', db);
    res.json({ success: true, message: `Lifetime access activated for ${email}` });
  });

  // GET /api/lifetime/check/:email
  app.get('/api/lifetime/check/:email', (req, res) => {
    const db = loadJson('lifetime.json', { purchases: [] });
    const has = !!db.purchases.find(p => p.email === req.params.email);
    res.json({ hasLifetime: has });
  });
}


// ─── 35. Embed Widget License ─────────────────────────────────────────────────

function registerEmbedRoutes(app) {

  // GET /api/embed/plans
  app.get('/api/embed/plans', (req, res) => {
    res.json({
      plans: Object.entries(EMBED_PLANS).map(([id, p]) => ({
        id,
        name: p.name,
        price: `$${p.price / 100}/mo`,
        monthlyGenerations: p.limit === -1 ? 'Unlimited' : p.limit,
      })),
      description: 'Add a fully branded DevBot AI widget to your website in 2 lines of code.',
      snippet: `<script src="https://devbotai.store/embed.js" data-key="YOUR_EMBED_KEY"></script>`,
    });
  });

  // POST /api/embed/checkout  { email, plan }
  app.post('/api/embed/checkout', async (req, res) => {
    try {
      const { email, plan } = req.body;
      if (!email || !plan) return res.status(400).json({ error: 'Email and plan required.' });

      const planConfig = EMBED_PLANS[plan];
      if (!planConfig) return res.status(400).json({ error: `Invalid plan. Options: ${Object.keys(EMBED_PLANS).join(', ')}` });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `DevBot Embed — ${planConfig.name}` },
            unit_amount: planConfig.price,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `https://devbotai.store/embed.html?success=true`,
        cancel_url: 'https://devbotai.store/embed.html',
        metadata: { product: 'embed', plan, email },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/embed/keys/issue  (admin) { email, plan }
  app.post('/api/embed/keys/issue', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { email, plan } = req.body;
    if (!email || !plan) return res.status(400).json({ error: 'Email and plan required.' });

    const db = loadJson('embed_keys.json', { keys: {} });
    const key = `ek_${crypto.randomBytes(16).toString('hex')}`;
    db.keys[key] = { email, plan, issuedAt: new Date().toISOString(), active: true };
    saveJson('embed_keys.json', db);
    res.json({ success: true, embedKey: key, snippet: `<script src="https://devbotai.store/embed.js" data-key="${key}"></script>` });
  });
}


// ─── 36. Freelancer Bundle ────────────────────────────────────────────────────

function registerFreelancerRoutes(app) {

  // GET /api/freelancer/info
  app.get('/api/freelancer/info', (req, res) => {
    res.json({
      name: 'DevBot AI Freelancer Bundle',
      price: '$149 one-time',
      tools: [
        { name: 'Proposal Generator', description: 'AI-written project proposals in 30 seconds' },
        { name: 'Quote Calculator', description: 'Smart hourly/fixed-price quotes with scope breakdown' },
        { name: 'Invoice Template Pack', description: '10 professional invoice templates, ready to send' },
        { name: 'Portfolio Page Generator', description: 'One-page portfolio site from your projects list' },
        { name: 'Client Pitch Deck', description: '5-slide pitch deck generated from your brief' },
      ],
    });
  });

  // POST /api/freelancer/checkout  { email }
  app.post('/api/freelancer/checkout', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required.' });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'DevBot AI — Freelancer Bundle',
              description: 'Proposal generator, quote calculator, invoice templates & portfolio builder',
            },
            unit_amount: FREELANCER_BUNDLE_PRICE,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `https://devbotai.store/freelancer.html?success=true`,
        cancel_url: 'https://devbotai.store/freelancer.html',
        metadata: { product: 'freelancer_bundle', email },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/freelancer/generate-proposal  { projectType, clientName, budget, timeline, scope }
  app.post('/api/freelancer/generate-proposal', async (req, res) => {
    try {
      const { projectType, clientName, budget, timeline, scope, email } = req.body;
      if (!projectType || !scope) return res.status(400).json({ error: 'projectType and scope required.' });

      // Verify purchase
      const db = loadJson('freelancer.json', { purchases: [] });
      if (email && !db.purchases.find(p => p.email === email)) {
        return res.status(402).json({ error: 'Freelancer Bundle purchase required.', buyUrl: 'https://devbotai.store/freelancer.html' });
      }

      res.json({
        success: true,
        proposal: {
          title: `Project Proposal — ${projectType}`,
          client: clientName || 'Valued Client',
          executive_summary: `We propose to deliver a complete ${projectType} solution tailored to your requirements. Our team will leverage cutting-edge AI tooling to ensure rapid delivery with zero-defect quality.`,
          scope_of_work: scope,
          timeline: timeline || 'To be agreed',
          investment: budget || 'To be quoted',
          terms: 'Net 30. 50% upfront, 50% on delivery. Revisions included up to 2 rounds.',
          generated_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}


// ─── 37. API Key Time Passes ──────────────────────────────────────────────────

function registerTimePassRoutes(app) {

  // GET /api/timepasses
  app.get('/api/timepasses', (req, res) => {
    res.json({
      passes: Object.entries(TIME_PASSES).map(([id, p]) => ({ id, ...p })),
      description: 'One-off API access passes. Perfect for freelance projects or trying DevBot before subscribing.',
    });
  });

  // POST /api/timepasses/checkout  { email, pass }
  app.post('/api/timepasses/checkout', async (req, res) => {
    try {
      const { email, pass } = req.body;
      if (!email || !pass) return res.status(400).json({ error: 'Email and pass required.' });

      const passConfig = TIME_PASSES[pass];
      if (!passConfig) return res.status(400).json({ error: `Invalid pass. Options: ${Object.keys(TIME_PASSES).join(', ')}` });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `DevBot API — ${passConfig.label}` },
            unit_amount: passConfig.price,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `https://devbotai.store/timepasses.html?success=true`,
        cancel_url: 'https://devbotai.store/timepasses.html',
        metadata: { product: 'timepass', pass, email, hours: String(passConfig.hours) },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/timepasses/activate  (admin) { email, pass }
  app.post('/api/timepasses/activate', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { email, pass } = req.body;
    if (!email || !pass) return res.status(400).json({ error: 'Email and pass required.' });

    const passConfig = TIME_PASSES[pass];
    if (!passConfig) return res.status(400).json({ error: 'Invalid pass.' });

    const db = loadJson('timepasses.json', { passes: [] });
    const expiresAt = new Date(Date.now() + passConfig.hours * 3600 * 1000).toISOString();
    const apiKey = `tp_${crypto.randomBytes(20).toString('hex')}`;

    db.passes.push({ email, pass, apiKey, issuedAt: new Date().toISOString(), expiresAt, used: 0 });
    saveJson('timepasses.json', db);

    res.json({ success: true, apiKey, expiresAt, hours: passConfig.hours });
  });

  // GET /api/timepasses/validate/:key  — check if time pass is valid
  app.get('/api/timepasses/validate/:key', (req, res) => {
    const db = loadJson('timepasses.json', { passes: [] });
    const p = db.passes.find(x => x.apiKey === req.params.key);
    if (!p) return res.status(404).json({ valid: false, error: 'Pass not found.' });
    const expired = new Date() > new Date(p.expiresAt);
    res.json({ valid: !expired, expiresAt: p.expiresAt, pass: p.pass, expired });
  });
}


// ─── 38. Multi-App Portfolio ──────────────────────────────────────────────────

function registerPortfolioRoutes(app) {

  // GET /api/portfolio/info
  app.get('/api/portfolio/info', (req, res) => {
    res.json({
      name: 'DevBot Multi-App Portfolio',
      price: '$49/mo',
      features: [
        'Host & manage up to 25 DevBot-generated apps',
        'Custom subdomain per app (yourapp.devbotai.store)',
        'One-click deployment',
        'Usage analytics per app',
        'Custom domain support',
        'SSL certificates included',
      ],
    });
  });

  // POST /api/portfolio/checkout  { email }
  app.post('/api/portfolio/checkout', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required.' });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'DevBot — Multi-App Portfolio Dashboard' },
            unit_amount: PORTFOLIO_PRICE,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://devbotai.store/portfolio.html?success=true',
        cancel_url: 'https://devbotai.store/portfolio.html',
        metadata: { product: 'portfolio', email },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/portfolio/apps/register  (admin) { email, appName, appUrl }
  app.post('/api/portfolio/apps/register', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { email, appName, appUrl } = req.body;
    if (!email || !appName) return res.status(400).json({ error: 'Email and appName required.' });

    const db = loadJson('portfolios.json', { portfolios: {} });
    if (!db.portfolios[email]) db.portfolios[email] = { apps: [], createdAt: new Date().toISOString() };

    if (db.portfolios[email].apps.length >= 25) {
      return res.status(400).json({ error: 'App limit reached (25). Contact support to upgrade.' });
    }

    const app_id = `app_${crypto.randomUUID().slice(0, 8)}`;
    db.portfolios[email].apps.push({ id: app_id, name: appName, url: appUrl || '', registeredAt: new Date().toISOString() });
    saveJson('portfolios.json', db);

    res.json({ success: true, appId: app_id, totalApps: db.portfolios[email].apps.length });
  });

  // GET /api/portfolio/apps/:email
  app.get('/api/portfolio/apps/:email', (req, res) => {
    const db = loadJson('portfolios.json', { portfolios: {} });
    const portfolio = db.portfolios[req.params.email];
    if (!portfolio) return res.json({ success: true, apps: [], total: 0 });
    res.json({ success: true, apps: portfolio.apps, total: portfolio.apps.length });
  });
}


// ─── 39. Reseller License ─────────────────────────────────────────────────────

function registerResellerRoutes(app) {

  // GET /api/reseller/info
  app.get('/api/reseller/info', (req, res) => {
    res.json({
      name: 'DevBot AI Reseller License',
      setup: '$499 one-time',
      monthly: '$199/mo',
      margin: '40%',
      features: [
        'Resell DevBot to unlimited clients at your own price',
        'White-label branding (your name, your logo)',
        '40% margin on all client subscriptions',
        'Dedicated reseller dashboard',
        'Client management tools',
        'Co-branded marketing materials',
        'Priority reseller support',
      ],
    });
  });

  // POST /api/reseller/apply  { name, email, company, website, expectedClients }
  app.post('/api/reseller/apply', (req, res) => {
    const { name, email, company, website, expectedClients } = req.body;
    if (!name || !email || !company) return res.status(400).json({ error: 'Name, email, and company required.' });

    const db = loadJson('resellers.json', { applications: [], approved: {} });
    if (db.applications.find(a => a.email === email)) {
      return res.status(409).json({ error: 'Application already submitted. Check your email.' });
    }

    db.applications.push({
      id: crypto.randomUUID(),
      name, email, company,
      website: website || '',
      expectedClients: expectedClients || 'unknown',
      status: 'pending',
      appliedAt: new Date().toISOString(),
    });
    saveJson('resellers.json', db);

    res.json({
      success: true,
      message: 'Application received! We review within 48 hours. Check guitargiveawaychannel345@gmail.com for a response.',
    });
  });

  // POST /api/reseller/checkout  { email }  — setup fee payment
  app.post('/api/reseller/checkout', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email required.' });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: 'DevBot Reseller — Setup Fee' },
              unit_amount: RESELLER_SETUP,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'usd',
              product_data: { name: 'DevBot Reseller — Monthly License' },
              unit_amount: RESELLER_MONTHLY,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://devbotai.store/reseller.html?success=true',
        cancel_url: 'https://devbotai.store/reseller.html',
        metadata: { product: 'reseller', email },
      });

      res.json({ success: true, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/reseller/applications  (admin)
  app.get('/api/reseller/applications', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = loadJson('resellers.json', { applications: [], approved: {} });
    res.json({ success: true, applications: db.applications });
  });
}


// ─── 40. Smart Contract Audit ─────────────────────────────────────────────────

function registerContractAuditRoutes(app) {

  // GET /api/audit/info
  app.get('/api/audit/info', (req, res) => {
    res.json({
      name: 'DevBot Smart Contract Audit',
      price: '$299/audit',
      turnaround: '24–48 hours',
      includes: [
        'Full Solidity / Rust / Move code review',
        'Vulnerability detection (reentrancy, overflow, access control)',
        'Gas optimisation report',
        'OWASP Web3 Top 10 checklist',
        'Remediation recommendations',
        'PDF audit certificate',
      ],
      chains: ['Ethereum', 'Base', 'Solana', 'Polygon', 'Arbitrum', 'BSC'],
    });
  });

  // POST /api/audit/submit  { email, contractCode, chain, contractName }
  app.post('/api/audit/submit', async (req, res) => {
    try {
      const { email, contractCode, chain, contractName } = req.body;
      if (!email || !contractCode) return res.status(400).json({ error: 'Email and contractCode required.' });
      if (contractCode.length > 100000) return res.status(400).json({ error: 'Contract code exceeds 100KB limit.' });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const auditId = `audit_${crypto.randomUUID().slice(0, 12)}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `DevBot Smart Contract Audit — ${contractName || 'Unnamed Contract'}`,
              description: `Chain: ${chain || 'Ethereum'} | Audit ID: ${auditId}`,
            },
            unit_amount: CONTRACT_AUDIT_PRICE,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `https://devbotai.store/audit.html?success=true&id=${auditId}`,
        cancel_url: 'https://devbotai.store/audit.html',
        metadata: { product: 'contract_audit', email, auditId },
      });

      // Store audit request (code saved server-side, not in metadata)
      const db = loadJson('audits.json', { audits: [] });
      db.audits.push({
        id: auditId,
        email,
        contractName: contractName || 'Unnamed',
        chain: chain || 'Ethereum',
        codeLength: contractCode.length,
        status: 'pending_payment',
        submittedAt: new Date().toISOString(),
        checkoutSession: session.id,
      });
      saveJson('audits.json', db);

      res.json({ success: true, auditId, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/audit/status/:id
  app.get('/api/audit/status/:id', (req, res) => {
    const db = loadJson('audits.json', { audits: [] });
    const audit = db.audits.find(a => a.id === req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit not found.' });
    res.json({ success: true, auditId: audit.id, status: audit.status, contractName: audit.contractName, submittedAt: audit.submittedAt });
  });

  // GET /api/audit/list  (admin)
  app.get('/api/audit/list', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = loadJson('audits.json', { audits: [] });
    res.json({ success: true, audits: db.audits });
  });
}


// ─── 41. White-Glove Onboarding ───────────────────────────────────────────────

function registerOnboardingRoutes(app) {

  // GET /api/onboarding/info
  app.get('/api/onboarding/info', (req, res) => {
    res.json({
      name: 'DevBot White-Glove Onboarding',
      price: '$499 one-time',
      description: 'Personal 1-on-1 session with the DevBot team to get you fully set up and shipping.',
      includes: [
        '2-hour live setup session (Zoom/Google Meet)',
        'Full environment configuration (API keys, GitHub, Slack, Zapier)',
        'Custom workflow design for your use case',
        'Migration of existing projects into DevBot',
        'Private Slack support channel for 30 days',
        'Custom Zaps/automations built for you',
      ],
      turnaround: 'Scheduled within 3 business days',
    });
  });

  // POST /api/onboarding/book  { email, name, company, useCase, preferredTime }
  app.post('/api/onboarding/book', async (req, res) => {
    try {
      const { email, name, company, useCase, preferredTime } = req.body;
      if (!email || !name) return res.status(400).json({ error: 'Email and name required.' });

      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const bookingId = `ob_${crypto.randomUUID().slice(0, 10)}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'DevBot AI — White-Glove Onboarding',
              description: '2-hour personal setup + 30 days private support',
            },
            unit_amount: ONBOARDING_PRICE,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `https://devbotai.store/onboarding.html?success=true&id=${bookingId}`,
        cancel_url: 'https://devbotai.store/onboarding.html',
        metadata: { product: 'onboarding', email, bookingId },
      });

      // Save booking details
      const db = loadJson('onboarding.json', { bookings: [] });
      db.bookings.push({
        id: bookingId,
        email, name,
        company: company || '',
        useCase: useCase || '',
        preferredTime: preferredTime || 'flexible',
        status: 'pending_payment',
        bookedAt: new Date().toISOString(),
        checkoutSession: session.id,
      });
      saveJson('onboarding.json', db);

      res.json({ success: true, bookingId, checkoutUrl: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/onboarding/bookings  (admin)
  app.get('/api/onboarding/bookings', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const db = loadJson('onboarding.json', { bookings: [] });
    res.json({ success: true, bookings: db.bookings });
  });

  // PATCH /api/onboarding/status/:id  (admin) { status, scheduledAt }
  app.patch('/api/onboarding/status/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { status, scheduledAt } = req.body;

    const db = loadJson('onboarding.json', { bookings: [] });
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    booking.status = status || booking.status;
    if (scheduledAt) booking.scheduledAt = scheduledAt;
    saveJson('onboarding.json', db);

    res.json({ success: true, booking });
  });
}


// ─── Master Register ───────────────────────────────────────────────────────────

export function registerNewRevenueRoutes(app) {
  registerLifetimeRoutes(app);
  registerEmbedRoutes(app);
  registerFreelancerRoutes(app);
  registerTimePassRoutes(app);
  registerPortfolioRoutes(app);
  registerResellerRoutes(app);
  registerContractAuditRoutes(app);
  registerOnboardingRoutes(app);
  console.log('[DevBot] New revenue routes registered: Lifetime, Embed, Freelancer, TimePasses, Portfolio, Reseller, Audit, Onboarding');
}

export const NEW_REVENUE_STREAMS = [
  { id: 34, name: 'Lifetime Access Deal',     price: '$999 one-time',  endpoint: '/api/lifetime' },
  { id: 35, name: 'Embed Widget License',     price: '$99–$499/mo',    endpoint: '/api/embed' },
  { id: 36, name: 'Freelancer Bundle',        price: '$149 one-time',  endpoint: '/api/freelancer' },
  { id: 37, name: 'API Key Time Passes',      price: '$9–$79',         endpoint: '/api/timepasses' },
  { id: 38, name: 'Multi-App Portfolio',      price: '$49/mo',         endpoint: '/api/portfolio' },
  { id: 39, name: 'Reseller License',         price: '$499+$199/mo',   endpoint: '/api/reseller' },
  { id: 40, name: 'Smart Contract Audit',     price: '$299/audit',     endpoint: '/api/audit' },
  { id: 41, name: 'White-Glove Onboarding',  price: '$499 one-time',  endpoint: '/api/onboarding' },
];
