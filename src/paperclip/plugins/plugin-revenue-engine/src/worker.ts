/**
 * DevBot Revenue Engine — Plugin Worker
 *
 * Routes all 25 tool calls from Paperclip agents to the DevBot API.
 * Handles webhooks from Stripe and n8n.
 */

import { manifest } from './manifest.js';

const DEVBOT_API = process.env.DEVBOT_URL || 'http://localhost:3000';

// ── Tool → DevBot API route mapping ──────────────────────────────────────────
const ROUTES: Record<string, { method: string; path: (p: any) => string }> = {
  // App Generation
  devbot_generate_app:         { method: 'POST', path: () => '/api/generate' },
  devbot_review_code:          { method: 'POST', path: () => '/api/review' },

  // Commerce
  devbot_create_checkout:      { method: 'POST', path: () => '/api/checkout' },
  devbot_get_credits:          { method: 'GET',  path: (p) => `/api/credits/balance/${p.email}` },
  devbot_buy_credits:          { method: 'POST', path: () => '/api/credits/buy' },

  // Affiliates
  devbot_affiliate_signup:     { method: 'POST', path: () => '/api/affiliates/signup' },
  devbot_affiliate_dashboard:  { method: 'GET',  path: (p) => `/api/affiliates/dashboard/${p.code}` },
  devbot_affiliate_leaderboard:{ method: 'GET',  path: () => '/api/affiliates/leaderboard' },

  // Trading
  devbot_create_wallet:        { method: 'POST', path: () => '/api/agentkit/wallet/create' },
  devbot_execute_swap:         { method: 'POST', path: () => '/api/agentkit/swap' },
  devbot_execute_strategy:     { method: 'POST', path: () => '/api/agentkit/strategy/execute' },
  devbot_trade_history:        { method: 'GET',  path: (p) => `/api/agentkit/trades/${p.email}` },

  // Workflows
  devbot_start_workflow:       { method: 'POST', path: () => '/api/workflows/start' },
  devbot_list_workflows:       { method: 'GET',  path: () => '/api/workflows' },
  devbot_workflow_dashboard:   { method: 'GET',  path: () => '/api/workflows/dashboard' },

  // Integrations
  devbot_list_integrations:    { method: 'GET',  path: () => '/api/integrations' },
  devbot_integration_capabilities: { method: 'GET', path: (p) => `/api/integrations/${p.id}/capabilities` },

  // Content
  devbot_generate_chatbot:     { method: 'POST', path: () => '/api/chatbot/generate' },
  devbot_generate_image:       { method: 'POST', path: () => '/api/images/generate' },

  // Analytics
  devbot_health_check:         { method: 'GET',  path: () => '/health' },
  devbot_analytics:            { method: 'GET',  path: () => '/api/analytics/prebuilt' },
  devbot_revenue_report:       { method: 'GET',  path: () => '/api/analytics/prebuilt' },

  // Academy
  devbot_list_lessons:         { method: 'GET',  path: () => '/api/academy/lessons' },
  devbot_get_lesson:           { method: 'GET',  path: (p) => `/api/academy/lessons/${p.id}` },

  // Webhooks
  devbot_send_webhook:         { method: 'POST', path: () => '/api/zapier/send' },
};

// ── DevBot API caller ────────────────────────────────────────────────────────
async function callDevBot(toolName: string, params: Record<string, any>): Promise<any> {
  const route = ROUTES[toolName];
  if (!route) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const url = `${DEVBOT_API}${route.path(params)}`;
  const options: RequestInit = {
    method: route.method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (route.method !== 'GET' && params) {
    options.body = JSON.stringify(params);
  }

  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DevBot API ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Plugin worker entry point ────────────────────────────────────────────────
export default {
  manifest,

  /**
   * Called by Paperclip when an agent invokes one of our tools.
   */
  async onToolCall(ctx: {
    toolName: string;
    parameters: Record<string, any>;
    agentId: string;
    companyId: string;
  }) {
    const { toolName, parameters } = ctx;

    try {
      const result = await callDevBot(toolName, parameters);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Called by Paperclip when a webhook hits our plugin route.
   */
  async onWebhook(ctx: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body: any;
  }) {
    const { path, body } = ctx;

    // Stripe webhook handler
    if (path === '/webhook/stripe') {
      const event = body;
      switch (event.type) {
        case 'checkout.session.completed':
          return {
            action: 'create_issue',
            title: `[AUTO] New sale: ${event.data?.object?.customer_email}`,
            description: `Stripe checkout completed. Amount: $${(event.data?.object?.amount_total || 0) / 100}. Deliver product and send onboarding email.`,
            priority: 'high',
            assignTo: 'SalesBot',
          };
        case 'customer.subscription.created':
          return {
            action: 'create_issue',
            title: `[AUTO] New subscription: ${event.data?.object?.customer}`,
            description: `New recurring subscription created. Set up onboarding workflow.`,
            priority: 'high',
            assignTo: 'SupportBot',
          };
        default:
          return { action: 'log', message: `Unhandled Stripe event: ${event.type}` };
      }
    }

    // n8n webhook handler
    if (path === '/webhook/n8n') {
      return {
        action: 'create_issue',
        title: `[n8n] Workflow event: ${body.workflow || 'unknown'}`,
        description: JSON.stringify(body, null, 2),
        priority: 'medium',
        assignTo: 'WorkflowBot',
      };
    }

    return { action: 'noop' };
  },

  /**
   * Plugin lifecycle — called when installed.
   */
  async onInstall(ctx: { companyId: string }) {
    console.log(`[DevBot Revenue Engine] Installed for company ${ctx.companyId}`);
    console.log(`[DevBot Revenue Engine] DevBot API: ${DEVBOT_API}`);
    console.log(`[DevBot Revenue Engine] 25 tools registered, 2 UI slots, webhook handlers active`);
    return { ok: true };
  },
};
