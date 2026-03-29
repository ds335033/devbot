/**
 * DevBot AI — SharePoint Dev Docs Integration
 *
 * Indexes the SharePoint/sp-dev-docs repository structure,
 * provides documentation search, and generates SPFx apps/web parts
 * using DevBot's AI engine.
 *
 * Repo: https://github.com/SharePoint/sp-dev-docs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, '../../data/integrations/sharepoint');
const CACHE_PATH = resolve(CACHE_DIR, 'cache.json');
mkdirSync(CACHE_DIR, { recursive: true });

// ─── SharePoint Topic Index ────────────────────────────────────────────────
const TOPICS = [
  { id: 'webparts', name: 'Web Parts', path: 'docs/spfx/web-parts', description: 'Build custom web parts with SPFx' },
  { id: 'extensions', name: 'Extensions', path: 'docs/spfx/extensions', description: 'Application customizers, field customizers, command sets' },
  { id: 'library', name: 'Library Component', path: 'docs/spfx/library-component', description: 'Shared library components across SPFx solutions' },
  { id: 'provisioning', name: 'Provisioning', path: 'docs/solution-guidance/provisioning', description: 'Site and content provisioning patterns' },
  { id: 'webhooks', name: 'Webhooks', path: 'docs/apis/webhooks', description: 'SharePoint webhooks for event-driven scenarios' },
  { id: 'search', name: 'Search', path: 'docs/general-development/search', description: 'SharePoint Search configuration and customization' },
  { id: 'graph', name: 'Microsoft Graph', path: 'docs/apis/graph', description: 'Microsoft Graph integration with SharePoint' },
  { id: 'lists', name: 'Lists & Libraries', path: 'docs/general-development/lists', description: 'Working with SharePoint lists and document libraries' },
  { id: 'permissions', name: 'Permissions', path: 'docs/general-development/permissions', description: 'SharePoint permission management and security' },
  { id: 'branding', name: 'Branding & Theming', path: 'docs/solution-guidance/branding', description: 'Custom themes, site designs, and branding' },
  { id: 'migration', name: 'Migration', path: 'docs/solution-guidance/migration', description: 'Content migration strategies and tools' },
  { id: 'pnp', name: 'PnP Libraries', path: 'docs/spfx/pnp', description: 'PnP JS and PnP PowerShell integration' },
  { id: 'adaptive-cards', name: 'Adaptive Cards', path: 'docs/spfx/adaptive-cards', description: 'Adaptive Card Extensions (ACEs) for Viva Connections' },
  { id: 'teams', name: 'Teams Integration', path: 'docs/spfx/teams', description: 'SPFx web parts in Microsoft Teams' },
  { id: 'api-connect', name: 'API Connect', path: 'docs/spfx/api-connect', description: 'Connecting SPFx to external APIs' },
];

export class SharePointDocsService {
  /** @type {Object} */
  #engine;
  /** @type {Object} */
  #cache;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#cache = this.#loadCache();
    console.log('[DevBot][SharePoint] Service initialized — indexed', TOPICS.length, 'topics');
  }

  /**
   * Search SharePoint documentation by keyword.
   * @param {string} query - Search keyword
   * @returns {Object[]} Matching topics and content snippets
   */
  searchDocs(query) {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }

    const q = query.toLowerCase();
    const results = TOPICS.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    ).map(t => ({
      topic: t.id,
      name: t.name,
      description: t.description,
      path: t.path,
      repo_url: `https://github.com/SharePoint/sp-dev-docs/tree/main/${t.path}`,
      relevance: t.name.toLowerCase().includes(q) ? 1.0 : 0.7,
    }));

    // Also search cached content
    if (this.#cache.searchIndex) {
      for (const [key, entry] of Object.entries(this.#cache.searchIndex)) {
        if (key.toLowerCase().includes(q) || (entry.content && entry.content.toLowerCase().includes(q))) {
          results.push({
            topic: entry.topic || key,
            name: entry.title || key,
            description: entry.snippet || '',
            path: entry.path || '',
            repo_url: entry.url || '',
            relevance: 0.5,
          });
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Retrieve a specific topic guide.
   * @param {string} topic - Topic ID (webparts, extensions, library, provisioning, etc.)
   * @returns {Object|null} Topic guide details
   */
  getGuide(topic) {
    if (!topic) throw new Error('Topic ID is required');

    const found = TOPICS.find(t => t.id === topic.toLowerCase());
    if (!found) return null;

    return {
      ...found,
      repo_url: `https://github.com/SharePoint/sp-dev-docs/tree/main/${found.path}`,
      quickStart: this.#getQuickStart(found.id),
      relatedTopics: TOPICS.filter(t => t.id !== found.id).slice(0, 3).map(t => t.id),
    };
  }

  /**
   * Generate a SharePoint Framework (SPFx) app using AI.
   * @param {string} description - App description
   * @returns {Promise<Object>} Generated app structure
   */
  async generateSPFxApp(description) {
    if (!description) throw new Error('App description is required');

    const prompt = `Generate a complete SharePoint Framework (SPFx) application based on this description:

"${description}"

Provide the following:
1. Project structure (files and folders)
2. package.json with SPFx dependencies (@microsoft/sp-core-library, @microsoft/sp-webpart-base, etc.)
3. Main web part TypeScript file with React component
4. Property pane configuration
5. Manifest JSON
6. gulpfile.js for SPFx build pipeline
7. README with setup instructions

Use SPFx 1.18+ conventions with React and TypeScript.`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const result = await this.#engine.generate(prompt);
        const generated = {
          description,
          generatedAt: new Date().toISOString(),
          output: result,
          type: 'spfx-app',
        };
        this.#cacheResult(`spfx-app-${Date.now()}`, generated);
        return generated;
      } catch (err) {
        console.error('[DevBot][SharePoint] AI generation failed:', err.message);
        return this.#fallbackSPFxApp(description);
      }
    }

    return this.#fallbackSPFxApp(description);
  }

  /**
   * Generate a custom web part with React/TypeScript.
   * @param {Object} config - Web part configuration
   * @param {string} config.name - Web part name
   * @param {string} [config.description] - Web part description
   * @param {string[]} [config.properties] - Custom properties
   * @param {boolean} [config.useGraphApi] - Whether to use Microsoft Graph
   * @returns {Promise<Object>} Generated web part code
   */
  async generateWebPart(config) {
    if (!config || !config.name) throw new Error('Web part config with name is required');

    const prompt = `Generate a SharePoint SPFx Web Part with these specifications:
- Name: ${config.name}
- Description: ${config.description || 'Custom web part'}
- Custom Properties: ${(config.properties || []).join(', ') || 'none'}
- Uses Microsoft Graph API: ${config.useGraphApi ? 'Yes' : 'No'}

Provide complete TypeScript/React code including:
1. Web part class extending BaseClientSideWebPart
2. React component with props interface
3. Property pane configuration
4. CSS module
5. Manifest JSON snippet`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const result = await this.#engine.generate(prompt);
        const generated = {
          config,
          generatedAt: new Date().toISOString(),
          output: result,
          type: 'webpart',
        };
        this.#cacheResult(`webpart-${config.name}-${Date.now()}`, generated);
        return generated;
      } catch (err) {
        console.error('[DevBot][SharePoint] Web part generation failed:', err.message);
        return this.#fallbackWebPart(config);
      }
    }

    return this.#fallbackWebPart(config);
  }

  /**
   * List all available SharePoint dev topics.
   * @returns {Object[]} All topics with metadata
   */
  listTopics() {
    return TOPICS.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      repo_url: `https://github.com/SharePoint/sp-dev-docs/tree/main/${t.path}`,
    }));
  }

  /**
   * Get workflow step handler for "sharepoint_generate" type.
   * @returns {Function} Step handler for the workflow engine
   */
  getWorkflowStepHandler() {
    return async (step, context) => {
      const { action, ...params } = step.config || {};
      switch (action) {
        case 'generate_app':
          return this.generateSPFxApp(params.description || context.description);
        case 'generate_webpart':
          return this.generateWebPart(params);
        case 'search':
          return this.searchDocs(params.query || context.query);
        case 'get_guide':
          return this.getGuide(params.topic || context.topic);
        default:
          throw new Error(`Unknown SharePoint action: ${action}`);
      }
    };
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'sharepoint',
      name: 'SharePoint Dev Docs',
      repo_url: 'https://github.com/SharePoint/sp-dev-docs',
      type: 'docs',
      status: 'active',
      capabilities: [
        'search_docs', 'get_guide', 'generate_spfx_app',
        'generate_webpart', 'list_topics', 'workflow_step',
      ],
      config: { topicCount: TOPICS.length },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  #getQuickStart(topicId) {
    const quickStarts = {
      webparts: 'Run `yo @microsoft/sharepoint` and select "WebPart" to scaffold a new web part project.',
      extensions: 'Run `yo @microsoft/sharepoint` and select "Extension" for application customizer, field customizer, or command set.',
      library: 'Use `yo @microsoft/sharepoint --component-type library` to create a shared library component.',
      provisioning: 'Use PnP Provisioning Engine with XML or JSON templates for site provisioning.',
      webhooks: 'Register webhooks via the SharePoint REST API at `/_api/web/lists/getByTitle/subscriptions`.',
      search: 'Use the SharePoint Search REST API at `/_api/search/query?querytext=` for search queries.',
      graph: 'Authenticate with MSAL and call Microsoft Graph endpoints for SharePoint resources.',
      lists: 'Use the PnPjs library: `import { spfi } from "@pnp/sp"` for list operations.',
      permissions: 'Manage permissions via REST API at `/_api/web/roleassignments` or PnPjs.',
      branding: 'Apply custom themes using `_api/thememanager/ApplyTheme` or site designs.',
      migration: 'Use the SharePoint Migration Tool (SPMT) or Migration API for content migration.',
      pnp: 'Install PnPjs: `npm install @pnp/sp @pnp/graph` for simplified SharePoint/Graph access.',
      'adaptive-cards': 'Create ACEs extending BaseAdaptiveCardExtension for Viva Connections dashboards.',
      teams: 'Set `supportedHosts` to include `TeamsTab` in your web part manifest for Teams integration.',
      'api-connect': 'Use AadHttpClient or HttpClient from `@microsoft/sp-http` to connect to external APIs.',
    };
    return quickStarts[topicId] || 'Check the sp-dev-docs repository for getting started guides.';
  }

  #fallbackSPFxApp(description) {
    return {
      description,
      generatedAt: new Date().toISOString(),
      type: 'spfx-app',
      note: 'AI engine unavailable — returning template scaffold',
      output: {
        structure: [
          'src/webparts/myWebPart/MyWebPart.ts',
          'src/webparts/myWebPart/components/MyComponent.tsx',
          'src/webparts/myWebPart/components/IMyComponentProps.ts',
          'src/webparts/myWebPart/MyWebPart.manifest.json',
          'src/webparts/myWebPart/loc/en-us.js',
          'src/webparts/myWebPart/loc/mystrings.d.ts',
          'config/config.json',
          'config/deploy-azure-storage.json',
          'config/package-solution.json',
          'config/serve.json',
          'gulpfile.js',
          'package.json',
          'tsconfig.json',
        ],
        instructions: 'Run `yo @microsoft/sharepoint` to scaffold, then customize based on description.',
      },
    };
  }

  #fallbackWebPart(config) {
    return {
      config,
      generatedAt: new Date().toISOString(),
      type: 'webpart',
      note: 'AI engine unavailable — returning template',
      output: {
        className: `${config.name.replace(/\s+/g, '')}WebPart`,
        reactComponent: `${config.name.replace(/\s+/g, '')}Component`,
        manifest: { alias: config.name, componentType: 'WebPart' },
      },
    };
  }

  #loadCache() {
    try {
      if (existsSync(CACHE_PATH)) {
        return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      }
    } catch (err) {
      console.error('[DevBot][SharePoint] Failed to load cache:', err.message);
    }
    return { searchIndex: {}, results: {} };
  }

  #cacheResult(key, value) {
    try {
      this.#cache.results[key] = value;
      writeFileSync(CACHE_PATH, JSON.stringify(this.#cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DevBot][SharePoint] Failed to write cache:', err.message);
    }
  }
}

export default SharePointDocsService;
