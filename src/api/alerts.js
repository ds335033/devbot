/**
 * DevBotAI — Affiliate Alert System
 * Real-time Slack notifications + Zapier webhook for affiliate events
 */

import { WebClient } from '@slack/web-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

// ── Slack client (lazy-initialised so missing token doesn't crash startup) ──
let slack = null;
function getSlack() {
  if (!slack && process.env.SLACK_BOT_TOKEN) {
    slack = new WebClient(process.env.SLACK_BOT_TOKEN);
  }
  return slack;
}

// ── Tier badge helper ────────────────────────────────────────────────────────
const TIER_EMOJI = {
  platinum: ':trophy:',
  gold:     ':star:',
  silver:   ':medal:',
  bronze:   ':brown_circle:',
};
function tierBadge(tier = '') {
  const key = tier.toLowerCase();
  return `${TIER_EMOJI[key] ?? ':white_circle:'} ${tier.toUpperCase()}`;
}

// ── Persistent JSON store helpers ────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename, defaultValue) {
  const fp = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function writeJSON(filename, data) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// ── Zapier webhook helper ────────────────────────────────────────────────────
async function fireZapier(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[alerts] Zapier webhook failed:', err.message);
  }
}

// ── Slack send helper (never throws to caller) ───────────────────────────────
async function sendSlack(channel, blocks, text) {
  const client = getSlack();
  if (!client) {
    console.warn('[alerts] SLACK_BOT_TOKEN not set — skipping Slack notification');
    return;
  }
  try {
    await client.chat.postMessage({ channel, blocks, text });
  } catch (err) {
    console.error('[alerts] Slack error:', err.message);
  }
}

// ── Date utilities ───────────────────────────────────────────────────────────
function isoNow() {
  return new Date().toISOString();
}
function startOf(unit) {
  const d = new Date();
  if (unit === 'day')   return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  if (unit === 'week')  {
    const day = d.getDay();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).toISOString();
  }
  if (unit === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  return new Date(0).toISOString();
}

// ════════════════════════════════════════════════════════════════════════════
// Route registration
// ════════════════════════════════════════════════════════════════════════════
export function registerAlertRoutes(app) {

  // ── POST /api/alerts/click ─────────────────────────────────────────────
  app.post('/api/alerts/click', async (req, res) => {
    try {
      const {
        program     = 'Unknown',
        category    = 'General',
        tier        = 'Bronze',
        source      = 'direct',
        utm_campaign = '',
      } = req.body ?? {};

      // Persist click
      const clicks = readJSON('alert-clicks.json', []);
      const entry  = { program, category, tier, source, utm_campaign, timestamp: isoNow() };
      clicks.push(entry);
      writeJSON('alert-clicks.json', clicks);

      const totalClicks = clicks.filter(c => c.program === program).length;

      // Slack Block Kit message
      const blocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: ':mouse_trap: Affiliate Link Clicked!', emoji: true },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Program*\n${program}` },
            { type: 'mrkdwn', text: `*Category*\n${category}` },
            { type: 'mrkdwn', text: `*Tier*\n${tierBadge(tier)}` },
            { type: 'mrkdwn', text: `*Source*\n${source}` },
          ],
        },
        ...(utm_campaign ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `*UTM Campaign:* \`${utm_campaign}\`` },
        }] : []),
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `:bar_chart: *${totalClicks}* total clicks for *${program}*` },
            { type: 'mrkdwn', text: `:clock1: ${new Date().toUTCString()}` },
          ],
        },
      ];

      // Fire async side-effects — don't await in series so response is fast
      await Promise.all([
        sendSlack('#affiliate-clicks', blocks, `Affiliate click: ${program} (${tier})`),
        fireZapier(process.env.ZAPIER_WEBHOOK_URL, { event: 'affiliate_click', ...entry }),
      ]);

      return res.json({ success: true, totalClicks });
    } catch (err) {
      console.error('[alerts/click]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/alerts/subscribe ─────────────────────────────────────────
  app.post('/api/alerts/subscribe', async (req, res) => {
    try {
      const { email = '', source = 'unknown' } = req.body ?? {};

      if (!email) {
        return res.status(400).json({ success: false, error: 'email is required' });
      }

      // Persist subscriber
      const subscribers = readJSON('subscribers.json', []);
      const entry = { email, source, timestamp: isoNow() };
      subscribers.push(entry);
      writeJSON('subscribers.json', subscribers);

      const blocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: ':envelope: New Subscriber!', emoji: true },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Email*\n${email}` },
            { type: 'mrkdwn', text: `*Source*\n${source}` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `:busts_in_silhouette: *${subscribers.length}* total subscribers` },
            { type: 'mrkdwn', text: `:clock1: ${new Date().toUTCString()}` },
          ],
        },
      ];

      await Promise.all([
        sendSlack('#affiliate-subscribers', blocks, `New subscriber: ${email} via ${source}`),
        fireZapier(process.env.ZAPIER_WEBHOOK_URL, { event: 'new_subscriber', ...entry }),
      ]);

      return res.json({ success: true });
    } catch (err) {
      console.error('[alerts/subscribe]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── GET /api/alerts/stats ──────────────────────────────────────────────
  app.get('/api/alerts/stats', (req, res) => {
    try {
      const clicks      = readJSON('alert-clicks.json', []);
      const subscribers = readJSON('subscribers.json', []);

      const dayStart   = startOf('day');
      const weekStart  = startOf('week');
      const monthStart = startOf('month');

      const clicksToday = clicks.filter(c => c.timestamp >= dayStart).length;
      const clicksWeek  = clicks.filter(c => c.timestamp >= weekStart).length;
      const clicksMonth = clicks.filter(c => c.timestamp >= monthStart).length;

      // Top 10 programs by click count
      const programMap = {};
      for (const c of clicks) {
        programMap[c.program] = (programMap[c.program] ?? 0) + 1;
      }
      const topPrograms = Object.entries(programMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([program, count]) => ({ program, count }));

      // Clicks per category
      const categoryMap = {};
      for (const c of clicks) {
        categoryMap[c.category] = (categoryMap[c.category] ?? 0) + 1;
      }
      const clicksByCategory = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));

      return res.json({
        clicks: {
          today: clicksToday,
          week:  clicksWeek,
          month: clicksMonth,
          total: clicks.length,
        },
        topPrograms,
        clicksByCategory,
        subscribers: {
          total: subscribers.length,
        },
      });
    } catch (err) {
      console.error('[alerts/stats]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/alerts/conversion ────────────────────────────────────────
  app.post('/api/alerts/conversion', async (req, res) => {
    try {
      const {
        program       = 'Unknown',
        amount        = 0,
        commission    = 0,
        referral_code = '',
      } = req.body ?? {};

      // Update running revenue total
      const revenue = readJSON('alert-revenue.json', { total: 0, conversions: [] });
      revenue.total = parseFloat((revenue.total + parseFloat(commission)).toFixed(2));
      const entry = { program, amount, commission, referral_code, timestamp: isoNow() };
      revenue.conversions.push(entry);
      writeJSON('alert-revenue.json', revenue);

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: ':moneybag: :tada: Affiliate Conversion — Money In!',
            emoji: true,
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Program*\n${program}` },
            { type: 'mrkdwn', text: `*Sale Amount*\n:dollar: $${parseFloat(amount).toFixed(2)}` },
            { type: 'mrkdwn', text: `*Your Commission*\n:green_heart: *$${parseFloat(commission).toFixed(2)}*` },
            ...(referral_code ? [{ type: 'mrkdwn', text: `*Referral Code*\n\`${referral_code}\`` }] : []),
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:chart_with_upwards_trend: *Running Revenue Total: $${revenue.total.toFixed(2)}*`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `:clock1: ${new Date().toUTCString()}` },
            { type: 'mrkdwn', text: `:hash: ${revenue.conversions.length} total conversions` },
          ],
        },
      ];

      await Promise.all([
        sendSlack(
          '#affiliate-revenue',
          blocks,
          `Conversion! ${program} — $${parseFloat(commission).toFixed(2)} commission`
        ),
        fireZapier(process.env.ZAPIER_WEBHOOK_URL, { event: 'affiliate_conversion', ...entry, runningTotal: revenue.total }),
      ]);

      return res.json({ success: true, runningTotal: revenue.total });
    } catch (err) {
      console.error('[alerts/conversion]', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('[alerts] Routes registered: /api/alerts/{click,subscribe,stats,conversion}');
}
