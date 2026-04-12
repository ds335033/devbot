/**
 * DevBotAI — Link Cloaking & Security System
 * Masks affiliate URLs, prevents link theft, tracks clicks
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const LINKS_FILE = join(DATA_DIR, 'cloaked-links.json');
const CLICKS_FILE = join(DATA_DIR, 'cloaked-clicks.json');

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Map<ipHash, { count: number, resetAt: number }>
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 10;       // max redirects per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(ipHash) {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count += 1;
  return true;
}

// Periodically purge expired rate limit entries to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Data helpers ─────────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadLinks() {
  ensureDataDir();
  if (!existsSync(LINKS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(LINKS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveLinks(links) {
  ensureDataDir();
  writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
}

function loadClicks() {
  ensureDataDir();
  if (!existsSync(CLICKS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CLICKS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveClicks(clicks) {
  ensureDataDir();
  writeFileSync(CLICKS_FILE, JSON.stringify(clicks, null, 2));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function hashIP(ip) {
  return createHash('sha256').update(ip + 'devbotai-salt').digest('hex').slice(0, 16);
}

function generateSlug(program) {
  return program
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function recordClick(slug, req) {
  const clicks = loadClicks();
  if (!clicks[slug]) clicks[slug] = [];

  const referrer = req.headers['referer'] || req.headers['referrer'] || '';
  const ua = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection?.remoteAddress || '';

  clicks[slug].push({
    ts: new Date().toISOString(),
    ipHash: hashIP(ip),
    refHash: referrer ? createHash('sha256').update(referrer).digest('hex').slice(0, 12) : null,
    uaHash: ua ? createHash('sha256').update(ua).digest('hex').slice(0, 12) : null,
  });

  saveClicks(clicks);
}

// ─── Security middleware for /go/* routes ─────────────────────────────────────

function cloakSecurityHeaders(req, res, next) {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerCloakRoutes(app) {

  // Apply security headers to all /go/ routes
  app.use('/go', cloakSecurityHeaders);

  // ── GET /go/:slug — Main cloaked redirect ──────────────────────────────────
  app.get('/go/:slug', (req, res) => {
    const { slug } = req.params;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ipHash = hashIP(ip);

    // Rate limit check
    if (!checkRateLimit(ipHash)) {
      return res.status(429).send('Too many requests. Please wait a moment.');
    }

    const links = loadLinks();
    const link = links[slug];

    if (!link) {
      return res.redirect(302, '/affiliates.html');
    }

    // Record the click asynchronously (don't block the redirect)
    setImmediate(() => recordClick(slug, req));

    // Set nofollow/noreferrer hint via Link header (informational)
    res.setHeader('X-Robots-Tag', 'nofollow');

    return res.redirect(302, link.url);
  });

  // ── POST /api/cloak/create — Create a cloaked link ────────────────────────
  app.post('/api/cloak/create', (req, res) => {
    const { url, slug: rawSlug, program, category } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    if (!url.startsWith('https://')) {
      return res.status(400).json({ error: 'url must use HTTPS' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const links = loadLinks();

    // Generate or sanitize slug
    let slug = rawSlug
      ? rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60)
      : generateSlug(program || url.replace(/https?:\/\//, '').split('/')[0]);

    if (!slug) {
      return res.status(400).json({ error: 'Could not generate a valid slug' });
    }

    // Ensure uniqueness — append suffix if slug already exists
    if (links[slug]) {
      let i = 2;
      while (links[`${slug}-${i}`]) i++;
      slug = `${slug}-${i}`;
    }

    links[slug] = {
      url,
      program: program || '',
      category: category || 'general',
      createdAt: new Date().toISOString(),
    };

    saveLinks(links);

    return res.json({
      slug,
      cloakedUrl: `/go/${slug}`,
      url,
      program: links[slug].program,
      category: links[slug].category,
    });
  });

  // ── GET /api/cloak/stats — Click statistics ────────────────────────────────
  app.get('/api/cloak/stats', (req, res) => {
    const links = loadLinks();
    const clicks = loadClicks();

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    const stats = Object.entries(links).map(([slug, link]) => {
      const slugClicks = clicks[slug] || [];
      const total = slugClicks.length;

      const today = slugClicks.filter(c => now - new Date(c.ts).getTime() < dayMs).length;
      const thisWeek = slugClicks.filter(c => now - new Date(c.ts).getTime() < weekMs).length;

      // Count top referrer hashes
      const refCounts = {};
      for (const c of slugClicks) {
        if (c.refHash) {
          refCounts[c.refHash] = (refCounts[c.refHash] || 0) + 1;
        }
      }
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hash, count]) => ({ hash, count }));

      return {
        slug,
        cloakedUrl: `/go/${slug}`,
        program: link.program,
        category: link.category,
        createdAt: link.createdAt,
        clicks: { total, today, thisWeek },
        topReferrers,
      };
    });

    return res.json({ links: stats, generatedAt: new Date().toISOString() });
  });

  // ── POST /api/cloak/bulk — Bulk create cloaked links ──────────────────────
  app.post('/api/cloak/bulk', (req, res) => {
    const programs = req.body;

    if (!Array.isArray(programs) || programs.length === 0) {
      return res.status(400).json({ error: 'Provide an array of { url, program, category }' });
    }

    if (programs.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 links per bulk request' });
    }

    const links = loadLinks();
    const results = [];
    const errors = [];

    for (const item of programs) {
      const { url, program, category } = item;

      if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
        errors.push({ program, error: 'Invalid or non-HTTPS URL' });
        continue;
      }

      try {
        new URL(url);
      } catch {
        errors.push({ program, error: 'Malformed URL' });
        continue;
      }

      let slug = generateSlug(program || url.replace(/https?:\/\//, '').split('/')[0]);

      if (!slug) {
        errors.push({ program, error: 'Could not generate slug' });
        continue;
      }

      if (links[slug]) {
        let i = 2;
        while (links[`${slug}-${i}`]) i++;
        slug = `${slug}-${i}`;
      }

      links[slug] = {
        url,
        program: program || '',
        category: category || 'general',
        createdAt: new Date().toISOString(),
      };

      results.push({
        slug,
        cloakedUrl: `/go/${slug}`,
        url,
        program: program || '',
        category: category || 'general',
      });
    }

    saveLinks(links);

    return res.json({
      created: results.length,
      errors: errors.length,
      results,
      errors,
    });
  });
}
