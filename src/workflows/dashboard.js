/**
 * DevBot AI — Workflow Dashboard Data Aggregator
 *
 * Aggregates real-time metrics across the workflow engine, scheduler,
 * and trigger system. Provides success/failure rates, execution times,
 * revenue attribution, and system health data.
 */

/**
 * @typedef {Object} DashboardData
 * @property {Object} workflows - Workflow execution metrics
 * @property {Object} scheduler - Queue and scheduler status
 * @property {Object} triggers - Trigger fire counts and stats
 * @property {Object} performance - Step-type execution times
 * @property {Object} revenue - Revenue attribution per template
 * @property {Object} health - System health indicators
 */

export class WorkflowDashboard {
  /**
   * @param {import('./engine.js').WorkflowEngine} engine
   * @param {import('./scheduler.js').WorkflowScheduler} scheduler
   * @param {import('./triggers.js').TriggerManager} triggerManager
   */
  constructor(engine, scheduler, triggerManager) {
    this.engine = engine;
    this.scheduler = scheduler;
    this.triggerManager = triggerManager;
  }

  /**
   * Get the full dashboard data snapshot.
   * @returns {DashboardData}
   */
  getData() {
    const engineStats = this.engine.getDashboardStats();
    const schedulerStatus = this.scheduler.getStatus();
    const triggerStats = this.triggerManager.getStats();

    return {
      timestamp: new Date().toISOString(),
      workflows: {
        total: engineStats.total,
        active: engineStats.activeCount,
        byState: engineStats.byState,
        byTemplate: engineStats.byTemplate,
        avgDurationMs: engineStats.avgDurationMs,
        recentFailures: engineStats.recentFailures,
      },
      scheduler: {
        isRunning: schedulerStatus.isRunning,
        concurrentLimit: schedulerStatus.concurrentLimit,
        queueDepth: schedulerStatus.queue.total,
        queueByPriority: schedulerStatus.queue.byPriority,
        runningCount: schedulerStatus.running.count,
        runningItems: schedulerStatus.running.items,
        deadLetterCount: schedulerStatus.deadLetterQueue.count,
        recentDeadLetters: schedulerStatus.deadLetterQueue.recent,
        cronJobs: schedulerStatus.cronJobs,
      },
      triggers: triggerStats,
      performance: this.getPerformanceMetrics(),
      revenue: this.getRevenueAttribution(engineStats),
      health: this.getSystemHealth(engineStats, schedulerStatus),
    };
  }

  /**
   * Calculate average execution time per step type across all workflows.
   * @returns {Object}
   */
  getPerformanceMetrics() {
    const { workflows } = this.engine.listWorkflows({ limit: 500 });
    const stepTimes = {};

    for (const workflow of workflows) {
      if (!workflow.steps) continue;
      for (const step of workflow.steps) {
        if (!step.startedAt || !step.completedAt) continue;
        const duration = new Date(step.completedAt) - new Date(step.startedAt);
        if (!stepTimes[step.type]) {
          stepTimes[step.type] = { total: 0, count: 0, min: Infinity, max: 0 };
        }
        stepTimes[step.type].total += duration;
        stepTimes[step.type].count++;
        stepTimes[step.type].min = Math.min(stepTimes[step.type].min, duration);
        stepTimes[step.type].max = Math.max(stepTimes[step.type].max, duration);
      }
    }

    const result = {};
    for (const [type, data] of Object.entries(stepTimes)) {
      result[type] = {
        avgMs: data.count > 0 ? Math.round(data.total / data.count) : 0,
        minMs: data.min === Infinity ? 0 : data.min,
        maxMs: data.max,
        executions: data.count,
      };
    }

    return result;
  }

  /**
   * Calculate revenue attribution per workflow template.
   * Workflows with stripe_charge steps contribute to revenue.
   * @param {Object} engineStats
   * @returns {Object}
   */
  getRevenueAttribution(engineStats) {
    const { workflows } = this.engine.listWorkflows({ limit: 1000 });
    const revenue = {};

    for (const workflow of workflows) {
      if (workflow.state !== 'COMPLETED') continue;
      const templateKey = workflow.templateName || workflow.templateId;
      if (!revenue[templateKey]) {
        revenue[templateKey] = { totalRevenue: 0, transactions: 0, avgTransaction: 0 };
      }

      // Sum up stripe charge results
      if (workflow.results) {
        for (const result of Object.values(workflow.results)) {
          if (result && (result.charged || result.dryRun) && result.amount) {
            revenue[templateKey].totalRevenue += result.amount;
            revenue[templateKey].transactions++;
          }
        }
      }
    }

    // Calculate averages
    for (const data of Object.values(revenue)) {
      data.avgTransaction = data.transactions > 0
        ? Math.round(data.totalRevenue / data.transactions)
        : 0;
      // Convert cents to dollars for display
      data.totalRevenueDollars = (data.totalRevenue / 100).toFixed(2);
      data.avgTransactionDollars = (data.avgTransaction / 100).toFixed(2);
    }

    // Sort by revenue descending
    const sorted = Object.entries(revenue)
      .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)
      .map(([template, data]) => ({ template, ...data }));

    return {
      byTemplate: sorted,
      totalRevenue: sorted.reduce((sum, t) => sum + t.totalRevenue, 0),
      totalRevenueDollars: (sorted.reduce((sum, t) => sum + t.totalRevenue, 0) / 100).toFixed(2),
      totalTransactions: sorted.reduce((sum, t) => sum + t.transactions, 0),
    };
  }

  /**
   * Calculate system health indicators.
   * @param {Object} engineStats
   * @param {Object} schedulerStatus
   * @returns {Object}
   */
  getSystemHealth(engineStats, schedulerStatus) {
    const total = engineStats.total || 1; // avoid division by zero
    const failed = engineStats.byState?.FAILED || 0;
    const completed = engineStats.byState?.COMPLETED || 0;
    const errorRate = ((failed / total) * 100).toFixed(1);
    const successRate = ((completed / total) * 100).toFixed(1);

    const queueDepth = schedulerStatus.queue.total;
    const activeWorkers = schedulerStatus.running.count;
    const dlqCount = schedulerStatus.deadLetterQueue.count;

    // Health score: 100 = perfect, 0 = critical
    let healthScore = 100;
    if (parseFloat(errorRate) > 50) healthScore -= 40;
    else if (parseFloat(errorRate) > 25) healthScore -= 20;
    else if (parseFloat(errorRate) > 10) healthScore -= 10;

    if (queueDepth > 50) healthScore -= 20;
    else if (queueDepth > 20) healthScore -= 10;

    if (dlqCount > 20) healthScore -= 20;
    else if (dlqCount > 5) healthScore -= 10;

    healthScore = Math.max(0, healthScore);

    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 75) status = 'degraded';

    return {
      status,
      healthScore,
      errorRate: `${errorRate}%`,
      successRate: `${successRate}%`,
      queueDepth,
      activeWorkers,
      concurrentLimit: schedulerStatus.concurrentLimit,
      deadLetterCount: dlqCount,
      schedulerRunning: schedulerStatus.isRunning,
      uptime: process.uptime(),
    };
  }

  /**
   * Get a compact summary suitable for Slack notifications.
   * @returns {string}
   */
  getSummaryText() {
    const data = this.getData();
    const h = data.health;
    return [
      `DevBot Workflow Dashboard`,
      `Status: ${h.status.toUpperCase()} (score: ${h.healthScore}/100)`,
      `Workflows: ${data.workflows.total} total, ${data.workflows.active} active`,
      `Success rate: ${h.successRate} | Error rate: ${h.errorRate}`,
      `Queue: ${h.queueDepth} queued, ${h.activeWorkers}/${h.concurrentLimit} workers`,
      `Dead letters: ${h.deadLetterCount}`,
      `Triggers: ${data.triggers.totalTriggers} (${data.triggers.enabledTriggers} enabled, ${data.triggers.totalFires} total fires)`,
      `Revenue: $${data.revenue.totalRevenueDollars} across ${data.revenue.totalTransactions} transactions`,
    ].join('\n');
  }
}
