/**
 * DevBot AI — Grafana + Superset + Chart.js + Chartbrew Analytics Platform
 *
 * Full analytics dashboard service with multiple widget types,
 * data source integrations, scheduled reports, and sharing.
 * Simulated analytics engine with persistent storage.
 *
 * Revenue: Free (2 dashboards), Pro $29/mo (unlimited + sharing), Enterprise $99/mo (+ scheduled reports + white-label)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/analytics');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Constants ────────────────────────────────────────────────────────────

const WIDGET_TYPES = [
  'line-chart', 'bar-chart', 'pie-chart', 'doughnut', 'radar', 'scatter',
  'area-chart', 'metric-card', 'table', 'heatmap', 'gauge', 'funnel',
];

const DATA_SOURCES = [
  'devbot-api', 'stripe', 'shopify', 'financial-data',
  'trading-bot', 'chatbot-analytics', 'workflow-metrics', 'custom-api',
];

const REPORT_FORMATS = ['pdf', 'csv', 'html', 'json'];

const PREBUILT_DASHBOARDS = {
  'revenue-overview': {
    name: 'Revenue Overview',
    description: 'Track revenue across all DevBot services',
    widgets: [
      { type: 'line-chart', title: 'Monthly Revenue', dataSource: 'stripe', query: 'revenue_monthly' },
      { type: 'metric-card', title: 'MRR', dataSource: 'stripe', query: 'mrr_current' },
      { type: 'bar-chart', title: 'Revenue by Service', dataSource: 'devbot-api', query: 'revenue_by_service' },
      { type: 'pie-chart', title: 'Revenue Distribution', dataSource: 'stripe', query: 'revenue_distribution' },
    ],
  },
  'trading-performance': {
    name: 'Trading Performance',
    description: 'Monitor trading bot performance and returns',
    widgets: [
      { type: 'line-chart', title: 'Portfolio Value', dataSource: 'trading-bot', query: 'portfolio_value' },
      { type: 'gauge', title: 'Win Rate', dataSource: 'trading-bot', query: 'win_rate' },
      { type: 'bar-chart', title: 'Daily P&L', dataSource: 'trading-bot', query: 'daily_pnl' },
      { type: 'table', title: 'Recent Trades', dataSource: 'trading-bot', query: 'recent_trades' },
    ],
  },
  'chatbot-usage': {
    name: 'Chatbot Usage',
    description: 'Track chatbot engagement and performance',
    widgets: [
      { type: 'line-chart', title: 'Messages Over Time', dataSource: 'chatbot-analytics', query: 'messages_over_time' },
      { type: 'metric-card', title: 'Active Users', dataSource: 'chatbot-analytics', query: 'active_users' },
      { type: 'pie-chart', title: 'Intent Distribution', dataSource: 'chatbot-analytics', query: 'intent_distribution' },
      { type: 'heatmap', title: 'Usage by Hour', dataSource: 'chatbot-analytics', query: 'usage_heatmap' },
    ],
  },
  'api-usage': {
    name: 'API Usage',
    description: 'Monitor DevBot API usage and performance',
    widgets: [
      { type: 'line-chart', title: 'Requests Over Time', dataSource: 'devbot-api', query: 'requests_over_time' },
      { type: 'metric-card', title: 'Avg Response Time', dataSource: 'devbot-api', query: 'avg_response_time' },
      { type: 'bar-chart', title: 'Requests by Endpoint', dataSource: 'devbot-api', query: 'requests_by_endpoint' },
      { type: 'gauge', title: 'Uptime', dataSource: 'devbot-api', query: 'uptime_percentage' },
    ],
  },
  'customer-growth': {
    name: 'Customer Growth',
    description: 'Track user acquisition and retention',
    widgets: [
      { type: 'area-chart', title: 'User Growth', dataSource: 'devbot-api', query: 'user_growth' },
      { type: 'funnel', title: 'Conversion Funnel', dataSource: 'devbot-api', query: 'conversion_funnel' },
      { type: 'metric-card', title: 'Churn Rate', dataSource: 'stripe', query: 'churn_rate' },
      { type: 'bar-chart', title: 'Signups by Source', dataSource: 'devbot-api', query: 'signups_by_source' },
    ],
  },
  'workflow-efficiency': {
    name: 'Workflow Efficiency',
    description: 'Track automation and workflow performance',
    widgets: [
      { type: 'metric-card', title: 'Active Workflows', dataSource: 'workflow-metrics', query: 'active_workflows' },
      { type: 'line-chart', title: 'Executions Over Time', dataSource: 'workflow-metrics', query: 'executions_over_time' },
      { type: 'gauge', title: 'Success Rate', dataSource: 'workflow-metrics', query: 'success_rate' },
      { type: 'table', title: 'Recent Failures', dataSource: 'workflow-metrics', query: 'recent_failures' },
    ],
  },
};

const PLANS = {
  free:       { name: 'Free',       price: 0,  maxDashboards: 2,        sharing: false, scheduledReports: false, whiteLabel: false },
  pro:        { name: 'Pro',        price: 29, maxDashboards: Infinity,  sharing: true,  scheduledReports: false, whiteLabel: false },
  enterprise: { name: 'Enterprise', price: 99, maxDashboards: Infinity,  sharing: true,  scheduledReports: true,  whiteLabel: true },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadJson(filename) {
  const filepath = resolve(DATA_DIR, filename);
  if (!existsSync(filepath)) return null;
  try { return JSON.parse(readFileSync(filepath, 'utf-8')); } catch { return null; }
}

function saveJson(filename, data) {
  writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function generateMetricValue(source, metric) {
  const seed = (source + metric).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Math.round((Math.sin(seed) * 0.5 + 0.5) * 10000) / 100;
}

// ─── Service ──────────────────────────────────────────────────────────────

export class AnalyticsService {
  #dashboards = new Map();
  #reports = new Map();
  #engine;

  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#loadAll();
    console.log(`[DevBot Analytics] Service initialized — ${this.#dashboards.size} dashboards, ${this.#reports.size} reports loaded`);
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  #loadAll() {
    const dashboardsData = loadJson('dashboards.json');
    if (dashboardsData && Array.isArray(dashboardsData)) {
      for (const d of dashboardsData) this.#dashboards.set(d.id, d);
    }
    const reportsData = loadJson('reports.json');
    if (reportsData && Array.isArray(reportsData)) {
      for (const r of reportsData) this.#reports.set(r.id, r);
    }
  }

  #saveDashboards() {
    saveJson('dashboards.json', [...this.#dashboards.values()]);
  }

  #saveReports() {
    saveJson('reports.json', [...this.#reports.values()]);
  }

  // ─── Dashboard Methods ──────────────────────────────────────────────────

  /**
   * Create a new analytics dashboard.
   * @param {Object} config
   * @param {string} config.name - Dashboard name
   * @param {string} [config.description] - Dashboard description
   * @param {Array} [config.widgets] - Initial widgets
   * @param {number} [config.refreshInterval] - Auto-refresh in seconds
   * @param {string} [config.userId] - Owner user ID
   * @returns {Object} Created dashboard
   */
  createDashboard(config) {
    if (!config || !config.name) {
      return { success: false, error: 'Dashboard name is required' };
    }

    const id = uuidv4();
    const dashboard = {
      id,
      name: config.name.trim(),
      description: config.description || '',
      widgets: Array.isArray(config.widgets) ? config.widgets.map(w => ({
        id: uuidv4(),
        type: WIDGET_TYPES.includes(w.type) ? w.type : 'metric-card',
        title: w.title || 'Untitled Widget',
        dataSource: DATA_SOURCES.includes(w.dataSource) ? w.dataSource : 'devbot-api',
        query: w.query || '',
        config: w.config || {},
      })) : [],
      refreshInterval: config.refreshInterval || 60,
      userId: config.userId || 'default',
      shared: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.#dashboards.set(id, dashboard);
    this.#saveDashboards();
    console.log(`[DevBot Analytics] Dashboard created: ${dashboard.name} (${id})`);
    return { success: true, dashboard };
  }

  /**
   * Add a widget to an existing dashboard.
   * @param {string} dashboardId
   * @param {Object} widget
   * @param {string} widget.type - Widget type
   * @param {string} widget.title - Widget title
   * @param {string} widget.dataSource - Data source key
   * @param {string} [widget.query] - Data query
   * @param {Object} [widget.config] - Widget-specific config
   * @returns {Object} Added widget
   */
  addWidget(dashboardId, widget) {
    if (!dashboardId) return { success: false, error: 'Dashboard ID is required' };
    if (!widget || !widget.type) return { success: false, error: 'Widget type is required' };
    if (!WIDGET_TYPES.includes(widget.type)) {
      return { success: false, error: `Invalid widget type. Supported: ${WIDGET_TYPES.join(', ')}` };
    }

    const dashboard = this.#dashboards.get(dashboardId);
    if (!dashboard) return { success: false, error: 'Dashboard not found' };

    const newWidget = {
      id: uuidv4(),
      type: widget.type,
      title: widget.title || 'Untitled Widget',
      dataSource: DATA_SOURCES.includes(widget.dataSource) ? widget.dataSource : 'devbot-api',
      query: widget.query || '',
      config: widget.config || {},
      createdAt: new Date().toISOString(),
    };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date().toISOString();
    this.#saveDashboards();
    console.log(`[DevBot Analytics] Widget added to ${dashboard.name}: ${newWidget.title} (${newWidget.type})`);
    return { success: true, widget: newWidget };
  }

  /**
   * Get a dashboard with rendered data.
   * @param {string} dashboardId
   * @returns {Object} Full dashboard with data
   */
  getDashboard(dashboardId) {
    if (!dashboardId) return { success: false, error: 'Dashboard ID is required' };
    const dashboard = this.#dashboards.get(dashboardId);
    if (!dashboard) return { success: false, error: 'Dashboard not found' };

    // Simulate rendered widget data
    const renderedWidgets = dashboard.widgets.map(w => ({
      ...w,
      data: this.#generateWidgetData(w),
      lastUpdated: new Date().toISOString(),
    }));

    return {
      success: true,
      dashboard: { ...dashboard, widgets: renderedWidgets },
    };
  }

  /**
   * List all dashboards.
   * @param {string} [userId] - Filter by user
   * @returns {Object} Dashboard list
   */
  listDashboards(userId) {
    let dashboards = [...this.#dashboards.values()];
    if (userId) dashboards = dashboards.filter(d => d.userId === userId);
    return {
      success: true,
      count: dashboards.length,
      dashboards: dashboards.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        widgetCount: d.widgets.length,
        shared: !!d.shared,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    };
  }

  /**
   * Share a dashboard with configurable access.
   * @param {string} dashboardId
   * @param {Object} config
   * @param {boolean} [config.public] - Make publicly accessible
   * @param {string} [config.password] - Password protect
   * @param {string} [config.expiresAt] - Expiration ISO date
   * @returns {Object} Share configuration
   */
  shareDashboard(dashboardId, config = {}) {
    if (!dashboardId) return { success: false, error: 'Dashboard ID is required' };
    const dashboard = this.#dashboards.get(dashboardId);
    if (!dashboard) return { success: false, error: 'Dashboard not found' };

    const shareToken = uuidv4().replace(/-/g, '').substring(0, 16);
    dashboard.shared = {
      token: shareToken,
      public: config.public !== false,
      password: config.password || null,
      expiresAt: config.expiresAt || null,
      url: `https://devbot.ai/dashboards/shared/${shareToken}`,
      createdAt: new Date().toISOString(),
    };
    dashboard.updatedAt = new Date().toISOString();
    this.#saveDashboards();

    console.log(`[DevBot Analytics] Dashboard shared: ${dashboard.name} -> ${dashboard.shared.url}`);
    return { success: true, share: dashboard.shared };
  }

  // ─── Metrics ────────────────────────────────────────────────────────────

  /**
   * Get aggregated metrics from a data source.
   * @param {string} source - Data source key
   * @param {string} [period] - Time period: 'hour', 'day', 'week', 'month', 'year'
   * @returns {Object} Aggregated metrics
   */
  getMetrics(source, period = 'day') {
    if (!source) return { success: false, error: 'Data source is required' };
    if (!DATA_SOURCES.includes(source)) {
      return { success: false, error: `Invalid data source. Supported: ${DATA_SOURCES.join(', ')}` };
    }

    const periods = ['hour', 'day', 'week', 'month', 'year'];
    if (!periods.includes(period)) period = 'day';

    const metrics = this.#generateSourceMetrics(source, period);
    return { success: true, source, period, metrics, generatedAt: new Date().toISOString() };
  }

  // ─── Reports ────────────────────────────────────────────────────────────

  /**
   * Create an analytics report.
   * @param {Object} config
   * @param {string} config.name - Report name
   * @param {string[]} [config.dashboards] - Dashboard IDs to include
   * @param {string} [config.schedule] - Cron expression for scheduling
   * @param {string[]} [config.recipients] - Email recipients
   * @param {string} [config.format] - Output format
   * @returns {Object} Created report
   */
  createReport(config) {
    if (!config || !config.name) {
      return { success: false, error: 'Report name is required' };
    }

    const format = REPORT_FORMATS.includes(config.format) ? config.format : 'pdf';
    const id = uuidv4();
    const report = {
      id,
      name: config.name.trim(),
      dashboards: Array.isArray(config.dashboards) ? config.dashboards : [],
      schedule: config.schedule || null,
      recipients: Array.isArray(config.recipients) ? config.recipients : [],
      format,
      status: 'active',
      lastRun: null,
      nextRun: config.schedule ? new Date(Date.now() + 86400000).toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    this.#reports.set(id, report);
    this.#saveReports();
    console.log(`[DevBot Analytics] Report created: ${report.name} (${format})`);
    return { success: true, report };
  }

  /**
   * Schedule automated report delivery.
   * @param {string} reportId
   * @param {string} cron - Cron expression
   * @returns {Object} Updated report schedule
   */
  scheduleReport(reportId, cron) {
    if (!reportId) return { success: false, error: 'Report ID is required' };
    if (!cron) return { success: false, error: 'Cron expression is required' };

    const report = this.#reports.get(reportId);
    if (!report) return { success: false, error: 'Report not found' };

    report.schedule = cron;
    report.nextRun = new Date(Date.now() + 86400000).toISOString();
    report.updatedAt = new Date().toISOString();
    this.#saveReports();

    console.log(`[DevBot Analytics] Report scheduled: ${report.name} -> ${cron}`);
    return { success: true, reportId, schedule: cron, nextRun: report.nextRun };
  }

  /**
   * List all reports.
   * @returns {Object} Report list
   */
  listReports() {
    const reports = [...this.#reports.values()];
    return { success: true, count: reports.length, reports };
  }

  // ─── System Health ──────────────────────────────────────────────────────

  /**
   * Get overall platform health metrics.
   * @returns {Object} System health data
   */
  getSystemHealth() {
    return {
      success: true,
      health: {
        status: 'healthy',
        uptime: '99.97%',
        responseTime: `${Math.round(Math.random() * 50 + 10)}ms`,
        activeDashboards: this.#dashboards.size,
        activeReports: this.#reports.size,
        dataSources: DATA_SOURCES.map(source => ({
          name: source,
          status: Math.random() > 0.05 ? 'connected' : 'degraded',
          latency: `${Math.round(Math.random() * 100 + 5)}ms`,
        })),
        services: {
          grafana: { status: 'running', version: '10.2.0' },
          superset: { status: 'running', version: '3.1.0' },
          chartbrew: { status: 'running', version: '3.0.0' },
          chartjs: { status: 'loaded', version: '4.4.0' },
        },
        lastChecked: new Date().toISOString(),
      },
    };
  }

  // ─── Pre-built Dashboards ──────────────────────────────────────────────

  /**
   * Get list of pre-built dashboard templates.
   * @returns {Object} Available pre-built dashboards
   */
  getPrebuiltDashboards() {
    const templates = Object.entries(PREBUILT_DASHBOARDS).map(([key, val]) => ({
      key,
      name: val.name,
      description: val.description,
      widgetCount: val.widgets.length,
    }));
    return { success: true, count: templates.length, templates };
  }

  /**
   * Create a dashboard from a pre-built template.
   * @param {string} templateKey
   * @param {string} [userId]
   * @returns {Object} Created dashboard
   */
  createFromTemplate(templateKey, userId) {
    const template = PREBUILT_DASHBOARDS[templateKey];
    if (!template) {
      return { success: false, error: `Unknown template: ${templateKey}. Available: ${Object.keys(PREBUILT_DASHBOARDS).join(', ')}` };
    }
    return this.createDashboard({
      name: template.name,
      description: template.description,
      widgets: template.widgets,
      userId,
    });
  }

  // ─── Static ─────────────────────────────────────────────────────────────

  static get widgetTypes() { return [...WIDGET_TYPES]; }
  static get dataSources() { return [...DATA_SOURCES]; }
  static get reportFormats() { return [...REPORT_FORMATS]; }
  static get plans() { return { ...PLANS }; }

  static get registryEntry() {
    return {
      id: 'analytics',
      name: 'Analytics Platform',
      repo_url: 'https://github.com/ds335033/devbot',
      type: 'analytics',
      capabilities: [
        'dashboards', 'widgets', 'metrics', 'reports', 'sharing',
        'grafana', 'superset', 'chartjs', 'chartbrew',
        'scheduled-reports', 'pre-built-dashboards', 'system-health',
      ],
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  #generateWidgetData(widget) {
    const base = generateMetricValue(widget.dataSource, widget.query);
    switch (widget.type) {
      case 'metric-card':
        return { value: base, change: (Math.random() * 20 - 10).toFixed(1) + '%', trend: Math.random() > 0.5 ? 'up' : 'down' };
      case 'line-chart':
      case 'area-chart':
        return { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: Array.from({ length: 7 }, (_, i) => Math.round(base * (0.8 + Math.random() * 0.4) + i * 2)) };
      case 'bar-chart':
        return { labels: ['A', 'B', 'C', 'D', 'E'], values: Array.from({ length: 5 }, () => Math.round(base * Math.random())) };
      case 'pie-chart':
      case 'doughnut':
        return { labels: ['Segment 1', 'Segment 2', 'Segment 3', 'Segment 4'], values: [35, 25, 22, 18] };
      case 'radar':
        return { labels: ['Speed', 'Quality', 'Cost', 'Scale', 'Reliability'], values: Array.from({ length: 5 }, () => Math.round(Math.random() * 100)) };
      case 'scatter':
        return { points: Array.from({ length: 20 }, () => ({ x: Math.round(Math.random() * 100), y: Math.round(Math.random() * 100) })) };
      case 'table':
        return { headers: ['Name', 'Value', 'Change'], rows: Array.from({ length: 5 }, (_, i) => [`Item ${i + 1}`, Math.round(base + i * 10), `${(Math.random() * 10 - 5).toFixed(1)}%`]) };
      case 'heatmap':
        return { grid: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.round(Math.random() * 100))) };
      case 'gauge':
        return { value: Math.round(Math.random() * 100), min: 0, max: 100, thresholds: [30, 70, 90] };
      case 'funnel':
        return { stages: ['Visitors', 'Signups', 'Active', 'Paid', 'Retained'], values: [10000, 3500, 1200, 450, 320] };
      default:
        return { value: base };
    }
  }

  #generateSourceMetrics(source, period) {
    const multiplier = { hour: 1, day: 24, week: 168, month: 720, year: 8760 }[period] || 24;
    return {
      totalRequests: Math.round(generateMetricValue(source, 'requests') * multiplier),
      avgResponseTime: `${Math.round(generateMetricValue(source, 'latency'))}ms`,
      errorRate: `${(Math.random() * 2).toFixed(2)}%`,
      throughput: `${Math.round(generateMetricValue(source, 'throughput') * multiplier / 60)}/min`,
      activeUsers: Math.round(generateMetricValue(source, 'users') / 10),
      dataPoints: Math.round(generateMetricValue(source, 'datapoints') * multiplier * 10),
      topEndpoints: [
        { path: '/api/query', count: Math.round(Math.random() * 1000 * multiplier) },
        { path: '/api/data', count: Math.round(Math.random() * 800 * multiplier) },
        { path: '/api/status', count: Math.round(Math.random() * 500 * multiplier) },
      ],
    };
  }
}

export default AnalyticsService;
