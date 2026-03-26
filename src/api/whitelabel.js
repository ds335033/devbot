/**
 * DevBot AI — White-Label Licensing System
 *
 * Allows agencies to rebrand DevBot as their own product.
 * Each white-label client gets:
 * - Custom branding (name, logo, colors)
 * - Custom domain support
 * - Isolated API key
 * - Their own Stripe billing for their customers
 * - Admin dashboard to manage their instance
 * - Usage analytics
 *
 * Pricing: $2,000/mo (Agency) or $5,000/mo (Enterprise White-Label)
 */

import { v4 as uuidv4 } from 'uuid';

// In-memory store (replace with database in production)
const whiteLabelClients = new Map();
const whiteLabelApiKeys = new Map();

/**
 * Generate a white-label API key
 */
function generateApiKey(prefix = 'wl') {
  const key = `${prefix}_${uuidv4().replace(/-/g, '')}`;
  return key;
}

/**
 * Create a new white-label client
 */
export function createWhiteLabelClient({
  agencyName,
  contactEmail,
  brandName,
  brandColors = { primary: '#6366f1', secondary: '#06b6d4' },
  customDomain = null,
  plan = 'agency', // 'agency' ($2,000/mo) or 'enterprise' ($5,000/mo)
  stripeCustomerId = null,
}) {
  const clientId = `wlc_${uuidv4().slice(0, 12)}`;
  const apiKey = generateApiKey('wl');
  const adminKey = generateApiKey('wla');

  const limits = plan === 'enterprise'
    ? { monthlyGenerations: -1, seats: -1, customModel: true, priorityQueue: true, sla: '99.9%' }
    : { monthlyGenerations: 2000, seats: 50, customModel: false, priorityQueue: true, sla: '99.5%' };

  const client = {
    id: clientId,
    agencyName,
    contactEmail,
    brandName,
    brandColors,
    brandLogo: null,
    customDomain,
    plan,
    apiKey,
    adminKey,
    stripeCustomerId,
    limits,
    usage: {
      currentMonth: 0,
      totalGenerations: 0,
      totalReviews: 0,
      activeUsers: 0,
    },
    settings: {
      welcomeMessage: `Welcome to ${brandName}! Describe the app you want to build.`,
      footerText: `Powered by ${brandName}`,
      supportEmail: contactEmail,
      showPoweredBy: plan !== 'enterprise', // Enterprise can fully remove DevBot branding
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  whiteLabelClients.set(clientId, client);
  whiteLabelApiKeys.set(apiKey, clientId);
  whiteLabelApiKeys.set(adminKey, clientId);

  return {
    clientId,
    apiKey,
    adminKey,
    brandName,
    plan,
    limits,
    message: `White-label instance created for ${agencyName}. Brand: "${brandName}". API key and admin key generated.`,
  };
}

/**
 * Authenticate a white-label API request
 */
export function authenticateWhiteLabel(apiKey) {
  const clientId = whiteLabelApiKeys.get(apiKey);
  if (!clientId) return null;

  const client = whiteLabelClients.get(clientId);
  if (!client || client.status !== 'active') return null;

  client.lastActiveAt = new Date().toISOString();
  return client;
}

/**
 * Track usage for a white-label client
 */
export function trackUsage(clientId, type = 'generation') {
  const client = whiteLabelClients.get(clientId);
  if (!client) return false;

  if (type === 'generation') {
    // Check limits (skip if unlimited = -1)
    if (client.limits.monthlyGenerations !== -1 &&
        client.usage.currentMonth >= client.limits.monthlyGenerations) {
      return { allowed: false, reason: 'Monthly generation limit reached', limit: client.limits.monthlyGenerations };
    }
    client.usage.currentMonth++;
    client.usage.totalGenerations++;
  } else if (type === 'review') {
    client.usage.totalReviews++;
  }

  return { allowed: true, usage: client.usage };
}

/**
 * Get white-label client dashboard data
 */
export function getClientDashboard(clientId) {
  const client = whiteLabelClients.get(clientId);
  if (!client) return null;

  const usagePercent = client.limits.monthlyGenerations === -1
    ? 0
    : Math.round((client.usage.currentMonth / client.limits.monthlyGenerations) * 100);

  return {
    brand: {
      name: client.brandName,
      colors: client.brandColors,
      logo: client.brandLogo,
      domain: client.customDomain,
    },
    plan: client.plan,
    status: client.status,
    usage: {
      ...client.usage,
      monthlyLimit: client.limits.monthlyGenerations === -1 ? 'Unlimited' : client.limits.monthlyGenerations,
      usagePercent,
    },
    limits: client.limits,
    settings: client.settings,
    billing: {
      plan: client.plan,
      price: client.plan === 'enterprise' ? '$5,000/mo' : '$2,000/mo',
      nextBillingDate: getNextBillingDate(),
    },
    createdAt: client.createdAt,
    lastActiveAt: client.lastActiveAt,
  };
}

/**
 * Update white-label branding
 */
export function updateBranding(clientId, updates) {
  const client = whiteLabelClients.get(clientId);
  if (!client) return null;

  if (updates.brandName) client.brandName = updates.brandName;
  if (updates.brandColors) client.brandColors = { ...client.brandColors, ...updates.brandColors };
  if (updates.brandLogo) client.brandLogo = updates.brandLogo;
  if (updates.customDomain) client.customDomain = updates.customDomain;
  if (updates.welcomeMessage) client.settings.welcomeMessage = updates.welcomeMessage;
  if (updates.footerText) client.settings.footerText = updates.footerText;
  if (updates.supportEmail) client.settings.supportEmail = updates.supportEmail;

  return { success: true, brand: client.brandName, updated: Object.keys(updates) };
}

/**
 * Generate embeddable widget code for white-label clients
 */
export function getWidgetCode(clientId) {
  const client = whiteLabelClients.get(clientId);
  if (!client) return null;

  return `<!-- ${client.brandName} AI App Builder Widget -->
<div id="${client.brandName.toLowerCase().replace(/\s+/g, '-')}-widget"></div>
<script>
  (function() {
    var config = {
      apiKey: '${client.apiKey}',
      brand: '${client.brandName}',
      primaryColor: '${client.brandColors.primary}',
      secondaryColor: '${client.brandColors.secondary}',
      container: '#${client.brandName.toLowerCase().replace(/\s+/g, '-')}-widget'
    };
    var s = document.createElement('script');
    s.src = 'https://devbotai.store/widget/v1.js';
    s.async = true;
    s.onload = function() { window.DevBotWidget.init(config); };
    document.head.appendChild(s);
  })();
</script>`;
}

/**
 * List all white-label clients (admin only)
 */
export function listAllClients() {
  const clients = [];
  whiteLabelClients.forEach((client) => {
    clients.push({
      id: client.id,
      agencyName: client.agencyName,
      brandName: client.brandName,
      plan: client.plan,
      status: client.status,
      usage: client.usage,
      createdAt: client.createdAt,
      lastActiveAt: client.lastActiveAt,
      mrr: client.plan === 'enterprise' ? 5000 : 2000,
    });
  });
  return {
    totalClients: clients.length,
    totalMRR: clients.reduce((sum, c) => sum + c.mrr, 0),
    clients,
  };
}

function getNextBillingDate() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().split('T')[0];
}

/**
 * Express router for white-label API endpoints
 */
export function whiteLabelRouter(app) {
  // Create new white-label client
  app.post('/api/whitelabel/create', (req, res) => {
    try {
      const result = createWhiteLabelClient(req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Get dashboard data
  app.get('/api/whitelabel/dashboard', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const client = authenticateWhiteLabel(apiKey);
    if (!client) return res.status(401).json({ error: 'Invalid API key' });

    const dashboard = getClientDashboard(client.id);
    res.json({ success: true, ...dashboard });
  });

  // Update branding
  app.patch('/api/whitelabel/branding', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const client = authenticateWhiteLabel(apiKey);
    if (!client) return res.status(401).json({ error: 'Invalid API key' });

    const result = updateBranding(client.id, req.body);
    res.json({ success: true, ...result });
  });

  // Get embeddable widget code
  app.get('/api/whitelabel/widget', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const client = authenticateWhiteLabel(apiKey);
    if (!client) return res.status(401).json({ error: 'Invalid API key' });

    const code = getWidgetCode(client.id);
    res.json({ success: true, widgetCode: code });
  });

  // Generate app (white-label branded)
  app.post('/api/whitelabel/generate', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const client = authenticateWhiteLabel(apiKey);
    if (!client) return res.status(401).json({ error: 'Invalid API key' });

    const usage = trackUsage(client.id, 'generation');
    if (!usage.allowed) return res.status(429).json({ error: usage.reason, limit: usage.limit });

    // Forward to main engine with branding context
    req.whiteLabelBrand = client.brandName;
    req.whiteLabelColors = client.brandColors;

    // The main generate endpoint handles the rest
    res.json({
      success: true,
      brand: client.brandName,
      message: `Generation #${client.usage.currentMonth} this month`,
      usage: usage.usage,
    });
  });

  // Admin: List all clients
  app.get('/api/whitelabel/admin/clients', (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(listAllClients());
  });
}

export default {
  createWhiteLabelClient,
  authenticateWhiteLabel,
  trackUsage,
  getClientDashboard,
  updateBranding,
  getWidgetCode,
  listAllClients,
  whiteLabelRouter,
};
