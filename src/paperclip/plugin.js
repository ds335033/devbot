/**
 * DevBot × Paperclip AI — Integration Plugin
 *
 * Connects Paperclip's multi-agent orchestration to DevBot's 49-service API.
 * Agents can generate apps, manage commerce, run trading, handle support, etc.
 */

const DEVBOT_BASE = process.env.DEVBOT_URL || 'http://localhost:3000';

/**
 * Paperclip plugin manifest — defines tools agents can use
 */
export const manifest = {
  name: 'devbot',
  displayName: 'DevBot AI Platform',
  version: '1.0.0',
  description: 'Full access to DevBot\'s 49 revenue streams and 37+ integrations',
  author: 'Dazza',
  tools: [
    // ─── Core Generation ─────────────────────────────────────────
    {
      name: 'generate_app',
      description: 'Generate a complete production app using Claude Opus 4.6',
      parameters: {
        prompt: { type: 'string', required: true, description: 'App description' },
        language: { type: 'string', default: 'javascript', description: 'Programming language' },
        framework: { type: 'string', default: 'express', description: 'Framework to use' }
      }
    },
    {
      name: 'review_code',
      description: 'AI code review with suggestions and security analysis',
      parameters: {
        code: { type: 'string', required: true },
        language: { type: 'string', default: 'javascript' }
      }
    },

    // ─── Workflow Orchestration ───────────────────────────────────
    {
      name: 'start_workflow',
      description: 'Start a DevBot workflow from template',
      parameters: {
        templateId: { type: 'string', required: true },
        params: { type: 'object', default: {} }
      }
    },
    {
      name: 'list_workflows',
      description: 'List all workflows with status',
      parameters: {}
    },
    {
      name: 'get_workflow_dashboard',
      description: 'Get workflow stats and metrics',
      parameters: {}
    },

    // ─── Commerce & Revenue ──────────────────────────────────────
    {
      name: 'create_checkout',
      description: 'Create a Stripe checkout session for DevBot subscriptions',
      parameters: {
        plan: { type: 'string', enum: ['solo', 'pro', 'enterprise'], required: true },
        email: { type: 'string', required: true }
      }
    },
    {
      name: 'get_credits_balance',
      description: 'Check a user\'s credit balance',
      parameters: {
        email: { type: 'string', required: true }
      }
    },
    {
      name: 'buy_credits',
      description: 'Purchase credit pack for a user',
      parameters: {
        email: { type: 'string', required: true },
        pack: { type: 'string', required: true }
      }
    },

    // ─── Affiliate System ────────────────────────────────────────
    {
      name: 'affiliate_signup',
      description: 'Create a new affiliate account',
      parameters: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true }
      }
    },
    {
      name: 'affiliate_dashboard',
      description: 'Get affiliate stats and earnings',
      parameters: {
        code: { type: 'string', required: true }
      }
    },

    // ─── Trading Bot ─────────────────────────────────────────────
    {
      name: 'create_wallet',
      description: 'Create a crypto wallet via Coinbase CDP',
      parameters: {
        email: { type: 'string', required: true }
      }
    },
    {
      name: 'execute_trade',
      description: 'Execute a trading strategy',
      parameters: {
        email: { type: 'string', required: true },
        strategy: { type: 'string', required: true },
        params: { type: 'object', default: {} }
      }
    },

    // ─── Integrations ────────────────────────────────────────────
    {
      name: 'list_integrations',
      description: 'List all available DevBot integrations',
      parameters: {}
    },
    {
      name: 'query_integration',
      description: 'Query a specific integration\'s capabilities',
      parameters: {
        id: { type: 'string', required: true }
      }
    },

    // ─── Content & Marketing ─────────────────────────────────────
    {
      name: 'generate_chatbot',
      description: 'Generate a chatbot from template',
      parameters: {
        template: { type: 'string', required: true },
        config: { type: 'object', default: {} }
      }
    },
    {
      name: 'create_image',
      description: 'Generate an image via ComfyUI/Diffusers',
      parameters: {
        prompt: { type: 'string', required: true },
        style: { type: 'string', default: 'realistic' }
      }
    },

    // ─── Analytics & Health ──────────────────────────────────────
    {
      name: 'health_check',
      description: 'Get full DevBot system health and status',
      parameters: {}
    },
    {
      name: 'get_analytics',
      description: 'Get analytics dashboard data',
      parameters: {}
    }
  ]
};

/**
 * Tool executor — routes Paperclip agent tool calls to DevBot API
 */
export async function execute(toolName, params) {
  const routes = {
    generate_app:         { method: 'POST', path: '/api/generate', body: params },
    review_code:          { method: 'POST', path: '/api/review', body: params },
    start_workflow:       { method: 'POST', path: '/api/workflows/start', body: params },
    list_workflows:       { method: 'GET',  path: '/api/workflows' },
    get_workflow_dashboard:{ method: 'GET', path: '/api/workflows/dashboard' },
    create_checkout:      { method: 'POST', path: '/api/checkout', body: params },
    get_credits_balance:  { method: 'GET',  path: `/api/credits/balance/${params.email}` },
    buy_credits:          { method: 'POST', path: '/api/credits/buy', body: params },
    affiliate_signup:     { method: 'POST', path: '/api/affiliates/signup', body: params },
    affiliate_dashboard:  { method: 'GET',  path: `/api/affiliates/dashboard/${params.code}` },
    create_wallet:        { method: 'POST', path: '/api/agentkit/wallet/create', body: params },
    execute_trade:        { method: 'POST', path: '/api/agentkit/strategy/execute', body: params },
    list_integrations:    { method: 'GET',  path: '/api/integrations' },
    query_integration:    { method: 'GET',  path: `/api/integrations/${params.id}/capabilities` },
    generate_chatbot:     { method: 'POST', path: '/api/chatbot/generate', body: params },
    create_image:         { method: 'POST', path: '/api/images/generate', body: params },
    health_check:         { method: 'GET',  path: '/health' },
    get_analytics:        { method: 'GET',  path: '/api/analytics/prebuilt' }
  };

  const route = routes[toolName];
  if (!route) throw new Error(`Unknown tool: ${toolName}`);

  const url = `${DEVBOT_BASE}${route.path}`;
  const options = {
    method: route.method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (route.body && route.method !== 'GET') {
    options.body = JSON.stringify(route.body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DevBot API error ${res.status}: ${text}`);
  }

  return res.json();
}

export default { manifest, execute };
