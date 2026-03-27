/**
 * DevBot AI — Automated Trading Scheduler
 *
 * Executes trading strategies on a fixed interval.
 * Default: $25 DCA trades every 8 minutes.
 *
 * Usage:
 *   import { startScheduler, stopScheduler } from './scheduler.js';
 *   startScheduler({ email, pair, amount, interval, strategy });
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/trading');
mkdirSync(DATA_DIR, { recursive: true });

function loadJson(file, defaults) {
  const path = resolve(DATA_DIR, file);
  if (!existsSync(path)) { writeFileSync(path, JSON.stringify(defaults, null, 2)); return defaults; }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveJson(file, data) {
  writeFileSync(resolve(DATA_DIR, file), JSON.stringify(data, null, 2));
}

function log(msg) {
  console.log(`[Scheduler ${new Date().toISOString()}] ${msg}`);
}

// Active scheduler intervals
const activeSchedulers = new Map();

/**
 * Start an automated trading scheduler
 * @param {object} config
 * @param {string} config.email - User email
 * @param {string} config.pair - Trading pair (e.g. 'ETH/USDC')
 * @param {number} config.amountCents - Amount per trade in cents (e.g. 2500 = $25)
 * @param {number} config.intervalMs - Interval in milliseconds (e.g. 480000 = 8 minutes)
 * @param {string} config.strategy - Strategy: 'dca', 'momentum', 'grid'
 * @param {string} config.network - Network: 'base', 'base-sepolia'
 */
export function startScheduler(config) {
  const {
    email,
    pair = 'ETH/USDC',
    amountCents = 2500,       // $25 in cents
    intervalMs = 8 * 60 * 1000, // 8 minutes
    strategy = 'dca',
    network = 'base-sepolia',
  } = config;

  const schedulerId = `sched_${crypto.randomUUID().slice(0, 10)}`;
  const intervalMinutes = Math.round(intervalMs / 60000);

  log(`Starting scheduler ${schedulerId}: $${amountCents/100} ${pair} every ${intervalMinutes}min (${strategy}) on ${network}`);

  // Track scheduler
  const db = loadJson('schedulers.json', { active: [], history: [] });

  const schedulerInfo = {
    id: schedulerId,
    email,
    pair,
    amountCents,
    amountDisplay: `$${(amountCents / 100).toFixed(2)}`,
    intervalMs,
    intervalDisplay: `${intervalMinutes} minutes`,
    strategy,
    network,
    status: 'running',
    totalTrades: 0,
    totalSpent: 0,
    startedAt: new Date().toISOString(),
    lastTradeAt: null,
    nextTradeAt: new Date(Date.now() + intervalMs).toISOString(),
  };

  db.active.push(schedulerInfo);
  saveJson('schedulers.json', db);

  // Execute trade function
  async function executeTrade() {
    const tradeId = `auto_${crypto.randomUUID().slice(0, 12)}`;
    const [fromToken, toToken] = pair.split('/').reverse(); // ETH/USDC → buy ETH with USDC
    const buyToken = pair.split('/')[0];
    const sellToken = pair.split('/')[1] || 'USDC';

    log(`[${schedulerId}] Executing trade #${schedulerInfo.totalTrades + 1}: $${amountCents/100} ${sellToken} → ${buyToken}`);

    try {
      // Try to use AgentKit for live trading
      const { AgentKit } = await import('./agentkit.js');

      let result;
      if (strategy === 'dca') {
        result = await AgentKit.executeDCA(email, {
          pair,
          amount: amountCents.toString(),
          network,
        });
      } else if (strategy === 'momentum') {
        result = await AgentKit.executeMomentum(email, {
          pair,
          amount: amountCents.toString(),
          network,
        });
      } else {
        // Default to DCA for scheduled trades
        result = await AgentKit.executeDCA(email, {
          pair,
          amount: amountCents.toString(),
          network,
        });
      }

      // Update scheduler stats
      schedulerInfo.totalTrades++;
      schedulerInfo.totalSpent += amountCents;
      schedulerInfo.lastTradeAt = new Date().toISOString();
      schedulerInfo.nextTradeAt = new Date(Date.now() + intervalMs).toISOString();

      // Save updated stats
      const updatedDb = loadJson('schedulers.json', { active: [], history: [] });
      const idx = updatedDb.active.findIndex(s => s.id === schedulerId);
      if (idx >= 0) updatedDb.active[idx] = schedulerInfo;
      saveJson('schedulers.json', updatedDb);

      // Log the trade
      const tradeLog = loadJson('auto_trades.json', { trades: [] });
      tradeLog.trades.push({
        id: tradeId,
        schedulerId,
        email,
        pair,
        amount: amountCents,
        amountDisplay: `$${(amountCents / 100).toFixed(2)}`,
        strategy,
        network,
        result: result?.transactionHash || result?.status || 'executed',
        tradeNumber: schedulerInfo.totalTrades,
        executedAt: new Date().toISOString(),
      });
      saveJson('auto_trades.json', tradeLog);

      log(`[${schedulerId}] Trade #${schedulerInfo.totalTrades} complete. Total spent: $${(schedulerInfo.totalSpent/100).toFixed(2)}`);

    } catch (err) {
      log(`[${schedulerId}] Trade failed: ${err.message}`);

      // Log failed trade
      const tradeLog = loadJson('auto_trades.json', { trades: [] });
      tradeLog.trades.push({
        id: tradeId,
        schedulerId,
        email,
        pair,
        amount: amountCents,
        strategy,
        network,
        error: err.message,
        status: 'failed',
        executedAt: new Date().toISOString(),
      });
      saveJson('auto_trades.json', tradeLog);
    }
  }

  // Execute first trade immediately
  executeTrade();

  // Set up recurring interval
  const intervalHandle = setInterval(executeTrade, intervalMs);
  activeSchedulers.set(schedulerId, { handle: intervalHandle, info: schedulerInfo });

  return schedulerInfo;
}

/**
 * Stop a running scheduler
 */
export function stopScheduler(schedulerId) {
  const scheduler = activeSchedulers.get(schedulerId);
  if (!scheduler) return { success: false, error: 'Scheduler not found or already stopped.' };

  clearInterval(scheduler.handle);
  activeSchedulers.delete(schedulerId);

  // Update status in DB
  const db = loadJson('schedulers.json', { active: [], history: [] });
  const idx = db.active.findIndex(s => s.id === schedulerId);
  if (idx >= 0) {
    const stopped = db.active.splice(idx, 1)[0];
    stopped.status = 'stopped';
    stopped.stoppedAt = new Date().toISOString();
    db.history.push(stopped);
    saveJson('schedulers.json', db);
  }

  log(`Scheduler ${schedulerId} stopped`);
  return { success: true, message: `Scheduler ${schedulerId} stopped.` };
}

/**
 * Stop all running schedulers
 */
export function stopAllSchedulers() {
  const ids = [...activeSchedulers.keys()];
  ids.forEach(id => stopScheduler(id));
  log(`All ${ids.length} schedulers stopped`);
  return { stopped: ids.length };
}

/**
 * List all active schedulers
 */
export function listSchedulers() {
  const db = loadJson('schedulers.json', { active: [], history: [] });
  return {
    active: db.active.filter(s => s.status === 'running'),
    history: db.history.slice(-20),
    runningInMemory: activeSchedulers.size,
  };
}

/**
 * Get auto-trade history
 */
export function getAutoTradeHistory(email, limit = 50) {
  const db = loadJson('auto_trades.json', { trades: [] });
  return db.trades
    .filter(t => !email || t.email === email)
    .slice(-limit)
    .reverse();
}


// ─── Express Route Registration ──────────────────────────────────────────────

export function registerSchedulerRoutes(app) {

  // POST /api/scheduler/start — start auto-trading
  app.post('/api/scheduler/start', (req, res) => {
    const { email, pair, amount, intervalMinutes, strategy, network } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    const scheduler = startScheduler({
      email,
      pair: pair || 'ETH/USDC',
      amountCents: amount || 2500, // Default $25
      intervalMs: (intervalMinutes || 8) * 60 * 1000, // Default 8 minutes
      strategy: strategy || 'dca',
      network: network || 'base-sepolia',
    });

    res.json({
      success: true,
      scheduler,
      message: `Auto-trader started! $${(scheduler.amountCents/100).toFixed(2)} ${scheduler.pair} every ${scheduler.intervalDisplay} using ${scheduler.strategy} strategy.`,
    });
  });

  // POST /api/scheduler/stop/:id — stop a scheduler
  app.post('/api/scheduler/stop/:id', (req, res) => {
    const result = stopScheduler(req.params.id);
    res.json(result);
  });

  // POST /api/scheduler/stop-all — emergency stop all
  app.post('/api/scheduler/stop-all', (req, res) => {
    const result = stopAllSchedulers();
    res.json({ success: true, ...result, message: 'All auto-traders stopped.' });
  });

  // GET /api/scheduler/list — list all schedulers
  app.get('/api/scheduler/list', (req, res) => {
    res.json({ success: true, ...listSchedulers() });
  });

  // GET /api/scheduler/trades/:email — auto-trade history
  app.get('/api/scheduler/trades/:email', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const trades = getAutoTradeHistory(req.params.email, limit);
    res.json({ success: true, trades, total: trades.length });
  });

  log('Scheduler routes registered');
}
