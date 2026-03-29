/**
 * DevBot AI — Workflow Scheduler
 *
 * Runs workflows on cron schedules or event triggers.
 * Priority queue with concurrent execution limits, dead letter queue,
 * and exponential backoff retries.
 *
 * Queue state persisted to data/workflows/queue.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_DIR = resolve(__dirname, '../../data/workflows');
const QUEUE_FILE = resolve(QUEUE_DIR, 'queue.json');
mkdirSync(QUEUE_DIR, { recursive: true });

// ─── Priority Levels ────────────────────────────────────────────────────────
const PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

const PRIORITY_LABELS = { 0: 'critical', 1: 'high', 2: 'normal', 3: 'low' };

const DEFAULT_CONCURRENT_LIMIT = 5;
const MAX_DLQ_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 3;

// ─── Simple Cron Parser ─────────────────────────────────────────────────────
/**
 * Parse a simple cron expression and check if it matches the current time.
 * Supports: minute hour dayOfMonth month dayOfWeek (standard 5-field cron).
 * Supports * for any, and specific numbers.
 * @param {string} cronExpr - Cron expression (e.g. "0 * * * *" for every hour)
 * @param {Date} [now] - Date to check against (default: now)
 * @returns {boolean}
 */
function cronMatches(cronExpr, now = new Date()) {
  if (!cronExpr || typeof cronExpr !== 'string') return false;
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const fields = [
    now.getMinutes(),
    now.getHours(),
    now.getDate(),
    now.getMonth() + 1,
    now.getDay(),
  ];

  for (let i = 0; i < 5; i++) {
    const part = parts[i];
    if (part === '*') continue;

    // Handle lists: 1,2,3
    if (part.includes(',')) {
      const values = part.split(',').map(Number);
      if (!values.includes(fields[i])) return false;
      continue;
    }

    // Handle ranges: 1-5
    if (part.includes('-')) {
      const [min, max] = part.split('-').map(Number);
      if (fields[i] < min || fields[i] > max) return false;
      continue;
    }

    // Handle step values: */5
    if (part.startsWith('*/')) {
      const step = Number(part.slice(2));
      if (step > 0 && fields[i] % step !== 0) return false;
      continue;
    }

    // Exact match
    if (Number(part) !== fields[i]) return false;
  }

  return true;
}

// ─── Queue Item ─────────────────────────────────────────────────────────────
/**
 * @typedef {Object} QueueItem
 * @property {string} id - Queue item ID
 * @property {string} templateId - Workflow template ID
 * @property {Object} params - Workflow parameters
 * @property {number} priority - Priority level (0=critical, 3=low)
 * @property {string} status - queued | running | completed | failed | dead
 * @property {number} attempts - Number of execution attempts
 * @property {string|null} error - Last error message
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 * @property {string|null} workflowId - Associated workflow ID once started
 */

export class WorkflowScheduler {
  /**
   * @param {import('./engine.js').WorkflowEngine} workflowEngine
   * @param {Object} options
   * @param {number} [options.concurrentLimit] - Max concurrent workflows (default 5)
   * @param {number} [options.pollIntervalMs] - Queue poll interval in ms (default 5000)
   */
  constructor(workflowEngine, options = {}) {
    this.engine = workflowEngine;
    this.concurrentLimit = options.concurrentLimit || DEFAULT_CONCURRENT_LIMIT;
    this.pollIntervalMs = options.pollIntervalMs || 5000;

    this.queue = [];
    this.deadLetterQueue = [];
    this.running = new Map(); // id -> QueueItem
    this.cronJobs = []; // { id, cronExpr, templateId, params, priority, enabled }
    this.pollTimer = null;
    this.cronTimer = null;

    this.loadQueueState();
    console.log('[DevBot Workflow] Scheduler initialized');
  }

  /**
   * Enqueue a workflow for execution.
   * @param {string} templateId - Workflow template ID
   * @param {Object} params - Workflow parameters
   * @param {number} [priority] - Priority level (default NORMAL)
   * @returns {Object} Queue item
   */
  enqueue(templateId, params = {}, priority = PRIORITY.NORMAL) {
    if (!templateId || typeof templateId !== 'string') {
      throw new Error('templateId is required');
    }
    if (typeof priority !== 'number' || priority < 0 || priority > 3) {
      priority = PRIORITY.NORMAL;
    }

    const item = {
      id: `qi-${crypto.randomUUID()}`,
      templateId,
      params,
      priority,
      status: 'queued',
      attempts: 0,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      workflowId: null,
    };

    this.queue.push(item);
    this.sortQueue();
    this.saveQueueState();
    console.log(`[DevBot Workflow] Enqueued ${templateId} (priority: ${PRIORITY_LABELS[priority]}) -> ${item.id}`);
    return item;
  }

  /**
   * Sort queue by priority (lower number = higher priority), then by creation time.
   */
  sortQueue() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }

  /**
   * Process the next items in the queue up to the concurrent limit.
   */
  async processQueue() {
    const availableSlots = this.concurrentLimit - this.running.size;
    if (availableSlots <= 0) return;

    const toProcess = this.queue
      .filter(item => item.status === 'queued')
      .slice(0, availableSlots);

    for (const item of toProcess) {
      try {
        item.status = 'running';
        item.attempts++;
        item.updatedAt = new Date().toISOString();
        this.running.set(item.id, item);

        // Remove from queue
        const idx = this.queue.findIndex(q => q.id === item.id);
        if (idx !== -1) this.queue.splice(idx, 1);

        // Get template and start workflow
        const { getTemplate } = await import('./templates.js');
        const template = getTemplate(item.templateId);
        if (!template) {
          throw new Error(`Template not found: ${item.templateId}`);
        }

        const result = await this.engine.startWorkflow(template, item.params);
        item.workflowId = result.workflowId;

        // Listen for completion
        const onCompleted = (data) => {
          if (data.workflowId === item.workflowId) {
            item.status = 'completed';
            item.updatedAt = new Date().toISOString();
            this.running.delete(item.id);
            this.saveQueueState();
            this.engine.removeListener('workflow:completed', onCompleted);
            this.engine.removeListener('workflow:failed', onFailed);
          }
        };

        const onFailed = (data) => {
          if (data.workflowId === item.workflowId) {
            item.status = 'failed';
            item.error = data.error;
            item.updatedAt = new Date().toISOString();
            this.running.delete(item.id);
            this.engine.removeListener('workflow:completed', onCompleted);
            this.engine.removeListener('workflow:failed', onFailed);

            // Retry or move to DLQ
            if (item.attempts < MAX_RETRY_ATTEMPTS) {
              const backoffMs = 1000 * Math.pow(2, item.attempts);
              console.log(`[DevBot Workflow] Retrying ${item.id} in ${backoffMs}ms (attempt ${item.attempts + 1}/${MAX_RETRY_ATTEMPTS})`);
              setTimeout(() => {
                item.status = 'queued';
                item.updatedAt = new Date().toISOString();
                this.queue.push(item);
                this.sortQueue();
                this.saveQueueState();
              }, backoffMs);
            } else {
              this.moveToDLQ(item);
            }

            this.saveQueueState();
          }
        };

        this.engine.on('workflow:completed', onCompleted);
        this.engine.on('workflow:failed', onFailed);

        this.saveQueueState();
      } catch (e) {
        console.error(`[DevBot Workflow] Failed to process queue item ${item.id}: ${e.message}`);
        item.status = 'failed';
        item.error = e.message;
        item.updatedAt = new Date().toISOString();
        this.running.delete(item.id);

        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          this.moveToDLQ(item);
        } else {
          item.status = 'queued';
          this.queue.push(item);
          this.sortQueue();
        }
        this.saveQueueState();
      }
    }
  }

  /**
   * Move a failed item to the dead letter queue.
   * @param {QueueItem} item
   */
  moveToDLQ(item) {
    item.status = 'dead';
    item.updatedAt = new Date().toISOString();
    this.deadLetterQueue.push(item);
    // Trim DLQ to max size
    if (this.deadLetterQueue.length > MAX_DLQ_SIZE) {
      this.deadLetterQueue = this.deadLetterQueue.slice(-MAX_DLQ_SIZE);
    }
    console.log(`[DevBot Workflow] Moved ${item.id} to dead letter queue after ${item.attempts} attempts`);
  }

  /**
   * Register a cron-scheduled workflow.
   * @param {string} cronExpr - Cron expression (5-field)
   * @param {string} templateId - Workflow template ID
   * @param {Object} params - Workflow parameters
   * @param {number} [priority] - Priority level
   * @returns {Object} Cron job config
   */
  addCronJob(cronExpr, templateId, params = {}, priority = PRIORITY.NORMAL) {
    const job = {
      id: `cron-${crypto.randomUUID().slice(0, 8)}`,
      cronExpr,
      templateId,
      params,
      priority,
      enabled: true,
      lastRun: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.cronJobs.push(job);
    this.saveQueueState();
    console.log(`[DevBot Workflow] Cron job registered: ${job.id} (${cronExpr}) -> ${templateId}`);
    return job;
  }

  /**
   * Remove a cron job by ID.
   * @param {string} jobId
   * @returns {boolean}
   */
  removeCronJob(jobId) {
    const idx = this.cronJobs.findIndex(j => j.id === jobId);
    if (idx === -1) return false;
    this.cronJobs.splice(idx, 1);
    this.saveQueueState();
    return true;
  }

  /**
   * Check all cron jobs and enqueue matching ones.
   */
  checkCronJobs() {
    const now = new Date();
    for (const job of this.cronJobs) {
      if (!job.enabled) continue;
      if (cronMatches(job.cronExpr, now)) {
        // Prevent double-firing in the same minute
        if (job.lastRun) {
          const lastRunDate = new Date(job.lastRun);
          if (now.getMinutes() === lastRunDate.getMinutes() &&
              now.getHours() === lastRunDate.getHours() &&
              now.getDate() === lastRunDate.getDate()) {
            continue;
          }
        }
        job.lastRun = now.toISOString();
        job.runCount++;
        this.enqueue(job.templateId, { ...job.params, _cronJobId: job.id }, job.priority);
        console.log(`[DevBot Workflow] Cron fired: ${job.id} -> ${job.templateId}`);
      }
    }
  }

  /**
   * Start the scheduler polling loop.
   */
  start() {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.processQueue().catch(e => {
        console.error(`[DevBot Workflow] Queue processing error: ${e.message}`);
      });
    }, this.pollIntervalMs);

    // Cron check every 60 seconds
    this.cronTimer = setInterval(() => {
      this.checkCronJobs();
    }, 60_000);

    // Initial process
    this.processQueue().catch(() => {});
    console.log(`[DevBot Workflow] Scheduler started (poll: ${this.pollIntervalMs}ms, limit: ${this.concurrentLimit})`);
  }

  /**
   * Stop the scheduler.
   */
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.cronTimer) {
      clearInterval(this.cronTimer);
      this.cronTimer = null;
    }
    console.log('[DevBot Workflow] Scheduler stopped');
  }

  /**
   * Get queue and scheduler status for the dashboard.
   * @returns {Object}
   */
  getStatus() {
    return {
      isRunning: !!this.pollTimer,
      concurrentLimit: this.concurrentLimit,
      queue: {
        total: this.queue.length,
        byPriority: {
          critical: this.queue.filter(q => q.priority === PRIORITY.CRITICAL).length,
          high: this.queue.filter(q => q.priority === PRIORITY.HIGH).length,
          normal: this.queue.filter(q => q.priority === PRIORITY.NORMAL).length,
          low: this.queue.filter(q => q.priority === PRIORITY.LOW).length,
        },
      },
      running: {
        count: this.running.size,
        items: Array.from(this.running.values()).map(i => ({
          id: i.id,
          templateId: i.templateId,
          workflowId: i.workflowId,
          startedAt: i.updatedAt,
        })),
      },
      deadLetterQueue: {
        count: this.deadLetterQueue.length,
        recent: this.deadLetterQueue.slice(-5).map(i => ({
          id: i.id,
          templateId: i.templateId,
          error: i.error,
          attempts: i.attempts,
          failedAt: i.updatedAt,
        })),
      },
      cronJobs: this.cronJobs.map(j => ({
        id: j.id,
        cronExpr: j.cronExpr,
        templateId: j.templateId,
        enabled: j.enabled,
        lastRun: j.lastRun,
        runCount: j.runCount,
      })),
    };
  }

  /**
   * Retry a dead letter queue item by moving it back to the main queue.
   * @param {string} itemId
   * @returns {boolean}
   */
  retryDeadLetter(itemId) {
    const idx = this.deadLetterQueue.findIndex(i => i.id === itemId);
    if (idx === -1) return false;
    const item = this.deadLetterQueue.splice(idx, 1)[0];
    item.status = 'queued';
    item.attempts = 0;
    item.error = null;
    item.updatedAt = new Date().toISOString();
    this.queue.push(item);
    this.sortQueue();
    this.saveQueueState();
    return true;
  }

  // ─── Persistence ────────────────────────────────────────────────────────

  /**
   * Save queue state to disk.
   */
  saveQueueState() {
    try {
      const state = {
        queue: this.queue,
        deadLetterQueue: this.deadLetterQueue,
        cronJobs: this.cronJobs,
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(QUEUE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error(`[DevBot Workflow] Failed to save queue state: ${e.message}`);
    }
  }

  /**
   * Load queue state from disk.
   */
  loadQueueState() {
    try {
      if (!existsSync(QUEUE_FILE)) return;
      const state = JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
      this.queue = (state.queue || []).filter(i => i.status === 'queued');
      this.deadLetterQueue = state.deadLetterQueue || [];
      this.cronJobs = state.cronJobs || [];
      this.sortQueue();
      console.log(`[DevBot Workflow] Loaded queue: ${this.queue.length} queued, ${this.deadLetterQueue.length} dead, ${this.cronJobs.length} cron jobs`);
    } catch (e) {
      console.error(`[DevBot Workflow] Failed to load queue state: ${e.message}`);
    }
  }
}

export { PRIORITY, PRIORITY_LABELS };
