/**
 * DevBot AI — Chatbot Generator Integration
 *
 * Generates complete chatbot applications with customizable UI, API,
 * conversation handling, and deployment configs. Supports industry
 * templates with pre-built FAQs and compliance rules.
 *
 * Repo: https://github.com/MainakVerse/receptionist-chatbot-generator-consultancy
 * Revenue: $79/mo per chatbot (stream #46)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/chatbots');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Industry Templates ────────────────────────────────────────────────────
const TEMPLATES = {
  healthcare: {
    industry: 'healthcare',
    displayName: 'Healthcare',
    tone: 'professional, empathetic, and reassuring',
    complianceRules: [
      'Never provide medical diagnoses',
      'Always recommend consulting a healthcare professional',
      'HIPAA-compliant language only',
      'Do not store personal health information in chat logs',
    ],
    faqs: [
      { q: 'How do I schedule an appointment?', a: 'You can schedule an appointment by calling our office or using our online booking system. Would you like me to direct you there?' },
      { q: 'What insurance do you accept?', a: 'We accept most major insurance providers. Please contact our billing department for your specific plan details.' },
      { q: 'What are your office hours?', a: 'Our office hours are Monday through Friday, 8:00 AM to 5:00 PM. We also offer telehealth appointments.' },
      { q: 'How do I request a prescription refill?', a: 'Please contact your provider through our patient portal or call our pharmacy line during business hours.' },
    ],
    greetingMessage: 'Welcome! How can I help you with your healthcare needs today?',
  },
  legal: {
    industry: 'legal',
    displayName: 'Legal',
    tone: 'professional, precise, and authoritative',
    complianceRules: [
      'Never provide specific legal advice',
      'Always include disclaimer that responses are informational only',
      'Recommend consultation with a licensed attorney',
      'Maintain attorney-client privilege awareness',
    ],
    faqs: [
      { q: 'How do I schedule a consultation?', a: 'You can schedule a free initial consultation by calling our office or filling out the contact form on our website.' },
      { q: 'What areas of law do you practice?', a: 'We practice in several areas of law. I can help connect you with the right attorney for your needs.' },
      { q: 'How much does a consultation cost?', a: 'We offer free initial consultations for most practice areas. Complex cases may require a paid consultation.' },
      { q: 'Do you offer payment plans?', a: 'Yes, we offer flexible payment plans. Our billing department can discuss options that work for your situation.' },
    ],
    greetingMessage: 'Welcome to our law firm. How can I assist you today? Please note that I provide general information only, not legal advice.',
  },
  realestate: {
    industry: 'realestate',
    displayName: 'Real Estate',
    tone: 'friendly, knowledgeable, and enthusiastic',
    complianceRules: [
      'Fair Housing Act compliance — no discriminatory language',
      'Do not guarantee property values or investment returns',
      'Include equal opportunity housing disclaimer',
    ],
    faqs: [
      { q: 'How do I schedule a property viewing?', a: 'I can help arrange a viewing! Please share the property address or listing ID and your preferred times.' },
      { q: 'What is the process for buying a home?', a: 'The home buying process includes pre-approval, property search, making an offer, inspections, and closing. I can walk you through each step!' },
      { q: 'Do you help with rentals?', a: 'Yes! We have a wide selection of rental properties. Let me know your preferences for location, budget, and size.' },
      { q: 'How do I list my property?', a: 'We offer comprehensive listing services. An agent will provide a free market analysis and guide you through the listing process.' },
    ],
    greetingMessage: 'Welcome! Whether you\'re buying, selling, or renting, I\'m here to help. What are you looking for today?',
  },
  restaurant: {
    industry: 'restaurant',
    displayName: 'Restaurant',
    tone: 'warm, welcoming, and appetizing',
    complianceRules: [
      'Always mention allergen information availability',
      'Do not guarantee ingredient freshness claims beyond standard',
      'Include dietary accommodation notes',
    ],
    faqs: [
      { q: 'Can I make a reservation?', a: 'Absolutely! I can help you reserve a table. How many guests and what date/time works for you?' },
      { q: 'Do you have a menu I can see?', a: 'Yes! You can view our full menu on our website. Would you like me to share the link or help you with dietary preferences?' },
      { q: 'Do you accommodate dietary restrictions?', a: 'We offer vegetarian, vegan, gluten-free, and allergen-friendly options. Please let your server know about any allergies.' },
      { q: 'Do you offer takeout or delivery?', a: 'Yes, we offer both takeout and delivery! You can order through our website or popular delivery platforms.' },
    ],
    greetingMessage: 'Welcome! We\'re glad you\'re here. Would you like to make a reservation, see our menu, or place an order?',
  },
  ecommerce: {
    industry: 'ecommerce',
    displayName: 'E-Commerce',
    tone: 'helpful, upbeat, and solution-oriented',
    complianceRules: [
      'Accurate pricing and availability information',
      'Clear return and refund policy communication',
      'Consumer protection compliance',
    ],
    faqs: [
      { q: 'Where is my order?', a: 'I can help you track your order! Please provide your order number or the email address used for the purchase.' },
      { q: 'What is your return policy?', a: 'We offer a 30-day return policy for most items in original condition. Would you like to start a return?' },
      { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days. Express shipping (2-3 days) and next-day options are also available.' },
      { q: 'Do you offer discounts?', a: 'We regularly offer promotions! Sign up for our newsletter to get 10% off your first order and stay updated on sales.' },
    ],
    greetingMessage: 'Hi there! How can I help with your shopping today? I can assist with orders, returns, or finding the perfect product.',
  },
  saas: {
    industry: 'saas',
    displayName: 'SaaS / Software',
    tone: 'knowledgeable, efficient, and tech-savvy',
    complianceRules: [
      'Accurate feature and pricing information',
      'Clear data privacy and security commitments',
      'No unauthorized access promises',
    ],
    faqs: [
      { q: 'How do I get started?', a: 'You can sign up for a free trial on our website — no credit card required! I can walk you through the setup process.' },
      { q: 'What pricing plans do you offer?', a: 'We offer Starter, Professional, and Enterprise plans. I can help you find the right plan based on your team size and needs.' },
      { q: 'I need help with a technical issue', a: 'I\'m happy to help troubleshoot! Can you describe the issue you\'re experiencing? For complex issues, I can also connect you with our support team.' },
      { q: 'Can I integrate with other tools?', a: 'Yes! We offer integrations with 100+ popular tools including Slack, Jira, GitHub, and more. Check our integrations page for the full list.' },
    ],
    greetingMessage: 'Welcome! I\'m here to help with anything — from getting started to troubleshooting. What can I do for you?',
  },
  fitness: {
    industry: 'fitness',
    displayName: 'Fitness & Wellness',
    tone: 'motivating, energetic, and supportive',
    complianceRules: [
      'Do not provide medical or nutritional advice',
      'Recommend consulting healthcare provider before starting programs',
      'No guaranteed results claims',
    ],
    faqs: [
      { q: 'What memberships do you offer?', a: 'We offer monthly, quarterly, and annual memberships with various tiers. Would you like a breakdown of what\'s included?' },
      { q: 'What classes are available?', a: 'We offer yoga, HIIT, spin, strength training, pilates, and more! Check our schedule for times and availability.' },
      { q: 'Do you offer personal training?', a: 'Yes! Our certified personal trainers create customized programs. Book a free consultation to get started.' },
      { q: 'Can I try before I join?', a: 'Absolutely! We offer a free day pass so you can experience our facility and classes before committing.' },
    ],
    greetingMessage: 'Hey! Ready to crush your fitness goals? Whether you want to join, book a class, or learn more — I\'m here to help!',
  },
  education: {
    industry: 'education',
    displayName: 'Education',
    tone: 'supportive, clear, and encouraging',
    complianceRules: [
      'FERPA compliance for student data',
      'Accurate program and accreditation information',
      'Clear financial aid and tuition details',
    ],
    faqs: [
      { q: 'What programs do you offer?', a: 'We offer a wide range of programs across multiple disciplines. I can help you find the right fit based on your interests and goals!' },
      { q: 'How do I apply?', a: 'You can start your application online through our admissions portal. I can guide you through the requirements and deadlines.' },
      { q: 'Do you offer financial aid?', a: 'Yes! We offer scholarships, grants, and financial aid packages. Our financial aid office can help you explore your options.' },
      { q: 'Are classes available online?', a: 'We offer both in-person and online classes for many programs. I can help you find flexible options that fit your schedule.' },
    ],
    greetingMessage: 'Welcome! I\'m here to help with your educational journey. Looking to learn about programs, admissions, or something else?',
  },
};

export class ChatbotBuilderService {
  /** @type {Object} */
  #engine;
  /** @type {Map<string, Object>} */
  #chatbots = new Map();

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#loadChatbots();
    console.log(`[DevBot][ChatbotBuilder] Service initialized — ${Object.keys(TEMPLATES).length} templates, ${this.#chatbots.size} existing chatbots`);
  }

  /**
   * Create a new chatbot application.
   * @param {Object} config - Chatbot configuration
   * @param {string} config.name - Chatbot name
   * @param {string} config.industry - Industry template to use
   * @param {string} [config.tone] - Override tone
   * @param {string} [config.primaryColor='#2563eb'] - Brand primary color
   * @param {string} [config.logoUrl] - Logo URL
   * @param {string} [config.greetingMessage] - Override greeting
   * @param {Object[]} [config.faqs] - Additional FAQs
   * @param {string} [config.escalationEmail] - Email for escalations
   * @returns {Object} Created chatbot configuration
   */
  createChatbot(config) {
    if (!config || !config.name) throw new Error('Chatbot name is required');
    if (!config.industry) throw new Error('Industry template is required');

    const template = TEMPLATES[config.industry];
    if (!template) {
      throw new Error(`Unknown industry: ${config.industry}. Available: ${Object.keys(TEMPLATES).join(', ')}`);
    }

    const id = `chatbot-${crypto.randomUUID()}`;
    const chatbot = {
      id,
      name: config.name,
      industry: config.industry,
      industryDisplayName: template.displayName,
      tone: config.tone || template.tone,
      primaryColor: config.primaryColor || '#2563eb',
      logoUrl: config.logoUrl || null,
      greetingMessage: config.greetingMessage || template.greetingMessage,
      faqs: [...template.faqs, ...(config.faqs || [])],
      complianceRules: template.complianceRules,
      escalationEmail: config.escalationEmail || null,
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revenue: { plan: 'standard', pricePerMonth: 79, stream: '#46' },
    };

    this.#chatbots.set(id, chatbot);
    this.#saveChatbot(chatbot);
    console.log(`[DevBot][ChatbotBuilder] Created chatbot: ${chatbot.name} (${id})`);
    return chatbot;
  }

  /**
   * Generate the Next.js/React frontend for a chatbot.
   * @param {Object} config - Chatbot config (or chatbot ID)
   * @returns {Promise<Object>} Generated UI code
   */
  async generateChatbotUI(config) {
    const chatbot = typeof config === 'string' ? this.#chatbots.get(config) : config;
    if (!chatbot) throw new Error('Chatbot configuration is required');

    const prompt = `Generate a complete Next.js/React chatbot widget UI with these specifications:
- Name: ${chatbot.name}
- Industry: ${chatbot.industry}
- Primary Color: ${chatbot.primaryColor || '#2563eb'}
- Greeting: "${chatbot.greetingMessage}"
- Tone: ${chatbot.tone}

Include:
1. ChatWidget.tsx - Main chat widget component with message list, input, send button
2. ChatBubble.tsx - Individual message bubble component
3. ChatHeader.tsx - Header with logo, name, minimize/close buttons
4. styles/chat.module.css - Styled with the brand color
5. hooks/useChat.ts - Custom hook for chat state management
6. types/chat.ts - TypeScript interfaces

Use Tailwind CSS and modern React patterns (hooks, functional components).`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const result = await this.#engine.generate(prompt);
        return { chatbotId: chatbot.id, type: 'ui', generatedAt: new Date().toISOString(), output: result };
      } catch (err) {
        console.error('[DevBot][ChatbotBuilder] UI generation failed:', err.message);
      }
    }

    return {
      chatbotId: chatbot.id || 'unknown',
      type: 'ui',
      generatedAt: new Date().toISOString(),
      note: 'AI engine unavailable — returning component structure',
      output: {
        files: [
          'components/ChatWidget.tsx',
          'components/ChatBubble.tsx',
          'components/ChatHeader.tsx',
          'styles/chat.module.css',
          'hooks/useChat.ts',
          'types/chat.ts',
        ],
        framework: 'Next.js + React + Tailwind CSS',
      },
    };
  }

  /**
   * Generate the backend API with conversation handling.
   * @param {Object} config - Chatbot config (or chatbot ID)
   * @returns {Promise<Object>} Generated API code
   */
  async generateChatbotAPI(config) {
    const chatbot = typeof config === 'string' ? this.#chatbots.get(config) : config;
    if (!chatbot) throw new Error('Chatbot configuration is required');

    const prompt = `Generate a complete Express.js backend API for a chatbot with these specifications:
- Name: ${chatbot.name}
- Industry: ${chatbot.industry}
- FAQs: ${JSON.stringify(chatbot.faqs?.slice(0, 5))}
- Escalation Email: ${chatbot.escalationEmail || 'none'}
- Compliance Rules: ${JSON.stringify(chatbot.complianceRules)}

Include:
1. server.js - Express server with CORS, rate limiting
2. routes/chat.js - POST /chat endpoint with conversation context
3. routes/health.js - Health check endpoint
4. services/conversation.js - Conversation manager with context window
5. services/faq-matcher.js - FAQ matching with fuzzy search
6. services/escalation.js - Escalation handler (email notification)
7. middleware/rateLimit.js - Rate limiter per session
8. package.json with dependencies`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const result = await this.#engine.generate(prompt);
        return { chatbotId: chatbot.id, type: 'api', generatedAt: new Date().toISOString(), output: result };
      } catch (err) {
        console.error('[DevBot][ChatbotBuilder] API generation failed:', err.message);
      }
    }

    return {
      chatbotId: chatbot.id || 'unknown',
      type: 'api',
      generatedAt: new Date().toISOString(),
      note: 'AI engine unavailable — returning API structure',
      output: {
        files: [
          'server.js',
          'routes/chat.js',
          'routes/health.js',
          'services/conversation.js',
          'services/faq-matcher.js',
          'services/escalation.js',
          'middleware/rateLimit.js',
          'package.json',
        ],
        framework: 'Express.js + Node.js',
      },
    };
  }

  /**
   * Generate deployment configuration for Vercel/Netlify.
   * @param {Object|string} config - Chatbot config or chatbot ID
   * @returns {Object} Deployment configurations
   */
  deploymentConfig(config) {
    const chatbot = typeof config === 'string' ? this.#chatbots.get(config) : config;
    if (!chatbot) throw new Error('Chatbot configuration is required');

    return {
      chatbotId: chatbot.id || 'unknown',
      vercel: {
        'vercel.json': {
          version: 2,
          name: chatbot.name?.toLowerCase().replace(/\s+/g, '-') || 'chatbot',
          builds: [
            { src: 'package.json', use: '@vercel/next' },
          ],
          routes: [
            { src: '/api/(.*)', dest: '/api/$1' },
            { src: '/(.*)', dest: '/$1' },
          ],
          env: {
            CHATBOT_NAME: chatbot.name,
            CHATBOT_INDUSTRY: chatbot.industry,
            ESCALATION_EMAIL: chatbot.escalationEmail || '',
          },
        },
      },
      netlify: {
        'netlify.toml': {
          build: {
            command: 'npm run build',
            publish: '.next',
          },
          plugins: [{ package: '@netlify/plugin-nextjs' }],
          redirects: [{ from: '/api/*', to: '/.netlify/functions/:splat', status: 200 }],
        },
      },
      docker: {
        Dockerfile: [
          'FROM node:20-alpine',
          'WORKDIR /app',
          'COPY package*.json ./',
          'RUN npm ci --production',
          'COPY . .',
          'RUN npm run build',
          'EXPOSE 3000',
          'CMD ["npm", "start"]',
        ].join('\n'),
      },
    };
  }

  /**
   * Simulate a conversation with a generated chatbot.
   * @param {string} chatbotId - Chatbot ID
   * @param {string[]} messages - User messages to simulate
   * @returns {Promise<Object[]>} Simulated conversation turns
   */
  async testConversation(chatbotId, messages) {
    const chatbot = this.#chatbots.get(chatbotId);
    if (!chatbot) throw new Error(`Chatbot not found: ${chatbotId}`);
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    const conversation = [];
    conversation.push({ role: 'assistant', content: chatbot.greetingMessage, timestamp: new Date().toISOString() });

    for (const msg of messages) {
      conversation.push({ role: 'user', content: msg, timestamp: new Date().toISOString() });

      // Try FAQ match first
      const faqMatch = chatbot.faqs?.find(f =>
        msg.toLowerCase().includes(f.q.toLowerCase().split(' ').slice(0, 3).join(' ').toLowerCase())
      );

      if (faqMatch) {
        conversation.push({ role: 'assistant', content: faqMatch.a, timestamp: new Date().toISOString(), source: 'faq' });
        continue;
      }

      // Use AI engine if available
      if (this.#engine && typeof this.#engine.generate === 'function') {
        try {
          const context = `You are a ${chatbot.tone} chatbot for the ${chatbot.industry} industry named "${chatbot.name}".
Compliance rules: ${chatbot.complianceRules?.join('; ')}
Respond to: "${msg}"`;
          const response = await this.#engine.generate(context);
          conversation.push({ role: 'assistant', content: response, timestamp: new Date().toISOString(), source: 'ai' });
          continue;
        } catch (err) {
          console.error('[DevBot][ChatbotBuilder] AI response failed:', err.message);
        }
      }

      conversation.push({
        role: 'assistant',
        content: `Thank you for your message. Let me look into that for you. Is there anything specific about our ${chatbot.industryDisplayName} services I can help with?`,
        timestamp: new Date().toISOString(),
        source: 'fallback',
      });
    }

    return conversation;
  }

  /**
   * Get a chatbot configuration by ID.
   * @param {string} id - Chatbot ID
   * @returns {Object|null}
   */
  getChatbot(id) {
    return this.#chatbots.get(id) || null;
  }

  /**
   * List all industry templates.
   * @returns {Object[]} Available templates with metadata
   */
  listTemplates() {
    return Object.entries(TEMPLATES).map(([key, template]) => ({
      id: key,
      displayName: template.displayName,
      tone: template.tone,
      faqCount: template.faqs.length,
      complianceRules: template.complianceRules.length,
      greetingMessage: template.greetingMessage,
    }));
  }

  /**
   * List all created chatbots.
   * @returns {Object[]}
   */
  listChatbots() {
    return Array.from(this.#chatbots.values());
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'chatbot-builder',
      name: 'Chatbot Generator',
      repo_url: 'https://github.com/MainakVerse/receptionist-chatbot-generator-consultancy',
      type: 'app',
      status: 'active',
      capabilities: [
        'create_chatbot', 'generate_ui', 'generate_api',
        'deployment_config', 'test_conversation', 'industry_templates',
      ],
      config: {
        revenue: '$79/mo per chatbot',
        revenueStream: '#46',
        templates: Object.keys(TEMPLATES),
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  #loadChatbots() {
    try {
      const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter(f => f.endsWith('.json')) : [];
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8'));
          if (data.id) this.#chatbots.set(data.id, data);
        } catch (err) {
          console.error(`[DevBot][ChatbotBuilder] Failed to load ${file}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[DevBot][ChatbotBuilder] Failed to load chatbots:', err.message);
    }
  }

  #saveChatbot(chatbot) {
    try {
      const filePath = resolve(DATA_DIR, `${chatbot.id}.json`);
      writeFileSync(filePath, JSON.stringify(chatbot, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DevBot][ChatbotBuilder] Failed to save chatbot:', err.message);
    }
  }
}

export default ChatbotBuilderService;
