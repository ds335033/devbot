/**
 * DevBot AI — Workflow REST API
 *
 * Endpoints for workflow management: start, status, list, cancel, retry,
 * templates, dashboard, triggers, and queue inspection.
 */

import { Router } from 'express';
import { WorkflowEngine, STATES } from '../workflows/engine.js';
import { WorkflowScheduler, PRIORITY } from '../workflows/scheduler.js';
import { TriggerManager, TRIGGER_TYPES } from '../workflows/triggers.js';
import { WorkflowDashboard } from '../workflows/dashboard.js';
import { getTemplate, listTemplates } from '../workflows/templates.js';

/** @type {WorkflowEngine} */
let workflowEngine;
/** @type {WorkflowScheduler} */
let scheduler;
/** @type {TriggerManager} */
let triggerManager;
/** @type {WorkflowDashboard} */
let dashboard;

/**
 * Register workflow API routes on the Express app.
 * @param {import('express').Express} app - Express app instance
 * @param {Object} services - Injected DevBot services (engine, github, slackBot)
 */
export function registerWorkflowRoutes(app, services = {}) {
  // Initialize workflow subsystem
  workflowEngine = new WorkflowEngine(services);
  scheduler = new WorkflowScheduler(workflowEngine);
  triggerManager = new TriggerManager(scheduler);
  dashboard = new WorkflowDashboard(workflowEngine, scheduler, triggerManager);

  // Start the scheduler
  scheduler.start();

  const router = Router();

  // ─── POST /api/workflows/start ──────────────────────────────────────────
  /**
   * Start a workflow from a template.
   * Body: { templateId: string, params: object, priority?: number }
   */
  router.post('/start', async (req, res) => {
    try {
      const { templateId, params, priority } = req.body;

      if (!templateId || typeof templateId !== 'string') {
        return res.status(400).json({ success: false, error: 'templateId is required (string)' });
      }

      const template = getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ success: false, error: `Template not found: ${templateId}` });
      }

      // Validate required params
      const missing = (template.requiredParams || []).filter(p => !params || params[p] === undefined);
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required parameters: ${missing.join(', ')}`,
          requiredParams: template.requiredParams,
        });
      }

      // Enqueue with priority or start directly
      if (priority !== undefined) {
        const item = scheduler.enqueue(templateId, params || {}, priority);
        return res.status(202).json({
          success: true,
          queued: true,
          queueItemId: item.id,
          templateId,
          priority: item.priority,
        });
      }

      const result = await workflowEngine.startWorkflow(template, params || {});
      res.status(202).json({
        success: true,
        workflowId: result.workflowId,
        state: result.state,
        templateId,
      });
    } catch (e) {
      console.error(`[DevBot Workflow] API /start error: ${e.message}`);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── GET /api/workflows/templates ───────────────────────────────────────
  /**
   * List all available workflow templates.
   */
  router.get('/templates', (req, res) => {
    try {
      const templates = listTemplates();
      res.json({ success: true, templates, count: templates.length });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── GET /api/workflows/dashboard ───────────────────────────────────────
  /**
   * Get aggregated dashboard stats.
   */
  router.get('/dashboard', (req, res) => {
    try {
      const data = dashboard.getData();
      res.json({ success: true, dashboard: data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── GET /api/workflows/queue ───────────────────────────────────────────
  /**
   * View queue status.
   */
  router.get('/queue', (req, res) => {
    try {
      const status = scheduler.getStatus();
      res.json({ success: true, queue: status });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── GET /api/workflows ────────────────────────────────────────────────
  /**
   * List all workflows with pagination and filters.
   * Query: ?state=COMPLETED&templateId=full-app-pipeline&limit=20&offset=0
   */
  router.get('/', (req, res) => {
    try {
      const { state, templateId, limit, offset } = req.query;

      // Validate state if provided
      if (state && !Object.values(STATES).includes(state)) {
        return res.status(400).json({
          success: false,
          error: `Invalid state. Valid states: ${Object.values(STATES).join(', ')}`,
        });
      }

      const result = workflowEngine.listWorkflows({
        state,
        templateId,
        limit: Math.min(parseInt(limit) || 50, 100),
        offset: parseInt(offset) || 0,
      });

      res.json({
        success: true,
        workflows: result.workflows.map(w => ({
          id: w.id,
          templateId: w.templateId,
          templateName: w.templateName,
          state: w.state,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          stepsTotal: w.steps?.length || 0,
          stepsCompleted: w.steps?.filter(s => s.state === 'COMPLETED').length || 0,
        })),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── GET /api/workflows/:id ────────────────────────────────────────────
  /**
   * Get full workflow status and details.
   */
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !id.startsWith('wf-')) {
        return res.status(400).json({ success: false, error: 'Invalid workflow ID format' });
      }

      const workflow = workflowEngine.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      res.json({ success: true, workflow });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── POST /api/workflows/:id/cancel ───────────────────────────────────
  /**
   * Cancel a running workflow.
   */
  router.post('/:id/cancel', (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !id.startsWith('wf-')) {
        return res.status(400).json({ success: false, error: 'Invalid workflow ID format' });
      }

      const cancelled = workflowEngine.cancelWorkflow(id);
      if (!cancelled) {
        return res.status(409).json({
          success: false,
          error: 'Workflow cannot be cancelled (not in a cancellable state or not found)',
        });
      }

      res.json({ success: true, workflowId: id, state: 'CANCELLED' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── POST /api/workflows/:id/retry ────────────────────────────────────
  /**
   * Retry a failed workflow by re-running it with the same params.
   */
  router.post('/:id/retry', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !id.startsWith('wf-')) {
        return res.status(400).json({ success: false, error: 'Invalid workflow ID format' });
      }

      const workflow = workflowEngine.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      if (workflow.state !== STATES.FAILED && workflow.state !== STATES.CANCELLED) {
        return res.status(409).json({
          success: false,
          error: `Cannot retry workflow in state: ${workflow.state}. Only FAILED or CANCELLED workflows can be retried.`,
        });
      }

      const template = getTemplate(workflow.templateId);
      if (!template) {
        return res.status(404).json({ success: false, error: `Template ${workflow.templateId} no longer available` });
      }

      const result = await workflowEngine.startWorkflow(template, workflow.params);
      res.status(202).json({
        success: true,
        originalWorkflowId: id,
        newWorkflowId: result.workflowId,
        state: result.state,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── POST /api/workflows/triggers ─────────────────────────────────────
  /**
   * Create a new event trigger.
   * Body: { name, type, filter, actions: [{ templateId, paramMapping, priority }] }
   */
  router.post('/triggers', (req, res) => {
    try {
      const { name, type, filter, actions } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Trigger name is required (min 2 chars)' });
      }

      if (!type || !TRIGGER_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid trigger type. Valid types: ${TRIGGER_TYPES.join(', ')}`,
        });
      }

      if (!actions || !Array.isArray(actions) || actions.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one action with templateId is required' });
      }

      // Validate each action's templateId
      for (const action of actions) {
        if (!action.templateId) {
          return res.status(400).json({ success: false, error: 'Each action must have a templateId' });
        }
        if (!getTemplate(action.templateId)) {
          return res.status(400).json({ success: false, error: `Unknown template: ${action.templateId}` });
        }
      }

      const trigger = triggerManager.createTrigger({ name: name.trim(), type, filter, actions });
      res.status(201).json({ success: true, trigger });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── GET /api/workflows/triggers (list) ────────────────────────────────
  router.get('/triggers/list', (req, res) => {
    try {
      const { type } = req.query;
      const triggers = triggerManager.listTriggers(type);
      res.json({ success: true, triggers, count: triggers.length });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ─── POST /api/workflows/triggers/fire ─────────────────────────────────
  /**
   * Manually fire a trigger event (for testing or manual triggers).
   * Body: { type, eventData }
   */
  router.post('/triggers/fire', (req, res) => {
    try {
      const { type, eventData } = req.body;
      if (!type) {
        return res.status(400).json({ success: false, error: 'Trigger type is required' });
      }

      const enqueued = triggerManager.fire(type, eventData || {});
      res.json({
        success: true,
        fired: enqueued.length,
        enqueued,
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Mount router
  app.use('/api/workflows', router);

  console.log('[DevBot Workflow] API routes registered at /api/workflows/*');

  // Return references for external use
  return { workflowEngine, scheduler, triggerManager, dashboard };
}
