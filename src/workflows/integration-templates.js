/**
 * DevBot AI — Integration Workflow Templates
 *
 * Pre-built workflow templates that leverage the 5 integration services:
 * Financial trading, chatbot creation, SharePoint app generation,
 * prompt mastery, and full-stack analysis pipelines.
 */

// ─── Template 1: Financial Trading Pipeline ────────────────────────────────
const financialTradingPipeline = {
  id: 'financial-trading-pipeline',
  name: 'Financial Trading Pipeline',
  description: 'Get quote, analyze with AI, generate signal, execute trade via agentkit, Slack alert',
  category: 'trading',
  integrations: ['financial'],
  steps: [
    {
      id: 'get-quote',
      name: 'Get Stock Quote',
      type: 'integration',
      config: { service: 'financial', action: 'getStockQuote' },
      input: { symbol: '{{trigger.symbol}}' },
      output: 'quote',
      timeout: 30_000,
      retries: 2,
    },
    {
      id: 'get-profile',
      name: 'Get Company Profile',
      type: 'integration',
      config: { service: 'financial', action: 'getCompanyProfile' },
      input: { symbol: '{{trigger.symbol}}' },
      output: 'profile',
      timeout: 30_000,
      retries: 2,
      dependsOn: [],
    },
    {
      id: 'generate-report',
      name: 'AI Financial Analysis',
      type: 'integration',
      config: { service: 'financial', action: 'generateFinancialReport' },
      input: { symbol: '{{trigger.symbol}}' },
      output: 'report',
      timeout: 120_000,
      retries: 1,
      dependsOn: ['get-quote', 'get-profile'],
    },
    {
      id: 'generate-signal',
      name: 'Generate Trading Signal',
      type: 'integration',
      config: { service: 'financial', action: 'generateTradingSignal' },
      input: { symbol: '{{trigger.symbol}}', strategy: '{{trigger.strategy || "momentum"}}' },
      output: 'signal',
      timeout: 60_000,
      retries: 1,
      dependsOn: ['generate-report'],
    },
    {
      id: 'execute-trade',
      name: 'Execute Trade via AgentKit',
      type: 'trading_execute',
      config: {
        action: 'execute',
        symbol: '{{trigger.symbol}}',
        signal: '{{steps.signal}}',
        maxPosition: '{{trigger.maxPosition || 1000}}',
      },
      output: 'trade',
      timeout: 60_000,
      retries: 0,
      dependsOn: ['generate-signal'],
      condition: '{{steps.signal.confidence > 70}}',
    },
    {
      id: 'slack-alert',
      name: 'Send Slack Alert',
      type: 'slack_notify',
      config: {
        channel: '{{trigger.slackChannel || "#trading-alerts"}}',
        message: 'Trading Signal for {{trigger.symbol}}: {{steps.signal.recommendation}} (Confidence: {{steps.signal.confidence}}%)',
        attachments: [
          { title: 'Report Summary', text: '{{steps.report.summary}}' },
          { title: 'Trade Executed', text: '{{steps.trade.status || "Skipped — confidence below threshold"}}' },
        ],
      },
      output: 'notification',
      timeout: 15_000,
      retries: 2,
      dependsOn: ['execute-trade'],
    },
  ],
  triggers: {
    manual: { params: ['symbol', 'strategy', 'maxPosition', 'slackChannel'] },
    scheduled: { cron: '0 9,16 * * 1-5', description: 'Market open and close, weekdays' },
    webhook: { path: '/webhooks/trading-pipeline' },
  },
};

// ─── Template 2: Chatbot Creation Pipeline ─────────────────────────────────
const chatbotCreationPipeline = {
  id: 'chatbot-creation-pipeline',
  name: 'Chatbot Creation Pipeline',
  description: 'Select template, customize config, generate UI, generate API, test, deploy, notify',
  category: 'chatbot',
  integrations: ['chatbot-builder'],
  steps: [
    {
      id: 'select-template',
      name: 'Select Industry Template',
      type: 'integration',
      config: { service: 'chatbot-builder', action: 'listTemplates' },
      output: 'templates',
      timeout: 5_000,
    },
    {
      id: 'create-chatbot',
      name: 'Create Chatbot Config',
      type: 'integration',
      config: { service: 'chatbot-builder', action: 'createChatbot' },
      input: {
        name: '{{trigger.name}}',
        industry: '{{trigger.industry}}',
        tone: '{{trigger.tone}}',
        primaryColor: '{{trigger.primaryColor || "#2563eb"}}',
        logoUrl: '{{trigger.logoUrl}}',
        greetingMessage: '{{trigger.greetingMessage}}',
        faqs: '{{trigger.faqs || []}}',
        escalationEmail: '{{trigger.escalationEmail}}',
      },
      output: 'chatbot',
      timeout: 10_000,
      dependsOn: ['select-template'],
    },
    {
      id: 'generate-ui',
      name: 'Generate Chatbot UI',
      type: 'integration',
      config: { service: 'chatbot-builder', action: 'generateChatbotUI' },
      input: { chatbotId: '{{steps.chatbot.id}}' },
      output: 'ui',
      timeout: 120_000,
      retries: 1,
      dependsOn: ['create-chatbot'],
    },
    {
      id: 'generate-api',
      name: 'Generate Chatbot API',
      type: 'integration',
      config: { service: 'chatbot-builder', action: 'generateChatbotAPI' },
      input: { chatbotId: '{{steps.chatbot.id}}' },
      output: 'api',
      timeout: 120_000,
      retries: 1,
      dependsOn: ['create-chatbot'],
    },
    {
      id: 'test-conversation',
      name: 'Test Conversation',
      type: 'integration',
      config: { service: 'chatbot-builder', action: 'testConversation' },
      input: {
        chatbotId: '{{steps.chatbot.id}}',
        messages: ['Hello', 'What services do you offer?', 'How do I get started?'],
      },
      output: 'testResults',
      timeout: 60_000,
      dependsOn: ['generate-ui', 'generate-api'],
    },
    {
      id: 'deploy-config',
      name: 'Generate Deployment Config',
      type: 'integration',
      config: { service: 'chatbot-builder', action: 'deploymentConfig' },
      input: { chatbotId: '{{steps.chatbot.id}}' },
      output: 'deployment',
      timeout: 10_000,
      dependsOn: ['test-conversation'],
    },
    {
      id: 'notify-complete',
      name: 'Send Completion Notification',
      type: 'slack_notify',
      config: {
        channel: '{{trigger.slackChannel || "#chatbot-builds"}}',
        message: 'Chatbot "{{steps.chatbot.name}}" created for {{steps.chatbot.industryDisplayName}} industry! Ready for deployment.',
      },
      output: 'notification',
      timeout: 15_000,
      retries: 2,
      dependsOn: ['deploy-config'],
    },
  ],
  triggers: {
    manual: { params: ['name', 'industry', 'tone', 'primaryColor', 'logoUrl', 'greetingMessage', 'faqs', 'escalationEmail', 'slackChannel'] },
    webhook: { path: '/webhooks/chatbot-creation' },
  },
};

// ─── Template 3: SharePoint App Pipeline ───────────────────────────────────
const sharepointAppPipeline = {
  id: 'sharepoint-app-pipeline',
  name: 'SharePoint App Pipeline',
  description: 'Describe app, search docs for patterns, generate SPFx app, review code, push to GitHub',
  category: 'sharepoint',
  integrations: ['sharepoint'],
  steps: [
    {
      id: 'search-docs',
      name: 'Search Documentation',
      type: 'integration',
      config: { service: 'sharepoint', action: 'searchDocs' },
      input: { query: '{{trigger.description}}' },
      output: 'docResults',
      timeout: 30_000,
      retries: 2,
    },
    {
      id: 'generate-app',
      name: 'Generate SPFx Application',
      type: 'integration',
      config: { service: 'sharepoint', action: 'generateSPFxApp' },
      input: { description: '{{trigger.description}}' },
      output: 'app',
      timeout: 180_000,
      retries: 1,
      dependsOn: ['search-docs'],
    },
    {
      id: 'review-code',
      name: 'AI Code Review',
      type: 'ai_review',
      config: {
        prompt: 'Review this SPFx application code for best practices, security issues, and performance. Provide specific suggestions.',
        code: '{{steps.app.output}}',
      },
      output: 'review',
      timeout: 120_000,
      retries: 1,
      dependsOn: ['generate-app'],
    },
    {
      id: 'push-github',
      name: 'Push to GitHub',
      type: 'github_push',
      config: {
        repo: '{{trigger.repo || trigger.githubRepo}}',
        branch: '{{trigger.branch || "feature/spfx-app"}}',
        message: 'feat: generated SPFx app — {{trigger.description}}',
        files: '{{steps.app.output}}',
      },
      output: 'pushResult',
      timeout: 60_000,
      retries: 2,
      dependsOn: ['review-code'],
    },
  ],
  triggers: {
    manual: { params: ['description', 'repo', 'branch'] },
    webhook: { path: '/webhooks/sharepoint-app' },
  },
};

// ─── Template 4: Prompt Mastery Workflow ────────────────────────────────────
const promptMasteryWorkflow = {
  id: 'prompt-mastery-workflow',
  name: 'Prompt Mastery Workflow',
  description: 'Start lesson, generate exercise, user submits, AI evaluates, track progress, award certificate',
  category: 'education',
  integrations: ['prompt-academy'],
  steps: [
    {
      id: 'get-lesson',
      name: 'Load Lesson Content',
      type: 'integration',
      config: { service: 'prompt-academy', action: 'getLesson' },
      input: { id: '{{trigger.lessonId}}' },
      output: 'lesson',
      timeout: 5_000,
    },
    {
      id: 'generate-exercise',
      name: 'Generate Practice Exercise',
      type: 'integration',
      config: { service: 'prompt-academy', action: 'generateExercise' },
      input: { lessonId: '{{trigger.lessonId}}' },
      output: 'exercise',
      timeout: 60_000,
      retries: 1,
      dependsOn: ['get-lesson'],
    },
    {
      id: 'wait-submission',
      name: 'Wait for User Submission',
      type: 'wait_input',
      config: {
        prompt: 'Submit your prompt for the exercise: {{steps.exercise.title}}',
        inputType: 'text',
        timeout: 3_600_000,
      },
      output: 'submission',
      dependsOn: ['generate-exercise'],
    },
    {
      id: 'evaluate',
      name: 'AI Evaluate Submission',
      type: 'integration',
      config: { service: 'prompt-academy', action: 'evaluatePrompt' },
      input: {
        prompt: '{{steps.submission.text}}',
        criteria: '{{steps.exercise.evaluationCriteria}}',
      },
      output: 'evaluation',
      timeout: 60_000,
      retries: 1,
      dependsOn: ['wait-submission'],
    },
    {
      id: 'track-progress',
      name: 'Update Progress',
      type: 'integration',
      config: { service: 'prompt-academy', action: 'updateProgress' },
      input: {
        userId: '{{trigger.userId}}',
        lessonId: '{{trigger.lessonId}}',
        data: {
          completed: '{{steps.evaluation.overallScore >= 60}}',
          score: '{{steps.evaluation.overallScore}}',
          exerciseId: '{{steps.exercise.id}}',
        },
      },
      output: 'progress',
      timeout: 5_000,
      dependsOn: ['evaluate'],
    },
    {
      id: 'check-certification',
      name: 'Check Certification Eligibility',
      type: 'integration',
      config: { service: 'prompt-academy', action: 'getCertification' },
      input: { userId: '{{trigger.userId}}' },
      output: 'certification',
      timeout: 5_000,
      dependsOn: ['track-progress'],
    },
    {
      id: 'award-certificate',
      name: 'Generate Certificate',
      type: 'integration',
      config: { service: 'prompt-academy', action: 'generateCertificate' },
      input: {
        userId: '{{trigger.userId}}',
        name: '{{trigger.userName}}',
      },
      output: 'certificate',
      timeout: 10_000,
      dependsOn: ['check-certification'],
      condition: '{{steps.certification.eligible === true}}',
    },
  ],
  triggers: {
    manual: { params: ['userId', 'userName', 'lessonId'] },
    webhook: { path: '/webhooks/prompt-mastery' },
  },
};

// ─── Template 5: Full-Stack Analysis ───────────────────────────────────────
const fullStackAnalysis = {
  id: 'full-stack-analysis',
  name: 'Full-Stack Analysis Pipeline',
  description: 'Get financial data, compare with agent benchmarks, generate report, email results, post to Slack',
  category: 'analysis',
  integrations: ['financial', 'agent-benchmarks'],
  steps: [
    {
      id: 'get-financial-data',
      name: 'Fetch Financial Data',
      type: 'integration',
      config: { service: 'financial', action: 'getStockQuote' },
      input: { symbol: '{{trigger.symbol}}' },
      output: 'quote',
      timeout: 30_000,
      retries: 2,
    },
    {
      id: 'get-profile',
      name: 'Fetch Company Profile',
      type: 'integration',
      config: { service: 'financial', action: 'getCompanyProfile' },
      input: { symbol: '{{trigger.symbol}}' },
      output: 'profile',
      timeout: 30_000,
      retries: 2,
    },
    {
      id: 'get-agent-ranking',
      name: 'Get Agent Rankings',
      type: 'integration',
      config: { service: 'agent-benchmarks', action: 'getOverallRanking' },
      output: 'ranking',
      timeout: 5_000,
    },
    {
      id: 'generate-report',
      name: 'Generate AI Report',
      type: 'integration',
      config: { service: 'financial', action: 'generateFinancialReport' },
      input: { symbol: '{{trigger.symbol}}' },
      output: 'report',
      timeout: 120_000,
      retries: 1,
      dependsOn: ['get-financial-data', 'get-profile'],
    },
    {
      id: 'agent-recommendation',
      name: 'Get Agent Recommendation',
      type: 'integration',
      config: { service: 'agent-benchmarks', action: 'generateRecommendation' },
      input: { projectDescription: 'Build a financial dashboard for {{trigger.symbol}} stock analysis' },
      output: 'agentRec',
      timeout: 60_000,
      retries: 1,
      dependsOn: ['get-agent-ranking'],
    },
    {
      id: 'email-results',
      name: 'Email Results',
      type: 'email_send',
      config: {
        to: '{{trigger.email}}',
        subject: 'Full-Stack Analysis: {{trigger.symbol}}',
        body: 'Financial Report and Agent Recommendations attached.',
        attachments: [
          { name: 'financial-report.json', content: '{{steps.report}}' },
          { name: 'agent-recommendation.json', content: '{{steps.agentRec}}' },
        ],
      },
      output: 'emailResult',
      timeout: 30_000,
      retries: 2,
      dependsOn: ['generate-report', 'agent-recommendation'],
    },
    {
      id: 'slack-post',
      name: 'Post to Slack',
      type: 'slack_notify',
      config: {
        channel: '{{trigger.slackChannel || "#analysis"}}',
        message: 'Full-Stack Analysis complete for {{trigger.symbol}}. Report emailed to {{trigger.email}}.',
        attachments: [
          { title: 'Stock Price', text: '${{steps.quote.price}} ({{steps.quote.changesPercentage}}%)' },
          { title: 'Recommended Agent', text: '{{steps.agentRec.topAgents[0].displayName}}' },
        ],
      },
      output: 'slackResult',
      timeout: 15_000,
      retries: 2,
      dependsOn: ['email-results'],
    },
  ],
  triggers: {
    manual: { params: ['symbol', 'email', 'slackChannel'] },
    scheduled: { cron: '0 18 * * 5', description: 'Every Friday at 6 PM' },
    webhook: { path: '/webhooks/full-stack-analysis' },
  },
};

// ─── Export All Templates ──────────────────────────────────────────────────

/**
 * All integration workflow templates.
 * @type {Object[]}
 */
export const INTEGRATION_TEMPLATES = [
  financialTradingPipeline,
  chatbotCreationPipeline,
  sharepointAppPipeline,
  promptMasteryWorkflow,
  fullStackAnalysis,
];

/**
 * Get an integration workflow template by ID.
 * @param {string} templateId - Template identifier
 * @returns {Object|null} Template definition or null
 */
export function getIntegrationTemplate(templateId) {
  return INTEGRATION_TEMPLATES.find(t => t.id === templateId) || null;
}

/**
 * List all integration workflow templates.
 * @returns {Object[]} Template summaries
 */
export function listIntegrationTemplates() {
  return INTEGRATION_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    integrations: t.integrations,
    stepCount: t.steps.length,
    triggers: Object.keys(t.triggers),
  }));
}

/**
 * List templates filtered by integration service.
 * @param {string} integrationId - Integration ID to filter by
 * @returns {Object[]}
 */
export function listTemplatesByIntegration(integrationId) {
  return INTEGRATION_TEMPLATES.filter(t =>
    t.integrations.includes(integrationId)
  ).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
  }));
}

export default INTEGRATION_TEMPLATES;
