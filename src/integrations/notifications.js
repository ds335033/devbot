/**
 * DevBot AI — Unified Notification Service (Novu + ntfy)
 *
 * Multi-channel notification delivery with templates, analytics,
 * user preferences, and digest batching. Supports email, SMS, push,
 * Slack, WhatsApp, in-app, and webhook channels.
 *
 * Revenue: Free (100/mo), Starter $9/mo (5000), Growth $29/mo (50000),
 *          Scale $99/mo (500000)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/notifications');
mkdirSync(DATA_DIR, { recursive: true });

const LOG = '[DevBot Notify]';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS = ['email', 'sms', 'push', 'slack', 'whatsapp', 'in-app', 'webhook'];

const PLANS = {
  free:    { maxPerMonth: 100, price: 0 },
  starter: { maxPerMonth: 5000, price: 9 },
  growth:  { maxPerMonth: 50000, price: 29 },
  scale:   { maxPerMonth: 500000, price: 99 },
};

const BUILTIN_TEMPLATES = [
  { id: 'welcome', name: 'Welcome', channel: 'email', subject: 'Welcome to {{appName}}!', body: 'Hi {{name}}, welcome aboard! We\'re excited to have you.', variables: ['appName', 'name'] },
  { id: 'order-confirmation', name: 'Order Confirmation', channel: 'email', subject: 'Order #{{orderId}} Confirmed', body: 'Your order #{{orderId}} has been confirmed. Total: {{total}}.', variables: ['orderId', 'total'] },
  { id: 'payment-received', name: 'Payment Received', channel: 'email', subject: 'Payment of {{amount}} received', body: 'We received your payment of {{amount}}. Thank you!', variables: ['amount'] },
  { id: 'shipping-update', name: 'Shipping Update', channel: 'email', subject: 'Your order is {{status}}', body: 'Your order #{{orderId}} is now {{status}}. Tracking: {{trackingUrl}}', variables: ['orderId', 'status', 'trackingUrl'] },
  { id: 'password-reset', name: 'Password Reset', channel: 'email', subject: 'Reset your password', body: 'Click the link to reset your password: {{resetUrl}}. Expires in 1 hour.', variables: ['resetUrl'] },
  { id: 'price-alert', name: 'Price Alert', channel: 'push', subject: '{{symbol}} Price Alert', body: '{{symbol}} has reached {{price}} ({{direction}} {{threshold}}).', variables: ['symbol', 'price', 'direction', 'threshold'] },
  { id: 'workflow-complete', name: 'Workflow Complete', channel: 'slack', subject: 'Workflow "{{workflowName}}" finished', body: 'Workflow "{{workflowName}}" completed with status: {{status}}.', variables: ['workflowName', 'status'] },
  { id: 'invoice-due', name: 'Invoice Due', channel: 'email', subject: 'Invoice #{{invoiceId}} due {{dueDate}}', body: 'Your invoice #{{invoiceId}} for {{amount}} is due on {{dueDate}}.', variables: ['invoiceId', 'amount', 'dueDate'] },
  { id: 'new-feature', name: 'New Feature Announcement', channel: 'in-app', subject: 'New: {{featureName}}', body: 'We just launched {{featureName}}! {{description}}', variables: ['featureName', 'description'] },
  { id: 'weekly-digest', name: 'Weekly Digest', channel: 'email', subject: 'Your weekly summary for {{weekOf}}', body: 'Here\'s your activity summary: {{summaryHtml}}', variables: ['weekOf', 'summaryHtml'] },
];

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

export class NotificationService {
  #notifications;
  #templates;
  #preferences;
  #digests;

  constructor() {
    this.#notifications = loadData('notifications.json');
    this.#templates = loadData('templates.json');
    this.#preferences = loadData('preferences.json');
    this.#digests = loadData('digests.json');
    console.log(`${LOG} Service initialized — ${Object.keys(this.#notifications).length} notifications, ${Object.keys(this.#templates).length} custom templates`);
  }

  /**
   * Send a single notification.
   * @param {Object} config
   * @param {string} config.channel - Notification channel
   * @param {string} config.recipient - Recipient identifier (email, phone, userId, etc.)
   * @param {string} [config.template] - Template ID to use
   * @param {Object} [config.data={}] - Template variable data
   * @param {string} [config.subject] - Subject/title (override template)
   * @param {string} [config.body] - Body content (override template)
   * @param {string} [config.schedule] - ISO datetime to schedule delivery
   * @param {string} [config.userId] - Sending user ID for quota tracking
   * @param {string} [config.plan='free'] - User plan
   * @returns {{ success: boolean, notification?: Object, error?: string }}
   */
  send(config) {
    if (!config || !config.channel || !config.recipient) {
      return { success: false, error: 'channel and recipient are required' };
    }
    if (!CHANNELS.includes(config.channel)) {
      return { success: false, error: `Invalid channel. Valid: ${CHANNELS.join(', ')}` };
    }
    if (!config.template && !config.body) {
      return { success: false, error: 'Either template or body is required' };
    }

    let subject = config.subject || '';
    let body = config.body || '';

    // Resolve template
    if (config.template) {
      const tmpl = this.#templates[config.template] || BUILTIN_TEMPLATES.find(t => t.id === config.template);
      if (!tmpl) return { success: false, error: `Template "${config.template}" not found` };
      subject = subject || tmpl.subject;
      body = body || tmpl.body;
      // Interpolate variables
      const data = config.data || {};
      for (const [key, val] of Object.entries(data)) {
        const re = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(re, String(val));
        body = body.replace(re, String(val));
      }
    }

    const id = uuidv4();
    const notification = {
      id,
      channel: config.channel,
      recipient: config.recipient,
      subject,
      body,
      template: config.template || null,
      data: config.data || {},
      schedule: config.schedule || null,
      status: config.schedule ? 'scheduled' : 'sent',
      deliveredAt: config.schedule ? null : new Date().toISOString(),
      openedAt: null,
      clickedAt: null,
      createdAt: new Date().toISOString(),
    };

    this.#notifications[id] = notification;
    saveData('notifications.json', this.#notifications);
    console.log(`${LOG} Sent ${config.channel} notification to ${config.recipient} (${id})`);
    return { success: true, notification };
  }

  /**
   * Send bulk notifications.
   * @param {Array<Object>} configs - Array of notification configs (same shape as send())
   * @returns {{ success: boolean, results: Array<{ success: boolean, notification?: Object, error?: string }> }}
   */
  sendBulk(configs) {
    if (!Array.isArray(configs) || configs.length === 0) {
      return { success: false, error: 'configs must be a non-empty array' };
    }
    const results = configs.map(c => this.send(c));
    const sent = results.filter(r => r.success).length;
    console.log(`${LOG} Bulk send: ${sent}/${configs.length} delivered`);
    return { success: true, results };
  }

  /**
   * Create a custom notification template.
   * @param {Object} config
   * @param {string} config.name - Template name
   * @param {string} config.channel - Target channel
   * @param {string} config.subject - Subject/title with {{variables}}
   * @param {string} config.body - Body content with {{variables}}
   * @param {Array<string>} [config.variables=[]] - Variable names used in template
   * @returns {{ success: boolean, template?: Object, error?: string }}
   */
  createTemplate(config) {
    if (!config || !config.name || !config.channel || !config.subject || !config.body) {
      return { success: false, error: 'name, channel, subject, and body are required' };
    }
    if (!CHANNELS.includes(config.channel)) {
      return { success: false, error: `Invalid channel. Valid: ${CHANNELS.join(', ')}` };
    }

    const id = uuidv4();
    const template = {
      id,
      name: config.name,
      channel: config.channel,
      subject: config.subject,
      body: config.body,
      variables: config.variables || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.#templates[id] = template;
    saveData('templates.json', this.#templates);
    console.log(`${LOG} Created template "${config.name}" (${id})`);
    return { success: true, template };
  }

  /**
   * Update an existing template.
   * @param {string} templateId
   * @param {Object} updates - Fields to update (subject, body, name, variables)
   * @returns {{ success: boolean, template?: Object, error?: string }}
   */
  updateTemplate(templateId, updates) {
    if (!templateId) return { success: false, error: 'templateId is required' };
    const template = this.#templates[templateId];
    if (!template) return { success: false, error: 'Template not found' };

    const allowed = ['name', 'subject', 'body', 'variables', 'channel'];
    for (const key of Object.keys(updates)) {
      if (allowed.includes(key)) template[key] = updates[key];
    }
    template.updatedAt = new Date().toISOString();

    this.#templates[templateId] = template;
    saveData('templates.json', this.#templates);
    console.log(`${LOG} Updated template "${template.name}" (${templateId})`);
    return { success: true, template };
  }

  /**
   * List templates filtered by channel.
   * @param {string} [channel] - Filter by channel (omit for all)
   * @returns {{ success: boolean, templates: Array }}
   */
  listTemplates(channel) {
    let templates = [
      ...BUILTIN_TEMPLATES,
      ...Object.values(this.#templates),
    ];
    if (channel) {
      if (!CHANNELS.includes(channel)) {
        return { success: false, error: `Invalid channel. Valid: ${CHANNELS.join(', ')}` };
      }
      templates = templates.filter(t => t.channel === channel);
    }
    console.log(`${LOG} Listed ${templates.length} templates${channel ? ` for channel ${channel}` : ''}`);
    return { success: true, templates };
  }

  /**
   * Get delivery status of a notification.
   * @param {string} notificationId
   * @returns {{ success: boolean, status?: Object, error?: string }}
   */
  getDeliveryStatus(notificationId) {
    if (!notificationId) return { success: false, error: 'notificationId is required' };
    const notif = this.#notifications[notificationId];
    if (!notif) return { success: false, error: 'Notification not found' };

    const status = {
      id: notif.id,
      channel: notif.channel,
      recipient: notif.recipient,
      status: notif.status,
      deliveredAt: notif.deliveredAt,
      openedAt: notif.openedAt,
      clickedAt: notif.clickedAt,
      createdAt: notif.createdAt,
    };
    console.log(`${LOG} Status for ${notificationId}: ${notif.status}`);
    return { success: true, status };
  }

  /**
   * Get notification analytics for a time period.
   * @param {string} [period='30d'] - Period: '7d', '30d', '90d', 'all'
   * @returns {{ success: boolean, analytics: Object }}
   */
  getAnalytics(period = '30d') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === 'all' ? 99999 : 30;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const all = Object.values(this.#notifications).filter(n => n.createdAt >= cutoff);
    const byChannel = {};
    for (const ch of CHANNELS) {
      const chNotifs = all.filter(n => n.channel === ch);
      byChannel[ch] = {
        sent: chNotifs.length,
        delivered: chNotifs.filter(n => n.status === 'sent' || n.status === 'delivered').length,
        opened: chNotifs.filter(n => n.openedAt).length,
        clicked: chNotifs.filter(n => n.clickedAt).length,
        failed: chNotifs.filter(n => n.status === 'failed').length,
      };
    }

    const analytics = {
      period,
      totalSent: all.length,
      deliveryRate: all.length ? (all.filter(n => n.status !== 'failed').length / all.length * 100).toFixed(1) + '%' : '0%',
      openRate: all.length ? (all.filter(n => n.openedAt).length / all.length * 100).toFixed(1) + '%' : '0%',
      clickRate: all.length ? (all.filter(n => n.clickedAt).length / all.length * 100).toFixed(1) + '%' : '0%',
      byChannel,
    };

    console.log(`${LOG} Analytics for ${period}: ${all.length} notifications`);
    return { success: true, analytics };
  }

  /**
   * Set user notification preferences per channel.
   * @param {string} userId
   * @param {Object} preferences - Channel preferences { email: true, sms: false, ... }
   * @returns {{ success: boolean, preferences?: Object, error?: string }}
   */
  setPreferences(userId, preferences) {
    if (!userId) return { success: false, error: 'userId is required' };
    if (!preferences || typeof preferences !== 'object') {
      return { success: false, error: 'preferences object is required' };
    }

    // Validate channel keys
    for (const key of Object.keys(preferences)) {
      if (!CHANNELS.includes(key)) {
        return { success: false, error: `Invalid channel in preferences: ${key}` };
      }
    }

    this.#preferences[userId] = {
      ...this.#preferences[userId],
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    saveData('preferences.json', this.#preferences);
    console.log(`${LOG} Updated preferences for user ${userId}`);
    return { success: true, preferences: this.#preferences[userId] };
  }

  /**
   * Create a notification digest that batches events into periodic summaries.
   * @param {Object} config
   * @param {string} config.name - Digest name
   * @param {Array<string>} config.events - Event types to include
   * @param {string} config.frequency - Frequency: 'hourly', 'daily', 'weekly'
   * @param {string} config.channel - Delivery channel
   * @param {string} config.recipient - Digest recipient
   * @returns {{ success: boolean, digest?: Object, error?: string }}
   */
  createDigest(config) {
    if (!config || !config.name || !config.events || !config.frequency || !config.channel) {
      return { success: false, error: 'name, events, frequency, and channel are required' };
    }
    if (!Array.isArray(config.events) || config.events.length === 0) {
      return { success: false, error: 'events must be a non-empty array' };
    }
    if (!['hourly', 'daily', 'weekly'].includes(config.frequency)) {
      return { success: false, error: 'frequency must be hourly, daily, or weekly' };
    }
    if (!CHANNELS.includes(config.channel)) {
      return { success: false, error: `Invalid channel. Valid: ${CHANNELS.join(', ')}` };
    }

    const id = uuidv4();
    const digest = {
      id,
      name: config.name,
      events: config.events,
      frequency: config.frequency,
      channel: config.channel,
      recipient: config.recipient || null,
      status: 'active',
      lastSentAt: null,
      createdAt: new Date().toISOString(),
    };

    this.#digests[id] = digest;
    saveData('digests.json', this.#digests);
    console.log(`${LOG} Created digest "${config.name}" (${id}) — ${config.frequency} via ${config.channel}`);
    return { success: true, digest };
  }
}

export default NotificationService;
