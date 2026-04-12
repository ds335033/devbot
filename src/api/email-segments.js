/**
 * DevBotAI — Segmented Email Marketing System
 * Tracks user interests, segments subscribers, generates targeted emails
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Segment Configuration ────────────────────────────────────────────────────

const SEGMENT_CONFIG = {
  ai_enthusiast: {
    display_name: 'AI Enthusiast',
    description: 'Users who actively click and explore AI tools and platforms',
    email_subject_template: '🤖 AI Tool of the Week — {{tool_name}} is changing the game',
    recommended_programs: ['ai', 'automation', 'productivity'],
    send_frequency: 'weekly',
    best_send_day: 'Tuesday',
  },
  techie: {
    display_name: 'Techie',
    description: 'Developers and sysadmins interested in hosting, cloud, and DevOps',
    email_subject_template: '🖥️ Best Hosting & DevOps Deals — Save on {{program_name}} this week',
    recommended_programs: ['hosting', 'cloud', 'devops', 'vpn'],
    send_frequency: 'weekly',
    best_send_day: 'Wednesday',
  },
  investor: {
    display_name: 'Investor',
    description: 'Finance-minded users clicking crypto, trading, and investment programs',
    email_subject_template: '📈 Crypto & Finance Weekly — {{highlight}} you need to see',
    recommended_programs: ['finance', 'crypto', 'trading', 'investing'],
    send_frequency: 'weekly',
    best_send_day: 'Monday',
  },
  marketer: {
    display_name: 'Marketer',
    description: 'Digital marketers exploring email tools, SEO, and growth platforms',
    email_subject_template: '📣 Marketing Stack Update — Top picks for {{month}}',
    recommended_programs: ['marketing', 'email', 'seo', 'social'],
    send_frequency: 'weekly',
    best_send_day: 'Thursday',
  },
  learner: {
    display_name: 'Learner',
    description: 'Users focused on education, courses, and skill-building platforms',
    email_subject_template: '🎓 Learn & Earn This Week — New courses + easy affiliate wins',
    recommended_programs: ['education', 'courses', 'ebooks', 'affiliate'],
    send_frequency: 'biweekly',
    best_send_day: 'Sunday',
  },
  power_user: {
    display_name: 'Power User',
    description: 'Highly engaged users who click across many categories',
    email_subject_template: '⚡ VIP Deals — Highest-commission picks, just for you',
    recommended_programs: ['ai', 'hosting', 'finance', 'marketing', 'education'],
    send_frequency: 'weekly',
    best_send_day: 'Friday',
  },
};

// ─── Category → Segment Mapping ───────────────────────────────────────────────

const CATEGORY_SEGMENT_MAP = {
  ai: 'ai_enthusiast',
  automation: 'ai_enthusiast',
  productivity: 'ai_enthusiast',
  hosting: 'techie',
  cloud: 'techie',
  devops: 'techie',
  vpn: 'techie',
  finance: 'investor',
  crypto: 'investor',
  trading: 'investor',
  investing: 'investor',
  marketing: 'marketer',
  email: 'marketer',
  seo: 'marketer',
  social: 'marketer',
  education: 'learner',
  courses: 'learner',
  ebooks: 'learner',
  affiliate: 'learner',
};

// ─── Source Page → Default Interests Mapping ─────────────────────────────────

const SOURCE_INTERESTS_MAP = {
  'ai-tools': ['ai', 'automation'],
  'hosting-deals': ['hosting', 'cloud'],
  'crypto-page': ['crypto', 'finance'],
  'marketing-tools': ['marketing', 'seo'],
  'courses-page': ['education', 'courses'],
  'homepage': [],
  'blog': [],
};

// ─── Data Helpers ─────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '../../data');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const EMAIL_LOG_FILE = path.join(DATA_DIR, 'email-log.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSubscribers() {
  ensureDataDir();
  if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeSubscribers(subscribers) {
  ensureDataDir();
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

function readEmailLog() {
  ensureDataDir();
  if (!fs.existsSync(EMAIL_LOG_FILE)) {
    fs.writeFileSync(EMAIL_LOG_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(EMAIL_LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeEmailLog(log) {
  ensureDataDir();
  fs.writeFileSync(EMAIL_LOG_FILE, JSON.stringify(log, null, 2));
}

function generateSubscriberId(email) {
  const ts = Date.now().toString(36);
  const hash = Buffer.from(email).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 8);
  return `sub_${hash}_${ts}`;
}

// ─── Segmentation Logic ───────────────────────────────────────────────────────

function computeSegments(interests, clickHistory) {
  const segments = new Set();

  // Count clicks per mapped segment
  const segmentClickCounts = {};
  const allClicks = [...(interests || []), ...(clickHistory || []).map(c => c.category)];

  for (const category of allClicks) {
    const seg = CATEGORY_SEGMENT_MAP[category];
    if (seg) {
      segmentClickCounts[seg] = (segmentClickCounts[seg] || 0) + 1;
    }
  }

  // Assign segments based on thresholds
  for (const [seg, count] of Object.entries(segmentClickCounts)) {
    if (count >= 2) {
      segments.add(seg);
    }
  }

  // Power user: 5+ clicks across any category
  if (allClicks.length >= 5) {
    segments.add('power_user');
  }

  return Array.from(segments);
}

function autoSegmentFromSource(source) {
  const interests = SOURCE_INTERESTS_MAP[source] || [];
  return interests;
}

// ─── Email Template Generators ────────────────────────────────────────────────

const PROGRAM_CARDS_BY_SEGMENT = {
  ai_enthusiast: [
    { name: 'Jasper AI', desc: 'AI writing assistant trusted by 100k+ marketers', commission: '30% recurring', url: '#jasper', badge: 'Top Pick' },
    { name: 'Copy.ai', desc: 'Generate copy for ads, emails, and landing pages instantly', commission: '$24/sale', url: '#copyai', badge: 'Popular' },
    { name: 'Midjourney', desc: 'AI image generation for creatives and designers', commission: '20% recurring', url: '#midjourney', badge: 'Trending' },
    { name: 'Notion AI', desc: 'Your second brain, now with AI superpowers built in', commission: '$10/signup', url: '#notion', badge: 'Easy Sell' },
  ],
  techie: [
    { name: 'Cloudways', desc: 'Managed cloud hosting with 1-click deployments', commission: 'Up to $200/signup', url: '#cloudways', badge: 'Top Pick' },
    { name: 'DigitalOcean', desc: 'Developer-friendly cloud infrastructure at scale', commission: '$25/signup', url: '#do', badge: 'Dev Favorite' },
    { name: 'NordVPN', desc: 'Industry-leading VPN used by millions worldwide', commission: '40% recurring', url: '#nordvpn', badge: 'High EPC' },
    { name: 'Kinsta', desc: 'Premium managed WordPress hosting on Google Cloud', commission: 'Up to $500/sale', url: '#kinsta', badge: 'Big Commission' },
  ],
  investor: [
    { name: 'Coinbase', desc: 'The most trusted crypto exchange — refer & earn', commission: '$10/signup', url: '#coinbase', badge: 'Top Pick' },
    { name: 'eToro', desc: 'Social trading platform with copy-trading features', commission: '$200/deposit', url: '#etoro', badge: 'High Value' },
    { name: 'Ledger', desc: 'Hardware crypto wallets for serious holders', commission: '10% per sale', url: '#ledger', badge: 'Trending' },
    { name: 'Binance', desc: 'World\'s largest crypto exchange by volume', commission: '20-40% trading fees', url: '#binance', badge: 'Mega Volume' },
  ],
  marketer: [
    { name: 'ActiveCampaign', desc: 'Email automation that converts — used by 180k+ businesses', commission: '20-30% recurring', url: '#activecampaign', badge: 'Top Pick' },
    { name: 'SEMrush', desc: 'All-in-one SEO and competitive research platform', commission: '40% recurring', url: '#semrush', badge: 'High Recurring' },
    { name: 'ConvertKit', desc: 'Email for creators — simple, powerful, and proven', commission: '30% recurring', url: '#convertkit', badge: 'Popular' },
    { name: 'ClickFunnels', desc: 'Build high-converting sales funnels without code', commission: '40% recurring', url: '#clickfunnels', badge: 'Big Commissions' },
  ],
  learner: [
    { name: 'Coursera', desc: 'World-class courses from top universities and companies', commission: '45% per sale', url: '#coursera', badge: 'Top Pick' },
    { name: 'Skillshare', desc: 'Creative skills platform with thousands of classes', commission: '$10/trial', url: '#skillshare', badge: 'Easy Conversions' },
    { name: 'Udemy', desc: 'Massive course library across every skill category', commission: '15% per sale', url: '#udemy', badge: 'High Volume' },
    { name: 'MasterClass', desc: 'Learn from the world\'s best in their fields', commission: '25% per sale', url: '#masterclass', badge: 'Premium' },
  ],
  power_user: [
    { name: 'Jasper AI', desc: 'Top-converting AI writing affiliate — 30% recurring', commission: '30% recurring', url: '#jasper', badge: 'VIP Pick' },
    { name: 'Cloudways', desc: 'Highest EPC in hosting — up to $200 per signup', commission: 'Up to $200/signup', url: '#cloudways', badge: 'VIP Pick' },
    { name: 'eToro', desc: 'Finance leader with $200 CPA on first deposits', commission: '$200/deposit', url: '#etoro', badge: 'VIP Pick' },
    { name: 'SEMrush', desc: '40% recurring lifetime — marketers love it', commission: '40% recurring', url: '#semrush', badge: 'VIP Pick' },
    { name: 'Coursera', desc: 'Massive volume + 45% commission = easy money', commission: '45% per sale', url: '#coursera', badge: 'VIP Pick' },
  ],
};

function buildProgramCard(program) {
  return `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <h3 style="margin:0;font-size:16px;color:#111827;">${program.name}</h3>
        <span style="background:#6366f1;color:#fff;font-size:11px;padding:3px 10px;border-radius:99px;">${program.badge}</span>
      </div>
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563;">${program.desc}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:600;color:#059669;">Commission: ${program.commission}</span>
        <a href="${program.url}" style="background:#6366f1;color:#fff;text-decoration:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;">Promote Now →</a>
      </div>
    </div>`;
}

function buildEmailHTML({ segment, subject, previewText, headerTitle, intro, programs, ctaText, ctaUrl }) {
  const cards = programs.map(buildProgramCard).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">DevBotAI</div>
              <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;">${headerTitle}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${intro}</p>

              ${cards}

              <!-- CTA -->
              <div style="text-align:center;margin:32px 0 16px;">
                <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;">
                  ${ctaText}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">You're receiving this because you subscribed to DevBotAI updates.</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="https://devbotai.com/unsubscribe?email={{email}}" style="color:#6366f1;text-decoration:none;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="https://devbotai.com" style="color:#6366f1;text-decoration:none;">Visit DevBotAI</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const EMAIL_TEMPLATES = {
  ai_enthusiast: {
    subject: '🤖 AI Tool of the Week — Top picks to promote right now',
    previewText: 'The hottest AI affiliate programs with the highest commissions this week.',
    headerTitle: 'AI Tool of the Week',
    intro: 'You\'ve been exploring AI tools — great taste. Here are the top AI affiliate programs converting best right now. Each one pays recurring commissions, meaning you earn every month your referrals stay subscribed.',
    ctaText: 'Browse All AI Programs →',
    ctaUrl: 'https://devbotai.com/programs?category=ai',
  },
  techie: {
    subject: '🖥️ Best Hosting & DevOps Deals — High-EPC programs this week',
    previewText: 'Hosting affiliate programs with some of the highest EPCs in the industry.',
    headerTitle: 'Hosting & DevOps Picks',
    intro: 'Fellow tech lover — hosting affiliates are some of the highest-paying in the industry. These programs pay per signup, not per purchase, which means easy conversions from your developer audience.',
    ctaText: 'See All Hosting Programs →',
    ctaUrl: 'https://devbotai.com/programs?category=hosting',
  },
  investor: {
    subject: '📈 Crypto & Finance Weekly — Top programs paying up to $200 CPA',
    previewText: 'Finance affiliate programs with massive CPA payouts and a hungry audience.',
    headerTitle: 'Crypto & Finance Weekly',
    intro: 'The finance and crypto niche has some of the most lucrative affiliate programs available. Here are the top picks this week — high intent buyers, massive CPAs, and global appeal.',
    ctaText: 'View All Finance Programs →',
    ctaUrl: 'https://devbotai.com/programs?category=finance',
  },
  marketer: {
    subject: '📣 Marketing Stack Update — Best tools to promote this week',
    previewText: 'Recurring commission marketing tools your audience already wants to use.',
    headerTitle: 'Marketing Stack Update',
    intro: 'As a marketer yourself, you know the power of great tools. These affiliate programs sell themselves to your audience — and they pay recurring commissions month after month.',
    ctaText: 'Explore Marketing Programs →',
    ctaUrl: 'https://devbotai.com/programs?category=marketing',
  },
  learner: {
    subject: '🎓 Learn & Earn This Week — Top education affiliates + easy wins',
    previewText: 'Education affiliate programs that convert easily with generous commissions.',
    headerTitle: 'Learn & Earn This Week',
    intro: 'Education is a booming affiliate niche — people are always looking to upskill, and these platforms make it easy to earn while helping them do it. High conversion rates, generous payouts.',
    ctaText: 'Browse Education Programs →',
    ctaUrl: 'https://devbotai.com/programs?category=education',
  },
  power_user: {
    subject: '⚡ VIP Deals — Highest-commission picks across every category',
    previewText: 'Exclusive roundup of the top-paying affiliate programs across AI, hosting, finance, and more.',
    headerTitle: '⚡ VIP Affiliate Picks',
    intro: 'You\'re one of our most active members, so you get the good stuff. This is our curated VIP roundup — the absolute highest-commission programs across every category we track. Pick your niche and start promoting.',
    ctaText: 'See All VIP Programs →',
    ctaUrl: 'https://devbotai.com/programs?filter=top-commission',
  },
};

// ─── Route Registration ───────────────────────────────────────────────────────

function registerEmailSegmentRoutes(app) {

  // ── 1. POST /api/subscribe ─────────────────────────────────────────────────
  app.post('/api/subscribe', (req, res) => {
    try {
      const { email, source, interests = [] } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid email required' });
      }

      const subscribers = readSubscribers();
      const existing = subscribers.find(s => s.email === email);

      // Merge source-derived interests
      const sourceInterests = autoSegmentFromSource(source);
      const mergedInterests = Array.from(new Set([...interests, ...sourceInterests]));

      if (existing) {
        // Update existing subscriber with new interests
        existing.interests = Array.from(new Set([...existing.interests, ...mergedInterests]));
        existing.segments = computeSegments(existing.interests, existing.click_history);
        writeSubscribers(subscribers);
        return res.json({ success: true, subscriber_id: existing.id, updated: true });
      }

      const subscriber_id = generateSubscriberId(email);
      const segments = computeSegments(mergedInterests, []);

      const newSubscriber = {
        id: subscriber_id,
        email,
        source: source || 'unknown',
        interests: mergedInterests,
        segments,
        subscribed_at: new Date().toISOString(),
        last_email_sent: null,
        click_history: [],
        email_send_count_this_week: 0,
        week_start: null,
      };

      subscribers.push(newSubscriber);
      writeSubscribers(subscribers);

      return res.json({ success: true, subscriber_id });
    } catch (err) {
      console.error('[subscribe] Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ── 2. POST /api/track/interest ────────────────────────────────────────────
  app.post('/api/track/interest', (req, res) => {
    try {
      const { email, category, program } = req.body;

      if (!email || !category) {
        return res.status(400).json({ success: false, error: 'email and category required' });
      }

      const subscribers = readSubscribers();
      const subscriber = subscribers.find(s => s.email === email);

      if (!subscriber) {
        return res.status(404).json({ success: false, error: 'Subscriber not found' });
      }

      // Record the click
      subscriber.click_history = subscriber.click_history || [];
      subscriber.click_history.push({
        category,
        program: program || null,
        clicked_at: new Date().toISOString(),
      });

      // Add category to interests if not present
      if (!subscriber.interests.includes(category)) {
        subscriber.interests.push(category);
      }

      // Recompute segments
      subscriber.segments = computeSegments(subscriber.interests, subscriber.click_history);

      writeSubscribers(subscribers);

      return res.json({
        success: true,
        segments: subscriber.segments,
        total_clicks: subscriber.click_history.length,
      });
    } catch (err) {
      console.error('[track/interest] Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ── 3. GET /api/segments/stats ─────────────────────────────────────────────
  app.get('/api/segments/stats', (req, res) => {
    try {
      const subscribers = readSubscribers();
      const emailLog = readEmailLog();

      const stats = {};

      // Initialize all segments
      for (const key of Object.keys(SEGMENT_CONFIG)) {
        stats[key] = {
          display_name: SEGMENT_CONFIG[key].display_name,
          count: 0,
          top_programs: {},
          emails_sent: 0,
        };
      }

      // Count subscribers per segment and tally program clicks
      for (const sub of subscribers) {
        for (const seg of (sub.segments || [])) {
          if (stats[seg]) {
            stats[seg].count++;
          }
        }
        for (const click of (sub.click_history || [])) {
          for (const seg of (sub.segments || [])) {
            if (stats[seg] && click.program) {
              stats[seg].top_programs[click.program] = (stats[seg].top_programs[click.program] || 0) + 1;
            }
          }
        }
      }

      // Count emails sent per segment
      for (const entry of emailLog) {
        if (entry.segment && stats[entry.segment]) {
          stats[entry.segment].emails_sent++;
        }
      }

      // Sort top programs
      for (const key of Object.keys(stats)) {
        const sorted = Object.entries(stats[key].top_programs)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([program, clicks]) => ({ program, clicks }));
        stats[key].top_programs = sorted;
      }

      const totalSubscribers = subscribers.length;
      const segmentedSubscribers = subscribers.filter(s => s.segments && s.segments.length > 0).length;

      return res.json({
        success: true,
        total_subscribers: totalSubscribers,
        segmented_subscribers: segmentedSubscribers,
        unsegmented: totalSubscribers - segmentedSubscribers,
        segments: stats,
      });
    } catch (err) {
      console.error('[segments/stats] Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ── 4. POST /api/email/generate ────────────────────────────────────────────
  app.post('/api/email/generate', (req, res) => {
    try {
      const { segment } = req.body;

      if (!segment || !SEGMENT_CONFIG[segment]) {
        return res.status(400).json({
          success: false,
          error: `Invalid segment. Valid segments: ${Object.keys(SEGMENT_CONFIG).join(', ')}`,
        });
      }

      const template = EMAIL_TEMPLATES[segment];
      const programs = (PROGRAM_CARDS_BY_SEGMENT[segment] || []).slice(0, 5);

      const html = buildEmailHTML({
        segment,
        subject: template.subject,
        previewText: template.previewText,
        headerTitle: template.headerTitle,
        intro: template.intro,
        programs,
        ctaText: template.ctaText,
        ctaUrl: template.ctaUrl,
      });

      return res.json({
        success: true,
        segment,
        display_name: SEGMENT_CONFIG[segment].display_name,
        subject: template.subject,
        preview_text: template.previewText,
        program_count: programs.length,
        html,
      });
    } catch (err) {
      console.error('[email/generate] Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ── 5. GET /api/email/digest ───────────────────────────────────────────────
  app.get('/api/email/digest', (req, res) => {
    try {
      const subscribers = readSubscribers();
      const emailLog = readEmailLog();

      const today = new Date().toISOString().split('T')[0];

      // New subscribers today
      const newToday = subscribers.filter(s => s.subscribed_at && s.subscribed_at.startsWith(today));

      // Total clicks today
      let clicksToday = 0;
      const programClicksToday = {};
      for (const sub of subscribers) {
        for (const click of (sub.click_history || [])) {
          if (click.clicked_at && click.clicked_at.startsWith(today)) {
            clicksToday++;
            if (click.program) {
              programClicksToday[click.program] = (programClicksToday[click.program] || 0) + 1;
            }
          }
        }
      }

      // Top programs today
      const topPrograms = Object.entries(programClicksToday)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Segment breakdown
      const segmentCounts = {};
      for (const sub of subscribers) {
        for (const seg of (sub.segments || [])) {
          segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
        }
      }

      // Emails sent today
      const emailsSentToday = emailLog.filter(e => e.sent_at && e.sent_at.startsWith(today)).length;

      // Build digest HTML
      const topProgramRows = topPrograms.length
        ? topPrograms.map(([p, c]) => `<tr><td style="padding:6px 0;color:#374151;">${p}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#6366f1;">${c} clicks</td></tr>`).join('')
        : '<tr><td colspan="2" style="color:#9ca3af;padding:6px 0;">No clicks recorded today</td></tr>';

      const segmentRows = Object.entries(segmentCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([seg, count]) => {
          const cfg = SEGMENT_CONFIG[seg];
          return `<tr><td style="padding:6px 0;color:#374151;">${cfg ? cfg.display_name : seg}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#6366f1;">${count}</td></tr>`;
        })
        .join('') || '<tr><td colspan="2" style="color:#9ca3af;padding:6px 0;">No segmented subscribers yet</td></tr>';

      const digestHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>DevBotAI Daily Digest — ${today}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e1b4b,#4338ca);padding:28px 40px;text-align:center;">
            <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">DevBotAI</div>
            <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">Daily Owner Digest</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${today}</p>
          </td>
        </tr>
        <tr><td style="padding:32px 40px;">

          <!-- KPI Row -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="text-align:center;background:#f0f9ff;border-radius:8px;padding:16px;">
                <div style="font-size:28px;font-weight:700;color:#0369a1;">${subscribers.length}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Total Subscribers</div>
              </td>
              <td width="12"></td>
              <td style="text-align:center;background:#f0fdf4;border-radius:8px;padding:16px;">
                <div style="font-size:28px;font-weight:700;color:#15803d;">+${newToday.length}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">New Today</div>
              </td>
              <td width="12"></td>
              <td style="text-align:center;background:#faf5ff;border-radius:8px;padding:16px;">
                <div style="font-size:28px;font-weight:700;color:#7c3aed;">${clicksToday}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Clicks Today</div>
              </td>
              <td width="12"></td>
              <td style="text-align:center;background:#fff7ed;border-radius:8px;padding:16px;">
                <div style="font-size:28px;font-weight:700;color:#c2410c;">${emailsSentToday}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Emails Sent</div>
              </td>
            </tr>
          </table>

          <!-- Top Programs -->
          <h2 style="margin:0 0 12px;font-size:15px;color:#111827;">Top Programs Today</h2>
          <table width="100%" style="margin-bottom:28px;">${topProgramRows}</table>

          <!-- Segment Breakdown -->
          <h2 style="margin:0 0 12px;font-size:15px;color:#111827;">Subscriber Segments</h2>
          <table width="100%" style="margin-bottom:28px;">${segmentRows}</table>

          <div style="text-align:center;">
            <a href="https://devbotai.com/admin/dashboard" style="display:inline-block;background:#4338ca;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Open Admin Dashboard →</a>
          </div>

        </td></tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">This digest was auto-generated by DevBotAI &middot; <a href="https://devbotai.com" style="color:#6366f1;text-decoration:none;">devbotai.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      return res.json({
        success: true,
        date: today,
        summary: {
          total_subscribers: subscribers.length,
          new_today: newToday.length,
          clicks_today: clicksToday,
          emails_sent_today: emailsSentToday,
          top_programs: topPrograms.map(([p, c]) => ({ program: p, clicks: c })),
          segment_counts: segmentCounts,
        },
        html: digestHtml,
      });
    } catch (err) {
      console.error('[email/digest] Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // ── 6. POST /api/email/send-segment ───────────────────────────────────────
  app.post('/api/email/send-segment', (req, res) => {
    try {
      const { segment, subject, content } = req.body;

      if (!segment || !subject) {
        return res.status(400).json({ success: false, error: 'segment and subject are required' });
      }

      if (!SEGMENT_CONFIG[segment]) {
        return res.status(400).json({
          success: false,
          error: `Invalid segment. Valid segments: ${Object.keys(SEGMENT_CONFIG).join(', ')}`,
        });
      }

      const subscribers = readSubscribers();
      const emailLog = readEmailLog();
      const now = new Date();
      const weekMs = 7 * 24 * 60 * 60 * 1000;

      const targets = subscribers.filter(s => s.segments && s.segments.includes(segment));

      let sent = 0;
      let skipped = 0;
      const logEntries = [];

      for (const sub of targets) {
        // Enforce max 2 emails per week per subscriber
        const weekStart = now.getTime() - weekMs;
        sub.week_start = sub.week_start || now.toISOString();
        const weekStartTime = new Date(sub.week_start).getTime();

        if (now.getTime() - weekStartTime > weekMs) {
          // Reset weekly count
          sub.email_send_count_this_week = 0;
          sub.week_start = now.toISOString();
        }

        if ((sub.email_send_count_this_week || 0) >= 2) {
          skipped++;
          continue;
        }

        // Log the send (production would call SendGrid/Mailgun here)
        const logEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          email: sub.email,
          subscriber_id: sub.id,
          segment,
          subject,
          sent_at: now.toISOString(),
          status: 'logged', // In production: 'sent'
          content_preview: content ? content.slice(0, 120) : null,
        };

        logEntries.push(logEntry);
        sub.last_email_sent = now.toISOString();
        sub.email_send_count_this_week = (sub.email_send_count_this_week || 0) + 1;
        sent++;
      }

      // Persist log and updated subscribers
      emailLog.push(...logEntries);
      writeEmailLog(emailLog);
      writeSubscribers(subscribers);

      console.log(`[email/send-segment] Segment: ${segment} | Sent: ${sent} | Skipped (rate-limited): ${skipped}`);

      return res.json({
        success: true,
        segment,
        display_name: SEGMENT_CONFIG[segment].display_name,
        total_in_segment: targets.length,
        sent,
        skipped_rate_limited: skipped,
        note: 'Emails logged to data/email-log.json. Connect SendGrid/Mailgun for live sending.',
      });
    } catch (err) {
      console.error('[email/send-segment] Error:', err);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

}

export { registerEmailSegmentRoutes, SEGMENT_CONFIG };
