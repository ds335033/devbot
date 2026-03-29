/**
 * DevBot AI — Integration System Entry Point
 *
 * Imports all 14 integration services plus the Registry,
 * initializes them with shared DevBot engine/GitHub client,
 * and registers each in the central registry.
 */

import { Registry } from './registry.js';
import { SharePointDocsService } from './sharepoint.js';
import { FinancialDataService } from './financial.js';
import { ChatbotBuilderService } from './chatbot-builder.js';
import { AgentBenchmarkService } from './agent-benchmarks.js';
import { PromptAcademyService } from './prompt-academy.js';
import { RagService } from './langchain-rag.js';
import { ImageGenService } from './image-gen.js';
import { VoiceAIService } from './voice-ai.js';
import { DifyBuilderService } from './dify-builder.js';
import { LlamaIndexService } from './llama-index.js';
import { CommerceService } from './commerce.js';
import { CMSService } from './cms.js';
import { BillingService } from './billing.js';
import { ShopifySyncService } from './shopify-sync.js';

/**
 * Initialize all integration services.
 * @param {Object} [services] - Shared DevBot services
 * @param {Object} [services.engine] - DevBot AI engine instance
 * @param {Object} [services.github] - DevBot GitHub client
 * @param {string} [services.financialApiKey] - FMP API key override
 * @returns {Object} All initialized integration services
 */
export function initializeIntegrations(services = {}) {
  const { engine, github, financialApiKey } = services;

  console.log('[DevBot][Integrations] Initializing integration system...');

  // Create the central registry
  const registry = new Registry();

  // Initialize all services with shared engine
  const sharepoint = new SharePointDocsService({ engine });
  const financial = new FinancialDataService({ engine, apiKey: financialApiKey });
  const chatbotBuilder = new ChatbotBuilderService({ engine });
  const agentBenchmarks = new AgentBenchmarkService({ engine });
  const promptAcademy = new PromptAcademyService({ engine });
  const rag = new RagService({ engine });
  const imageGen = new ImageGenService({ engine });
  const voiceAI = new VoiceAIService({ engine });
  const difyBuilder = new DifyBuilderService({ engine });
  const llamaIndex = new LlamaIndexService({ engine });
  const commerce = new CommerceService({ engine });
  const cms = new CMSService({ engine });
  const billing = new BillingService({ engine });
  const shopifySync = new ShopifySyncService({ engine });

  // Register all integrations
  registry.register(SharePointDocsService.registryEntry);
  registry.register(FinancialDataService.registryEntry);
  registry.register(ChatbotBuilderService.registryEntry);
  registry.register(AgentBenchmarkService.registryEntry);
  registry.register(PromptAcademyService.registryEntry);
  registry.register(RagService.registryEntry);
  registry.register(ImageGenService.registryEntry);
  registry.register(VoiceAIService.registryEntry);
  registry.register(DifyBuilderService.registryEntry);
  registry.register(LlamaIndexService.registryEntry);
  registry.register(CommerceService.registryEntry);
  registry.register(CMSService.registryEntry);
  registry.register(BillingService.registryEntry);
  registry.register(ShopifySyncService.registryEntry);

  console.log(`[DevBot][Integrations] All ${registry.list().length} integrations initialized and registered`);

  return {
    registry,
    sharepoint,
    financial,
    chatbotBuilder,
    agentBenchmarks,
    promptAcademy,
    rag,
    imageGen,
    voiceAI,
    difyBuilder,
    llamaIndex,
    commerce,
    cms,
    billing,
    shopifySync,
  };
}

export {
  Registry,
  SharePointDocsService,
  FinancialDataService,
  ChatbotBuilderService,
  AgentBenchmarkService,
  PromptAcademyService,
  RagService,
  ImageGenService,
  VoiceAIService,
  DifyBuilderService,
  LlamaIndexService,
  CommerceService,
  CMSService,
  BillingService,
  ShopifySyncService,
};

export default initializeIntegrations;
