/**
 * DevBot AI — Wave 2+3 Integration System Entry Point
 *
 * Imports and initializes all 16 Wave 2+3 integration services,
 * registers each in the central registry with capabilities.
 */

import { RagService } from './langchain-rag.js';
import { ImageGenService } from './image-gen.js';
import { VoiceAIService } from './voice-ai.js';
import { DifyBuilderService } from './dify-builder.js';
import { LlamaIndexService } from './llama-index.js';
import { CommerceService } from './commerce.js';
import { CMSService } from './cms.js';
import { BillingService } from './billing.js';
import { ShopifySyncService } from './shopify-sync.js';
import { WorkflowAutomationService } from './workflow-automation.js';
import { NotificationService } from './notifications.js';
import { WhatsAppService } from './whatsapp.js';
import { AuthService } from './auth.js';
import { EmailTemplateService } from './email-templates.js';
import { LowCodeService } from './low-code.js';
import { AnalyticsService } from './analytics.js';

/**
 * Initialize all Wave 2+3 integration services and register them.
 * @param {Object} [services] - Shared DevBot services
 * @param {Object} [services.engine] - DevBot AI engine instance
 * @param {Object} [services.github] - DevBot GitHub client
 * @param {Object} [registry] - Central integration registry
 * @returns {Object} All initialized Wave 2+3 service instances
 */
export function initializeWave2Integrations(services = {}, registry) {
  const { engine, github } = services;

  console.log('[DevBot][Wave2+3] Initializing Wave 2+3 integration system...');

  // ─── Create all 16 service instances ────────────────────────────────────

  const rag = new RagService({ engine });
  const imageGen = new ImageGenService({ engine });
  const voiceAI = new VoiceAIService({ engine });
  const difyBuilder = new DifyBuilderService({ engine });
  const llamaIndex = new LlamaIndexService({ engine });
  const commerce = new CommerceService({ engine });
  const cms = new CMSService({ engine });
  const billing = new BillingService({ engine });
  const shopifySync = new ShopifySyncService({ engine });
  const workflowAutomation = new WorkflowAutomationService({ engine });
  const notifications = new NotificationService({ engine });
  const whatsapp = new WhatsAppService({ engine });
  const auth = new AuthService({ engine });
  const emailTemplates = new EmailTemplateService({ engine });
  const lowCode = new LowCodeService({ engine });
  const analytics = new AnalyticsService({ engine });

  // ─── Register all services ──────────────────────────────────────────────

  const registrations = [
    {
      id: 'langchain-rag',
      name: 'LangChain RAG',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'ai',
      capabilities: ['knowledge-bases', 'document-chunking', 'vector-search', 'retrieval-augmented-generation'],
    },
    {
      id: 'image-gen',
      name: 'AI Image Generation',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'ai',
      capabilities: ['image-generation', 'upscaling', 'background-removal', 'style-transfer', 'multi-model'],
    },
    {
      id: 'voice-ai',
      name: 'Voice AI',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'ai',
      capabilities: ['speech-to-text', 'text-to-speech', 'voice-cloning', 'voice-agents', 'real-time-transcription'],
    },
    {
      id: 'dify-builder',
      name: 'Dify App Builder',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'ai',
      capabilities: ['app-builder', 'workflow-designer', 'prompt-engineering', 'app-publishing', 'analytics'],
    },
    {
      id: 'llama-index',
      name: 'LlamaIndex',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'ai',
      capabilities: ['index-creation', 'natural-language-query', 'sql-generation', 'document-indexing'],
    },
    {
      id: 'commerce',
      name: 'Commerce Platform',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'commerce',
      capabilities: ['store-management', 'products', 'orders', 'ai-descriptions', 'analytics'],
    },
    {
      id: 'cms',
      name: 'CMS Platform',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'content',
      capabilities: ['site-builder', 'content-management', 'ai-content-generation', 'seo-optimization', 'templates'],
    },
    {
      id: 'billing',
      name: 'Billing & Invoicing',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'finance',
      capabilities: ['invoices', 'subscriptions', 'quotes', 'revenue-dashboard', 'payment-processing'],
    },
    {
      id: 'shopify-sync',
      name: 'Shopify Sync',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'commerce',
      capabilities: ['shopify-connect', 'product-sync', 'order-sync', 'discounts', 'analytics'],
    },
    {
      id: 'workflow-automation',
      name: 'Workflow Automation',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'automation',
      capabilities: ['workflow-builder', 'triggers', 'actions', 'templates', 'scheduling', 'execution-history'],
    },
    {
      id: 'notifications',
      name: 'Notification Service',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'communication',
      capabilities: ['push-notifications', 'email', 'sms', 'bulk-send', 'templates', 'analytics'],
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'communication',
      capabilities: ['whatsapp-bots', 'messaging', 'menus', 'conversations', 'analytics'],
    },
    {
      id: 'auth',
      name: 'Auth & Multi-tenancy',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'security',
      capabilities: ['authentication', 'multi-tenancy', '2fa', 'api-keys', 'rbac', 'audit-log'],
    },
    {
      id: 'email-templates',
      name: 'Email Templates',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'communication',
      capabilities: ['email-builder', 'templates', 'ai-generation', 'rendering', 'sending', 'analytics'],
    },
    {
      id: 'low-code',
      name: 'Low-Code Platform',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'development',
      capabilities: ['app-builder', 'widgets', 'deployment', 'ai-generation', 'data-sources', 'drag-and-drop'],
    },
    {
      id: 'analytics',
      name: 'Analytics Platform',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'analytics',
      capabilities: ['dashboards', 'widgets', 'metrics', 'reports', 'sharing', 'grafana', 'superset', 'chartjs'],
    },
  ];

  if (registry) {
    for (const entry of registrations) {
      registry.register(entry);
    }
  }

  const count = registrations.length;
  console.log(`[DevBot][Wave2+3] All ${count} Wave 2+3 integrations initialized and registered`);

  return {
    rag,
    imageGen,
    voiceAI,
    difyBuilder,
    llamaIndex,
    commerce,
    cms,
    billing,
    shopifySync,
    workflowAutomation,
    notifications,
    whatsapp,
    auth,
    emailTemplates,
    lowCode,
    analytics,
  };
}

export {
  RagService,
  ImageGenService,
  VoiceAIService,
  DifyBuilderService,
  LlamaIndexService,
  CommerceService,
  CMSService,
  BillingService,
  ShopifySyncService,
  WorkflowAutomationService,
  NotificationService,
  WhatsAppService,
  AuthService,
  EmailTemplateService,
  LowCodeService,
  AnalyticsService,
};

export default initializeWave2Integrations;
