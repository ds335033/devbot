/**
 * DevBot Zapier Integration
 *
 * Webhook endpoints for Zapier automation:
 * - Inbound: Zapier sends events TO DevBot (triggers actions)
 * - Outbound: DevBot sends events TO Zapier (via webhook URLs)
 *
 * Supported automations:
 * 1. Slack ↔ GitHub: Issues from Slack, PR notifications
 * 2. Gmail → Slack: Forward important emails
 * 3. GitHub → DevBot: Auto-generate/review code on events
 * 4. Canva → Slack/Gmail: Design notifications
 */

const ZAPIER_SECRET = process.env.ZAPIER_WEBHOOK_SECRET;
if (!ZAPIER_SECRET) {
  console.warn('[DevBot] WARNING: ZAPIER_WEBHOOK_SECRET not set. Zapier endpoints are DISABLED until this is configured.');
}

// Outbound webhook URLs (set these after creating Zaps)
const ZAPIER_HOOKS = {
  slackNotify: process.env.ZAPIER_HOOK_SLACK_NOTIFY || '',
  gmailSend: process.env.ZAPIER_HOOK_GMAIL_SEND || '',
  githubIssue: process.env.ZAPIER_HOOK_GITHUB_ISSUE || '',
  canvaNotify: process.env.ZAPIER_HOOK_CANVA_NOTIFY || '',
};

// Auth middleware for Zapier webhooks — requires matching secret header
function verifyZapier(req, res, next) {
  if (!ZAPIER_SECRET) {
    return res.status(503).json({ error: 'Zapier integration not configured. Set ZAPIER_WEBHOOK_SECRET env var.' });
  }
  const secret = req.headers['x-zapier-secret'] || req.query.secret;
  if (secret === ZAPIER_SECRET) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Provide x-zapier-secret header.' });
}

// Send event to a Zapier webhook URL
async function sendToZapier(hookName, data) {
  const url = ZAPIER_HOOKS[hookName];
  if (!url) {
    console.log(`[Zapier] No webhook URL configured for ${hookName}`);
    return null;
  }
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        source: 'devbot',
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`[Zapier] Sent to ${hookName}: ${resp.status}`);
    return resp.ok;
  } catch (err) {
    console.error(`[Zapier] Failed to send to ${hookName}:`, err.message);
    return false;
  }
}

export function registerZapierRoutes(app, engine, github) {

  // ===== INBOUND WEBHOOKS (Zapier → DevBot) =====

  /**
   * GitHub Event → DevBot
   * Zapier trigger: New GitHub issue/PR/commit
   * DevBot action: Auto-generate code, review PR, or post to Slack
   */
  app.post('/api/zapier/github', verifyZapier, async (req, res) => {
    try {
      const { event, repo, title, body, number, action, sender } = req.body;
      console.log(`[Zapier] GitHub event: ${event} on ${repo} by ${sender}`);

      let result = {};

      switch (event) {
        case 'issue_opened':
          // Auto-generate code based on issue description
          if (body && body.toLowerCase().includes('[devbot]')) {
            const generated = await engine.generateApp({ prompt: body });
            result = { action: 'code_generated', files: Object.keys(generated.files || {}).length };
            // Notify via Zapier → Slack
            await sendToZapier('slackNotify', {
              channel: '#devbot-activity',
              text: `🤖 DevBot auto-generated code for issue #${number}: "${title}" (${Object.keys(generated.files || {}).length} files)`,
            });
          }
          break;

        case 'pull_request':
          // Auto-review PR code
          if (action === 'opened' || action === 'synchronize') {
            result = { action: 'pr_review_queued', pr: number };
            await sendToZapier('slackNotify', {
              channel: '#code-reviews',
              text: `📝 New PR #${number} on ${repo}: "${title}" — DevBot review queued`,
            });
          }
          break;

        case 'push':
          // Notify Slack about new commits
          await sendToZapier('slackNotify', {
            channel: '#github-activity',
            text: `🔨 New push to ${repo} by ${sender}: "${title || 'commit'}"`,
          });
          result = { action: 'push_notified' };
          break;

        default:
          result = { action: 'logged', event };
      }

      res.json({ success: true, result });
    } catch (err) {
      console.error('[Zapier] GitHub webhook error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Gmail Event → DevBot
   * Zapier trigger: New email matching filter
   * DevBot action: Forward to Slack, create GitHub issue, or auto-respond
   */
  app.post('/api/zapier/gmail', verifyZapier, async (req, res) => {
    try {
      const { from, subject, body, labels, date } = req.body;
      console.log(`[Zapier] Gmail event: "${subject}" from ${from}`);

      const result = {};

      // Forward to Slack
      await sendToZapier('slackNotify', {
        channel: '#email-feed',
        text: `📧 New email from ${from}\n*Subject:* ${subject}\n*Date:* ${date}\n_Labels: ${(labels || []).join(', ')}_`,
      });

      // If it's a bug report email, create GitHub issue
      if (subject && (subject.toLowerCase().includes('bug') || subject.toLowerCase().includes('issue'))) {
        await sendToZapier('githubIssue', {
          repo: 'ds335033/devbot',
          title: `[Email] ${subject}`,
          body: `Reported by: ${from}\nDate: ${date}\n\n${(body || '').slice(0, 1000)}`,
          labels: ['bug', 'email-report'],
        });
        result.githubIssue = true;
      }

      res.json({ success: true, forwarded: true, ...result });
    } catch (err) {
      console.error('[Zapier] Gmail webhook error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Slack Event → DevBot
   * Zapier trigger: New message in specific channel or with keyword
   * DevBot action: Create GitHub issue, generate code, or trigger workflow
   */
  app.post('/api/zapier/slack', verifyZapier, async (req, res) => {
    try {
      const { text, user, channel, timestamp } = req.body;
      console.log(`[Zapier] Slack event: "${text?.slice(0, 50)}" from ${user} in ${channel}`);

      const result = {};

      // Create GitHub issue from Slack
      if (text && text.toLowerCase().startsWith('!issue ')) {
        const issueTitle = text.replace(/^!issue\s+/i, '').trim();
        await sendToZapier('githubIssue', {
          repo: 'ds335033/devbot',
          title: issueTitle,
          body: `Created from Slack by ${user}\nChannel: ${channel}\nTimestamp: ${timestamp}`,
          labels: ['slack-created'],
        });
        result.action = 'github_issue_created';
        result.title = issueTitle;
      }

      // Trigger DevBot code generation
      if (text && text.toLowerCase().startsWith('!generate ')) {
        const prompt = text.replace(/^!generate\s+/i, '').trim();
        const generated = await engine.generateApp({ prompt });
        result.action = 'code_generated';
        result.files = Object.keys(generated.files || {}).length;

        await sendToZapier('slackNotify', {
          channel: channel,
          text: `🤖 DevBot generated ${result.files} files from your request!`,
        });
      }

      // Forward to email
      if (text && text.toLowerCase().startsWith('!email ')) {
        const emailContent = text.replace(/^!email\s+/i, '').trim();
        await sendToZapier('gmailSend', {
          to: 'guitargiveawaychannel345@gmail.com',
          subject: `[Slack → Email] From ${user}`,
          body: emailContent,
        });
        result.action = 'email_sent';
      }

      res.json({ success: true, ...result });
    } catch (err) {
      console.error('[Zapier] Slack webhook error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Canva Event → DevBot
   * Zapier trigger: New/updated Canva design
   * DevBot action: Notify Slack, send email
   */
  app.post('/api/zapier/canva', verifyZapier, async (req, res) => {
    try {
      const { designId, designName, designUrl, action: designAction, updatedBy } = req.body;
      console.log(`[Zapier] Canva event: ${designAction} "${designName}"`);

      // Notify Slack
      await sendToZapier('slackNotify', {
        channel: '#design-updates',
        text: `🎨 Canva ${designAction}: "${designName}" by ${updatedBy || 'unknown'}\n${designUrl || ''}`,
      });

      // Send email notification for published designs
      if (designAction === 'published' || designAction === 'completed') {
        await sendToZapier('gmailSend', {
          to: 'guitargiveawaychannel345@gmail.com',
          subject: `[Canva] Design ${designAction}: ${designName}`,
          body: `Design "${designName}" has been ${designAction}.\n\nView: ${designUrl || 'N/A'}\nUpdated by: ${updatedBy || 'N/A'}`,
        });
      }

      res.json({ success: true, notified: true });
    } catch (err) {
      console.error('[Zapier] Canva webhook error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== OUTBOUND HELPER (DevBot → Zapier) =====

  /**
   * Manual trigger — send any event to a Zapier webhook
   * POST /api/zapier/send { hook: "slackNotify", data: {...} }
   */
  app.post('/api/zapier/send', verifyZapier, async (req, res) => {
    try {
      const { hook, data } = req.body;
      if (!hook || !data) {
        return res.status(400).json({ error: 'Provide "hook" name and "data" object' });
      }
      const sent = await sendToZapier(hook, data);
      res.json({ success: true, sent });
    } catch (err) {
      console.error('[Zapier] Send error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== STATUS =====

  app.get('/api/zapier/status', (req, res) => {
    const configured = {};
    for (const [name, url] of Object.entries(ZAPIER_HOOKS)) {
      configured[name] = url ? 'configured' : 'not set';
    }
    res.json({
      status: 'Zapier integration active',
      endpoints: {
        inbound: [
          'POST /api/zapier/github — GitHub events',
          'POST /api/zapier/gmail — Gmail events',
          'POST /api/zapier/slack — Slack events',
          'POST /api/zapier/canva — Canva events',
        ],
        outbound: 'POST /api/zapier/send — Send to any configured hook',
      },
      hooks: configured,
      auth: 'x-zapier-secret header or ?secret= query param',
    });
  });

  console.log('[DevBot] Zapier integration routes registered');
}

// Export helper for use in other modules
export { sendToZapier };
