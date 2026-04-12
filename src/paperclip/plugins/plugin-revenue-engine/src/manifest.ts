/**
 * DevBot Revenue Engine — Plugin Manifest
 *
 * Declares all capabilities, tools, UI slots, and routes
 * for the Paperclip plugin system.
 */

export const manifest = {
  name: '@devbot/plugin-revenue-engine',
  displayName: 'DevBot Revenue Engine',
  version: '1.0.0',
  description:
    'Full revenue orchestration for DevBot AI. 10 revenue streams, 49 API tools, ' +
    'real-time dashboard, automated SaaS factory, affiliate management, crypto trading, ' +
    'and content monetization — all integrated with Claude Code, Supabase, Google Cloud, ' +
    'Figma, Slack, GitHub, and n8n.',

  capabilities: [
    'tools',        // Expose DevBot API tools to agents
    'ui:page',      // Revenue dashboard page in Paperclip UI
    'ui:sidebar',   // Revenue summary sidebar widget
    'webhooks',     // Stripe/n8n webhook handling
  ],

  tools: [
    // ── App Generation ────────────────────────────────────────
    {
      name: 'devbot_generate_app',
      description: 'Generate a complete production app using Claude Opus 4.6. Returns full file tree.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'App description and requirements' },
        language: { type: 'string', default: 'typescript' },
        framework: { type: 'string', default: 'nextjs' },
      },
    },
    {
      name: 'devbot_review_code',
      description: 'AI code review with security analysis, performance suggestions, and best practices.',
      parameters: {
        code: { type: 'string', required: true },
        language: { type: 'string', default: 'typescript' },
      },
    },

    // ── Commerce & Payments ───────────────────────────────────
    {
      name: 'devbot_create_checkout',
      description: 'Create a Stripe checkout session for any DevBot product.',
      parameters: {
        plan: { type: 'string', required: true, enum: ['solo', 'pro', 'enterprise'] },
        email: { type: 'string', required: true },
        product: { type: 'string', default: 'devbot-subscription' },
      },
    },
    {
      name: 'devbot_get_credits',
      description: 'Check a user credit balance.',
      parameters: { email: { type: 'string', required: true } },
    },
    {
      name: 'devbot_buy_credits',
      description: 'Purchase a credit pack.',
      parameters: {
        email: { type: 'string', required: true },
        pack: { type: 'string', required: true },
      },
    },

    // ── Affiliate System ──────────────────────────────────────
    {
      name: 'devbot_affiliate_signup',
      description: 'Onboard a new affiliate partner.',
      parameters: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
      },
    },
    {
      name: 'devbot_affiliate_dashboard',
      description: 'Get affiliate performance stats.',
      parameters: { code: { type: 'string', required: true } },
    },
    {
      name: 'devbot_affiliate_leaderboard',
      description: 'Get top performing affiliates.',
      parameters: {},
    },

    // ── Crypto Trading ────────────────────────────────────────
    {
      name: 'devbot_create_wallet',
      description: 'Create a new crypto wallet via Coinbase CDP.',
      parameters: { email: { type: 'string', required: true } },
    },
    {
      name: 'devbot_execute_swap',
      description: 'Execute a token swap on Coinbase CDP.',
      parameters: {
        email: { type: 'string', required: true },
        fromToken: { type: 'string', required: true },
        toToken: { type: 'string', required: true },
        amount: { type: 'string', required: true },
      },
    },
    {
      name: 'devbot_execute_strategy',
      description: 'Execute a trading strategy (DCA, swing, momentum).',
      parameters: {
        email: { type: 'string', required: true },
        strategy: { type: 'string', required: true },
        params: { type: 'object', default: {} },
      },
    },
    {
      name: 'devbot_trade_history',
      description: 'Get trade history for a user.',
      parameters: { email: { type: 'string', required: true } },
    },

    // ── Workflows ─────────────────────────────────────────────
    {
      name: 'devbot_start_workflow',
      description: 'Start an automated workflow from a template.',
      parameters: {
        templateId: { type: 'string', required: true },
        params: { type: 'object', default: {} },
      },
    },
    {
      name: 'devbot_list_workflows',
      description: 'List all workflows with status.',
      parameters: {},
    },
    {
      name: 'devbot_workflow_dashboard',
      description: 'Get workflow performance metrics.',
      parameters: {},
    },

    // ── Integrations ──────────────────────────────────────────
    {
      name: 'devbot_list_integrations',
      description: 'List all 37+ DevBot integrations.',
      parameters: {},
    },
    {
      name: 'devbot_integration_capabilities',
      description: 'Get capabilities for a specific integration.',
      parameters: { id: { type: 'string', required: true } },
    },

    // ── Content & Marketing ───────────────────────────────────
    {
      name: 'devbot_generate_chatbot',
      description: 'Generate a chatbot from a template.',
      parameters: {
        template: { type: 'string', required: true },
        config: { type: 'object', default: {} },
      },
    },
    {
      name: 'devbot_generate_image',
      description: 'Generate an AI image via ComfyUI/Diffusers.',
      parameters: {
        prompt: { type: 'string', required: true },
        style: { type: 'string', default: 'realistic' },
      },
    },

    // ── Analytics & Health ────────────────────────────────────
    {
      name: 'devbot_health_check',
      description: 'Full system health check — all services, integrations, revenue streams.',
      parameters: {},
    },
    {
      name: 'devbot_analytics',
      description: 'Get analytics dashboard data.',
      parameters: {},
    },
    {
      name: 'devbot_revenue_report',
      description: 'Get real-time revenue report across all streams.',
      parameters: {},
    },

    // ── Academy & Courses ─────────────────────────────────────
    {
      name: 'devbot_list_lessons',
      description: 'List all Prompt Engineering Academy lessons.',
      parameters: {},
    },
    {
      name: 'devbot_get_lesson',
      description: 'Get a specific lesson.',
      parameters: { id: { type: 'string', required: true } },
    },

    // ── Zapier / Webhooks ─────────────────────────────────────
    {
      name: 'devbot_send_webhook',
      description: 'Send a generic webhook to Zapier or any URL.',
      parameters: {
        url: { type: 'string' },
        payload: { type: 'object', required: true },
      },
    },
  ],

  ui: [
    {
      slot: 'page',
      routePath: '/revenue',
      title: 'Revenue Engine',
      icon: 'dollar-sign',
    },
    {
      slot: 'sidebar',
      title: 'Revenue Summary',
      icon: 'trending-up',
    },
  ],
} as const;
