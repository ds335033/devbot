/**
 * DevBot AI — Integration System Entry Point
 *
 * Imports all 5 integration services plus the Registry,
 * initializes them with shared DevBot engine/GitHub client,
 * and registers each in the central registry.
 */

import { Registry } from './registry.js';
import { SharePointDocsService } from './sharepoint.js';
import { FinancialDataService } from './financial.js';
import { ChatbotBuilderService } from './chatbot-builder.js';
import { AgentBenchmarkService } from './agent-benchmarks.js';
import { PromptAcademyService } from './prompt-academy.js';

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

  // Register all integrations
  registry.register(SharePointDocsService.registryEntry);
  registry.register(FinancialDataService.registryEntry);
  registry.register(ChatbotBuilderService.registryEntry);
  registry.register(AgentBenchmarkService.registryEntry);
  registry.register(PromptAcademyService.registryEntry);

  console.log(`[DevBot][Integrations] All ${registry.list().length} integrations initialized and registered`);

  return {
    registry,
    sharepoint,
    financial,
    chatbotBuilder,
    agentBenchmarks,
    promptAcademy,
  };
}

export {
  Registry,
  SharePointDocsService,
  FinancialDataService,
  ChatbotBuilderService,
  AgentBenchmarkService,
  PromptAcademyService,
};

export default initializeIntegrations;
