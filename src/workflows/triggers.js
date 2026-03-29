/**
 * DevBot AI — Event Trigger System
 *
 * Maps external events to workflow executions.
 * Supports: webhooks, Slack commands, Stripe events, GitHub events,
 * cron schedules, manual triggers, and trading signals.
 *
 * Each trigger maps to one or more workflow templates with parameter injection.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRIGGERS_DIR = resolve(__dirname, '../../data/workflows');
const TRIGGERS_FILE = resolve(TRIGGERS_DIR, 'triggers.json');
mkdirSync(TRIGGERS_DIR, { recursive: true });

// ─── Trigger Types ──────────────────────────────────────────────────────────
const TRIGGER_TYPES = [
  'webhook_received',
  'slack_command',
  'stripe_event',
  'github_event',
  'schedule',
  'manual',
  'trading_signal',
];

/**
 * @typedef {Object} TriggerConfig
 * @property {string} id - Unique trigger ID
 * @property {string} name - Human-readable name
 * @property {string} type - One of TRIGGER_TYPES
 * @property {boolean} enabled - Whether the trigger is active
 * @property {Object} filter - Type-specific filter criteria
 * @property {Object[]} actions - Array of { templateId, paramMapping }
 * @property {string} createdAt - ISO timestamp
 * @property {number} fireCount - Number of times this trigger has fired
 * @property {string|null} lastFiredAt - ISO timestamp of last fire
 */

export class TriggerManager {
  /**
   * @param {import('./scheduler.js').WorkflowScheduler} scheduler
   */
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.triggers = [];
    this.loadTriggers();
    console.log('[DevBot Workflow] Trigger manager initialized');
  }

  /**
   * Register a new trigger.
   * @param {Object} config
   * @param {string} config.name - Trigger name
   * @param {string} config.type - Trigger type
   * @param {Object} [config.filter] - Event filter criteria
   * @param {Object[]} config.actions - Actions to perform: [{ templateId, paramMapping, priority }]
   * @returns {TriggerConfig}
   */
  createTrigger({ name, type, filter = {}, actions = [] }) {
    if (!name || typeof name !== 'string') throw new Error('Trigger name is required');
    if (!TRIGGER_TYPES.includes(type)) throw new Error(`Invalid trigger type: ${type}. Valid: ${TRIGGER_TYPES.join(', ')}`);
    if (!actions.length) throw new Error('At least one action is required');

    for (const action of actions) {
      if (!action.templateId) throw new Error('Each action must have a templateId');
    }

    const trigger = {
      id: `trg-${crypto.randomUUID().slice(0, 12)}`,
      name,
      type,
      enabled: true,
      filter,
      actions,
      createdAt: new Date().toISOString(),
      fireCount: 0,
      lastFiredAt: null,
    };

    this.triggers.push(trigger);

    // If it's a schedule trigger, register the cron job
    if (type === 'schedule' && filter.cronExpr) {
      for (const action of actions) {
        this.scheduler.addCronJob(
          filter.cronExpr,
          action.templateId,
          action.paramMapping || {},
          action.priority || 2
        );
      }
    }

    this.saveTriggers();
    console.log(`[DevBot Workflow] Trigger created: ${trigger.id} (${type}) -> ${actions.map(a => a.templateId).join(', ')}`);
    return trigger;
  }

  /**
   * Delete a trigger by ID.
   * @param {string} triggerId
   * @returns {boolean}
   */
  deleteTrigger(triggerId) {
    const idx = this.triggers.findIndex(t => t.id === triggerId);
    if (idx === -1) return false;
    this.triggers.splice(idx, 1);
    this.saveTriggers();
    return true;
  }

  /**
   * Enable or disable a trigger.
   * @param {string} triggerId
   * @param {boolean} enabled
   * @returns {boolean}
   */
  setEnabled(triggerId, enabled) {
    const trigger = this.triggers.find(t => t.id === triggerId);
    if (!trigger) return false;
    trigger.enabled = enabled;
    this.saveTriggers();
    return true;
  }

  /**
   * Fire a trigger by evaluating an incoming event.
   * @param {string} type - Event type
   * @param {Object} eventData - Event payload
   * @returns {Object[]} Array of enqueued workflow items
   */
  fire(type, eventData = {}) {
    if (!TRIGGER_TYPES.includes(type)) {
      console.log(`[DevBot Workflow] Unknown trigger type: ${type}`);
      return [];
    }

    const matchingTriggers = this.triggers.filter(t =>
      t.enabled && t.type === type && this.matchesFilter(t.filter, eventData, type)
    );

    const enqueued = [];

    for (const trigger of matchingTriggers) {
      trigger.fireCount++;
      trigger.lastFiredAt = new Date().toISOString();

      for (const action of trigger.actions) {
        // Build params by merging event data with parameter mapping
        const params = this.buildParams(action.paramMapping || {}, eventData);
        params._triggerId = trigger.id;
        params._triggerType = type;

        try {
          const item = this.scheduler.enqueue(action.templateId, params, action.priority || 2);
          enqueued.push({ triggerId: trigger.id, queueItemId: item.id, templateId: action.templateId });
          console.log(`[DevBot Workflow] Trigger ${trigger.id} fired -> ${action.templateId}`);
        } catch (e) {
          console.error(`[DevBot Workflow] Trigger ${trigger.id} failed to enqueue: ${e.message}`);
        }
      }
    }

    if (enqueued.length > 0) {
      this.saveTriggers();
    }

    return enqueued;
  }

  /**
   * Check if event data matches a trigger's filter.
   * @param {Object} filter - Trigger filter config
   * @param {Object} eventData - Incoming event data
   * @param {string} type - Trigger type
   * @returns {boolean}
   */
  matchesFilter(filter, eventData, type) {
    if (!filter || Object.keys(filter).length === 0) return true;

    switch (type) {
      case 'webhook_received':
        // Match by path or source
        if (filter.path && eventData.path !== filter.path) return false;
        if (filter.source && eventData.source !== filter.source) return false;
        return true;

      case 'slack_command':
        // Match by command name
        if (filter.command && eventData.command !== filter.command) return false;
        return true;

      case 'stripe_event':
        // Match by event type (e.g. 'payment_intent.succeeded')
        if (filter.eventType && eventData.type !== filter.eventType) return false;
        return true;

      case 'github_event':
        // Match by action (push, pull_request, issues)
        if (filter.action && eventData.action !== filter.action) return false;
        if (filter.repo && eventData.repository?.full_name !== filter.repo) return false;
        if (filter.branch && eventData.ref !== `refs/heads/${filter.branch}`) return false;
        return true;

      case 'trading_signal':
        // Match by pair, direction, threshold
        if (filter.pair && eventData.pair !== filter.pair) return false;
        if (filter.direction && eventData.direction !== filter.direction) return false;
        if (filter.priceAbove && eventData.price < filter.priceAbove) return false;
        if (filter.priceBelow && eventData.price > filter.priceBelow) return false;
        if (filter.volumeAbove && eventData.volume < filter.volumeAbove) return false;
        return true;

      case 'manual':
        // Always matches for manual triggers
        return true;

      case 'schedule':
        // Handled by cron system
        return true;

      default:
        return true;
    }
  }

  /**
   * Build workflow params from a parameter mapping and event data.
   * Mapping format: { workflowParam: "eventData.path.to.value" }
   * @param {Object} mapping
   * @param {Object} eventData
   * @returns {Object}
   */
  buildParams(mapping, eventData) {
    const params = { ...eventData };

    for (const [paramKey, sourcePath] of Object.entries(mapping)) {
      if (typeof sourcePath === 'string' && sourcePath.startsWith('event.')) {
        const path = sourcePath.slice(6).split('.');
        let value = eventData;
        for (const key of path) {
          if (value == null) break;
          value = value[key];
        }
        if (value !== undefined) params[paramKey] = value;
      } else {
        // Static value
        params[paramKey] = sourcePath;
      }
    }

    return params;
  }

  /**
   * List all triggers with optional type filter.
   * @param {string} [type] - Filter by trigger type
   * @returns {TriggerConfig[]}
   */
  listTriggers(type) {
    let result = [...this.triggers];
    if (type) result = result.filter(t => t.type === type);
    return result;
  }

  /**
   * Get a trigger by ID.
   * @param {string} triggerId
   * @returns {TriggerConfig|null}
   */
  getTrigger(triggerId) {
    return this.triggers.find(t => t.id === triggerId) || null;
  }

  /**
   * Get trigger statistics for the dashboard.
   * @returns {Object}
   */
  getStats() {
    const byType = {};
    for (const type of TRIGGER_TYPES) {
      const ofType = this.triggers.filter(t => t.type === type);
      byType[type] = {
        total: ofType.length,
        enabled: ofType.filter(t => t.enabled).length,
        totalFires: ofType.reduce((sum, t) => sum + t.fireCount, 0),
      };
    }

    return {
      totalTriggers: this.triggers.length,
      enabledTriggers: this.triggers.filter(t => t.enabled).length,
      totalFires: this.triggers.reduce((sum, t) => sum + t.fireCount, 0),
      byType,
      topTriggers: [...this.triggers]
        .sort((a, b) => b.fireCount - a.fireCount)
        .slice(0, 10)
        .map(t => ({ id: t.id, name: t.name, type: t.type, fireCount: t.fireCount })),
    };
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  /**
   * Save triggers to disk.
   */
  saveTriggers() {
    try {
      writeFileSync(TRIGGERS_FILE, JSON.stringify(this.triggers, null, 2), 'utf8');
    } catch (e) {
      console.error(`[DevBot Workflow] Failed to save triggers: ${e.message}`);
    }
  }

  /**
   * Load triggers from disk.
   */
  loadTriggers() {
    try {
      if (!existsSync(TRIGGERS_FILE)) return;
      this.triggers = JSON.parse(readFileSync(TRIGGERS_FILE, 'utf8'));
      console.log(`[DevBot Workflow] Loaded ${this.triggers.length} triggers`);
    } catch (e) {
      console.error(`[DevBot Workflow] Failed to load triggers: ${e.message}`);
      this.triggers = [];
    }
  }
}

export { TRIGGER_TYPES };
