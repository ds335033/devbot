/**
 * DevBotAI — Security Hardening
 * Enterprise-grade protection for the affiliate hub
 */

import { createHash } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://devbotai.shop',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8080',
];

const MAX_BODY_SIZE = 10 * 1024; // 10 KB

// Known malicious/scraper bot patterns
const BOT_UA_PATTERNS = [
  /scrapy/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /dotbot/i,
  /mj12bot/i,
  /blexbot/i,
  /petalbot/i,
  /bytespider/i,
  /ccbot/i,
  /gptbot/i,
  /claudebot/i,
  /anthropic-ai/i,
  /ia_archiver/i,
  /wget/i,
  /libwww-perl/i,
  /python-requests/i,
  /go-http-client/i,
  /curl\//i,
  /masscan/i,
  /zgrab/i,
  /nmap/i,
  /nikto/i,
  /sqlmap/i,
  /havij/i,
  /acunetix/i,
  /nessus/i,
];

// Suspicious request header patterns
const SUSPICIOUS_HEADERS = [
  'x-forwarded-host',
  'x-host',
  'x-original-url',
  'x-rewrite-url',
];

// ─── Rate limiter (in-memory) ─────────────────────────────────────────────────
// Map<key, { count: number, resetAt: number }>
const rateLimitStore = new Map();

function makeRateLimiter({ windowMs, max, keyPrefix = '' }) {
  // Periodically purge expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimitStore) {
      if (k.startsWith(keyPrefix) && now > v.resetAt) rateLimitStore.delete(k);
    }
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ipHash = createHash('sha256').update(ip + 'devbotai-rl-salt').digest('hex').slice(0, 16);
    const key = `${keyPrefix}:${ipHash}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter,
      });
    }

    entry.count += 1;
    return next();
  };
}

// ─── Input sanitization ───────────────────────────────────────────────────────

/**
 * Recursively strips HTML/script tags and dangerous attributes from strings
 * within any object or array structure.
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value
      // Remove script tags and content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // Remove all HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove javascript: protocol
      .replace(/javascript\s*:/gi, '')
      // Remove data: URIs
      .replace(/data\s*:/gi, '')
      // Remove on* event handlers (residual text)
      .replace(/\bon\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const [k, v] of Object.entries(value)) {
      sanitized[sanitizeValue(k)] = sanitizeValue(v);
    }
    return sanitized;
  }

  return value;
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

// ─── Security headers ─────────────────────────────────────────────────────────

export function getSecurityHeaders() {
  return {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com https://firestore.googleapis.com",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  if (!origin) {
    // Same-origin or non-browser request — allow through
    return next();
  }

  // Check exact origin match or localhost with any port
  const isAllowed =
    ALLOWED_ORIGINS.some(o => origin === o) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(isAllowed ? 204 : 403);
  }

  // Don't hard-block non-allowed origins for non-preflight — let auth handle it
  return next();
}

// ─── Request validation ───────────────────────────────────────────────────────

function requestValidation(req, res, next) {
  // Reject requests with host-override headers (SSRF / cache poisoning vectors)
  for (const header of SUSPICIOUS_HEADERS) {
    if (req.headers[header]) {
      return res.status(400).json({ error: 'Suspicious request header detected' });
    }
  }

  // Reject requests with excessively long URLs
  if (req.url && req.url.length > 2048) {
    return res.status(414).json({ error: 'Request URI Too Long' });
  }

  // Reject null bytes in URL (directory traversal attempts)
  if (req.url && req.url.includes('\0')) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  next();
}

// ─── Request size limit ───────────────────────────────────────────────────────

function requestSizeLimit(req, res, next) {
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);

  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({ error: 'Request body too large. Maximum 10KB.' });
  }

  // Also track actual bytes received
  let received = 0;
  req.on('data', chunk => {
    received += chunk.length;
    if (received > MAX_BODY_SIZE) {
      req.destroy();
      res.status(413).json({ error: 'Request body too large. Maximum 10KB.' });
    }
  });

  next();
}

// ─── Bot detection ────────────────────────────────────────────────────────────

function botDetection(req, res, next) {
  const ua = req.headers['user-agent'] || '';

  // Allow through if no UA (will be handled by other auth layers)
  if (!ua) return next();

  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) {
      // Log for monitoring (no sensitive data)
      console.warn(`[Security] Blocked bot UA on ${req.path}: ${ua.slice(0, 80)}`);
      // Return 403 for obvious attack tools; 404 for scrapers (less informative)
      const isAttackTool = /sqlmap|havij|nikto|nessus|acunetix|masscan|zgrab/i.test(ua);
      return res.status(isAttackTool ? 403 : 404).send('Not found');
    }
  }

  next();
}

// ─── Honeypot middleware ──────────────────────────────────────────────────────
// Checks for a hidden field named `_hp` in POST bodies.
// Legitimate users never fill hidden fields; bots do.

function honeypotCheck(req, res, next) {
  if (req.method !== 'POST') return next();

  const body = req.body || {};

  // If the honeypot field is present and non-empty, silently accept but discard
  if (body._hp !== undefined && body._hp !== '') {
    console.warn(`[Security] Honeypot triggered on ${req.path}`);
    // Return a fake success to not alert the bot
    return res.status(200).json({ success: true });
  }

  next();
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function applySecurityHardening(app) {

  // 1. Apply security headers to all responses
  app.use((req, res, next) => {
    const headers = getSecurityHeaders();
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v);
    }
    next();
  });

  // 2. CORS
  app.use(corsMiddleware);

  // 3. Request validation (header checks, URL sanity)
  app.use(requestValidation);

  // 4. Request size limit (10 KB max)
  app.use(requestSizeLimit);

  // 5. Bot detection — runs before rate limiting to cut bot traffic early
  app.use(botDetection);

  // 6. Input sanitization for all POST/PUT/PATCH bodies
  app.use(sanitizeBody);

  // 7. Honeypot on subscription/form routes
  app.use('/api/subscribe', honeypotCheck);
  app.use('/api/contact', honeypotCheck);
  app.use('/api/newsletter', honeypotCheck);

  // 8. Rate limiting per route group

  // /api/checkout/* — 10 requests/hour per IP (tightest)
  app.use('/api/checkout', makeRateLimiter({
    windowMs: 60 * 60 * 1000,   // 1 hour
    max: 10,
    keyPrefix: 'rl:checkout',
  }));

  // /go/* — 60 requests/min per IP
  app.use('/go', makeRateLimiter({
    windowMs: 60 * 1000,         // 1 minute
    max: 60,
    keyPrefix: 'rl:go',
  }));

  // /api/* — 100 requests/15min per IP (broadest, applied last so checkout/go rules take priority)
  app.use('/api', makeRateLimiter({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,
    keyPrefix: 'rl:api',
  }));

  console.log('[Security] Hardening applied: CORS, headers, rate limiting, bot detection, honeypot, sanitization');
}
