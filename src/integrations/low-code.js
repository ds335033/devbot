/**
 * DevBot AI — Low-Code App Builder (Appsmith + ToolJet)
 *
 * Visual low-code application builder with drag-and-drop widgets,
 * data source connections, AI-powered app generation, and deployment.
 * Build dashboards, admin panels, forms, CRUD apps, reports, and workflow UIs.
 *
 * Revenue: Free (1 app, 3 widgets), Builder $49/mo (10 apps),
 *          Pro $149/mo (unlimited + AI generation + custom domains)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/lowcode');
mkdirSync(DATA_DIR, { recursive: true });

const LOG = '[DevBot LowCode]';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_TYPES = ['dashboard', 'admin-panel', 'form', 'crud', 'report', 'workflow-ui'];

const WIDGET_TYPES = [
  'table', 'chart', 'form', 'text', 'image', 'button', 'input', 'select',
  'date-picker', 'file-upload', 'map', 'calendar', 'kanban', 'timeline',
  'metric-card', 'progress-bar',
];

const DATA_SOURCE_TYPES = [
  'rest-api', 'graphql', 'postgresql', 'mysql', 'mongodb',
  'stripe-api', 'shopify-api', 'google-sheets', 'airtable',
];

const PLANS = {
  free:    { maxApps: 1, maxWidgetsPerApp: 3, aiGeneration: false, customDomains: false, price: 0 },
  builder: { maxApps: 10, maxWidgetsPerApp: Infinity, aiGeneration: false, customDomains: false, price: 49 },
  pro:     { maxApps: Infinity, maxWidgetsPerApp: Infinity, aiGeneration: true, customDomains: true, price: 149 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadData(filename) {
  const p = resolve(DATA_DIR, filename);
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return {}; }
}

function saveData(filename, data) {
  writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class LowCodeService {
  #apps;
  #dataSources;
  #analytics;

  constructor() {
    this.#apps = loadData('apps.json');
    this.#dataSources = loadData('datasources.json');
    this.#analytics = loadData('analytics.json');
    console.log(`${LOG} Service initialized — ${Object.keys(this.#apps).length} apps loaded`);
  }

  /**
   * Create a new low-code application.
   * @param {Object} config
   * @param {string} config.name - App name
   * @param {string} config.type - App type
   * @param {string} config.userId - Owner user ID
   * @param {string} [config.description] - App description
   * @param {string} [config.dataSourceId] - Connected data source ID
   * @param {string} [config.plan='free'] - User plan
   * @returns {{ success: boolean, app?: Object, error?: string }}
   */
  createApp(config) {
    if (!config || !config.name || !config.type || !config.userId) {
      return { success: false, error: 'name, type, and userId are required' };
    }
    if (!APP_TYPES.includes(config.type)) {
      return { success: false, error: `Invalid app type. Valid: ${APP_TYPES.join(', ')}` };
    }

    const planName = config.plan || 'free';
    const plan = PLANS[planName];
    if (!plan) return { success: false, error: `Invalid plan. Valid: ${Object.keys(PLANS).join(', ')}` };

    const userApps = Object.values(this.#apps).filter(a => a.userId === config.userId);
    if (userApps.length >= plan.maxApps) {
      return { success: false, error: `App limit reached (${plan.maxApps}). Upgrade plan.` };
    }

    if (config.dataSourceId && !this.#dataSources[config.dataSourceId]) {
      return { success: false, error: 'Data source not found' };
    }

    const id = uuidv4();
    const app = {
      id,
      name: config.name,
      type: config.type,
      description: config.description || '',
      userId: config.userId,
      dataSourceId: config.dataSourceId || null,
      widgets: [],
      status: 'draft',
      plan: planName,
      deployedAt: null,
      deployUrl: null,
      customDomain: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.#apps[id] = app;
    this.#analytics[id] = { views: 0, interactions: 0, activeUsers: 0 };
    saveData('apps.json', this.#apps);
    saveData('analytics.json', this.#analytics);
    console.log(`${LOG} Created app "${config.name}" (${id}) — type: ${config.type}`);
    return { success: true, app };
  }

  /**
   * Add a widget to an app.
   * @param {string} appId - App ID
   * @param {Object} widget
   * @param {string} widget.type - Widget type
   * @param {Object} [widget.config={}] - Widget configuration
   * @param {Object} [widget.position] - { x, y, width, height }
   * @param {Object} [widget.dataBinding] - { sourceId, query, field }
   * @returns {{ success: boolean, widget?: Object, error?: string }}
   */
  addWidget(appId, widget) {
    if (!appId || !widget || !widget.type) {
      return { success: false, error: 'appId and widget.type are required' };
    }
    if (!WIDGET_TYPES.includes(widget.type)) {
      return { success: false, error: `Invalid widget type. Valid: ${WIDGET_TYPES.join(', ')}` };
    }
    const app = this.#apps[appId];
    if (!app) return { success: false, error: 'App not found' };

    const plan = PLANS[app.plan];
    if (app.widgets.length >= plan.maxWidgetsPerApp) {
      return { success: false, error: `Widget limit reached (${plan.maxWidgetsPerApp}). Upgrade plan.` };
    }

    const id = uuidv4();
    const newWidget = {
      id,
      type: widget.type,
      config: widget.config || {},
      position: widget.position || { x: 0, y: app.widgets.length * 200, width: 400, height: 200 },
      dataBinding: widget.dataBinding || null,
      createdAt: new Date().toISOString(),
    };

    app.widgets.push(newWidget);
    app.updatedAt = new Date().toISOString();
    saveData('apps.json', this.#apps);
    console.log(`${LOG} Added ${widget.type} widget to app ${appId}`);
    return { success: true, widget: newWidget };
  }

  /**
   * Connect a data source to an app.
   * @param {string} appId - App ID
   * @param {Object} config
   * @param {string} config.type - Data source type
   * @param {string} config.connectionString - Connection string or URL
   * @param {string} [config.name] - Data source name
   * @returns {{ success: boolean, dataSource?: Object, error?: string }}
   */
  connectDataSource(appId, config) {
    if (!appId || !config || !config.type || !config.connectionString) {
      return { success: false, error: 'appId, type, and connectionString are required' };
    }
    if (!DATA_SOURCE_TYPES.includes(config.type)) {
      return { success: false, error: `Invalid data source type. Valid: ${DATA_SOURCE_TYPES.join(', ')}` };
    }
    const app = this.#apps[appId];
    if (!app) return { success: false, error: 'App not found' };

    const id = uuidv4();
    const dataSource = {
      id,
      appId,
      type: config.type,
      name: config.name || `${config.type}-${id.slice(0, 8)}`,
      connectionString: config.connectionString,
      status: 'connected',
      lastTestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.#dataSources[id] = dataSource;
    app.dataSourceId = id;
    app.updatedAt = new Date().toISOString();
    saveData('datasources.json', this.#dataSources);
    saveData('apps.json', this.#apps);
    console.log(`${LOG} Connected ${config.type} data source to app ${appId}`);
    return { success: true, dataSource };
  }

  /**
   * Deploy (publish) an app.
   * @param {string} appId - App ID
   * @returns {{ success: boolean, app?: Object, error?: string }}
   */
  deployApp(appId) {
    if (!appId) return { success: false, error: 'appId is required' };
    const app = this.#apps[appId];
    if (!app) return { success: false, error: 'App not found' };
    if (app.widgets.length === 0) return { success: false, error: 'App must have at least one widget before deploying' };

    app.status = 'deployed';
    app.deployedAt = new Date().toISOString();
    app.deployUrl = `https://apps.devbot.ai/${app.id}`;
    app.updatedAt = new Date().toISOString();
    saveData('apps.json', this.#apps);
    console.log(`${LOG} Deployed app "${app.name}" (${appId}) at ${app.deployUrl}`);
    return { success: true, app };
  }

  /**
   * AI-generate a complete app layout from a description.
   * @param {Object} config
   * @param {string} config.description - Natural language app description
   * @param {string} [config.dataSource] - Data source type
   * @param {string} config.userId - Owner user ID
   * @param {string} [config.plan='pro'] - Must be pro plan
   * @returns {{ success: boolean, app?: Object, error?: string }}
   */
  generateApp(config) {
    if (!config || !config.description || !config.userId) {
      return { success: false, error: 'description and userId are required' };
    }
    const plan = PLANS[config.plan || 'free'];
    if (!plan.aiGeneration) {
      return { success: false, error: 'AI generation requires Pro plan ($149/mo)' };
    }

    // Determine best app type from description
    const descLower = config.description.toLowerCase();
    let appType = 'dashboard';
    if (descLower.includes('admin')) appType = 'admin-panel';
    else if (descLower.includes('form') || descLower.includes('survey')) appType = 'form';
    else if (descLower.includes('crud') || descLower.includes('manage')) appType = 'crud';
    else if (descLower.includes('report')) appType = 'report';
    else if (descLower.includes('workflow') || descLower.includes('pipeline')) appType = 'workflow-ui';

    // Create the app
    const appResult = this.createApp({
      name: `AI: ${config.description.slice(0, 40)}`,
      type: appType,
      userId: config.userId,
      description: config.description,
      plan: config.plan || 'pro',
    });
    if (!appResult.success) return appResult;

    // Auto-generate widgets based on app type
    const widgetSets = {
      'dashboard': [
        { type: 'metric-card', config: { title: 'Total Users', value: '{{users}}' } },
        { type: 'metric-card', config: { title: 'Revenue', value: '{{revenue}}' } },
        { type: 'chart', config: { chartType: 'line', title: 'Growth Over Time' } },
        { type: 'table', config: { title: 'Recent Activity' } },
      ],
      'admin-panel': [
        { type: 'table', config: { title: 'Records', editable: true } },
        { type: 'form', config: { title: 'Add/Edit Record' } },
        { type: 'button', config: { label: 'Save Changes', action: 'submit' } },
        { type: 'chart', config: { chartType: 'bar', title: 'Overview' } },
      ],
      'form': [
        { type: 'text', config: { content: 'Please fill out the form below' } },
        { type: 'input', config: { label: 'Name', placeholder: 'Enter name' } },
        { type: 'input', config: { label: 'Email', placeholder: 'Enter email' } },
        { type: 'select', config: { label: 'Category', options: ['Option A', 'Option B'] } },
        { type: 'date-picker', config: { label: 'Date' } },
        { type: 'file-upload', config: { label: 'Attachments' } },
        { type: 'button', config: { label: 'Submit', action: 'submit' } },
      ],
      'crud': [
        { type: 'table', config: { title: 'Records', editable: true, pagination: true } },
        { type: 'form', config: { title: 'Create / Edit' } },
        { type: 'button', config: { label: 'Create New', action: 'create' } },
        { type: 'button', config: { label: 'Delete Selected', action: 'delete' } },
      ],
      'report': [
        { type: 'metric-card', config: { title: 'Summary' } },
        { type: 'chart', config: { chartType: 'bar', title: 'Breakdown' } },
        { type: 'chart', config: { chartType: 'pie', title: 'Distribution' } },
        { type: 'table', config: { title: 'Detailed Data' } },
        { type: 'progress-bar', config: { title: 'Completion', value: 75 } },
      ],
      'workflow-ui': [
        { type: 'kanban', config: { columns: ['To Do', 'In Progress', 'Done'] } },
        { type: 'timeline', config: { title: 'Activity Timeline' } },
        { type: 'button', config: { label: 'Add Task', action: 'create' } },
        { type: 'calendar', config: { title: 'Schedule' } },
      ],
    };

    const widgets = widgetSets[appType] || widgetSets['dashboard'];
    for (const w of widgets) {
      this.addWidget(appResult.app.id, w);
    }

    // Connect data source if specified
    if (config.dataSource && DATA_SOURCE_TYPES.includes(config.dataSource)) {
      this.connectDataSource(appResult.app.id, {
        type: config.dataSource,
        connectionString: `placeholder://${config.dataSource}`,
        name: `${config.dataSource}-auto`,
      });
    }

    // Reload the app with widgets
    const finalApp = this.#apps[appResult.app.id];
    console.log(`${LOG} AI-generated "${appType}" app with ${finalApp.widgets.length} widgets`);
    return { success: true, app: finalApp };
  }

  /**
   * List all apps for a user.
   * @param {string} userId - User ID
   * @returns {{ success: boolean, apps?: Array, error?: string }}
   */
  listApps(userId) {
    if (!userId) return { success: false, error: 'userId is required' };
    const apps = Object.values(this.#apps).filter(a => a.userId === userId);
    console.log(`${LOG} Listed ${apps.length} apps for user ${userId}`);
    return { success: true, apps };
  }

  /**
   * Get analytics for an app.
   * @param {string} appId - App ID
   * @returns {{ success: boolean, analytics?: Object, error?: string }}
   */
  getAppAnalytics(appId) {
    if (!appId) return { success: false, error: 'appId is required' };
    const app = this.#apps[appId];
    if (!app) return { success: false, error: 'App not found' };

    const stats = this.#analytics[appId] || { views: 0, interactions: 0, activeUsers: 0 };
    const analytics = {
      appId,
      appName: app.name,
      status: app.status,
      widgets: app.widgets.length,
      deployUrl: app.deployUrl,
      ...stats,
    };

    console.log(`${LOG} Analytics for app ${appId}: ${stats.views} views, ${stats.interactions} interactions`);
    return { success: true, analytics };
  }
}

export default LowCodeService;
