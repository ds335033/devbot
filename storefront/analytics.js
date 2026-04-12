/**
 * DevBotAI Affiliate Hub — Analytics Engine
 * analytics.js — v1.0.0
 *
 * Features:
 *  1. UTM Parameter Tracking
 *  2. Click Tracking (Join Program buttons)
 *  3. Conversion Analytics Dashboard (showAnalyticsDashboard)
 *  4. Session Tracking (pageviews, time-on-page, scroll depth, referrer, device)
 *  5. Google Analytics 4 Integration (gtag.js)
 *  6. Dynamic Affiliate Link Builder (buildAffiliateLink)
 *  7. Error Handling (window.__analyticsErrors)
 *
 * Call initAnalytics() to wire everything up.
 */

(() => {
  'use strict';

  // ─── Error Sink ────────────────────────────────────────────────────────────
  window.__analyticsErrors = window.__analyticsErrors || [];

  function logError(context, err) {
    const entry = {
      context,
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : null,
      ts: new Date().toISOString(),
    };
    window.__analyticsErrors.push(entry);
    console.warn('[DevBotAI Analytics Error]', context, err);
  }

  // ─── Constants ─────────────────────────────────────────────────────────────
  const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  const STORAGE_CLICKS_KEY  = 'devbotai_affiliate_clicks';
  const STORAGE_SESSION_KEY = 'devbotai_session';
  const UTM_PARAMS          = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  // Estimated conversion rate and avg commission per tier (used in revenue calculator)
  const TIER_DEFAULTS = {
    diamond: { conversionRate: 0.04, avgCommission: 85 },
    gold:    { conversionRate: 0.03, avgCommission: 45 },
    silver:  { conversionRate: 0.02, avgCommission: 20 },
    default: { conversionRate: 0.025, avgCommission: 30 },
  };

  // ─── Utility Helpers ───────────────────────────────────────────────────────

  /**
   * Generate a short unique ID for click-level tracking.
   */
  function generateClickId() {
    try {
      const arr = new Uint8Array(8);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback if crypto not available
      return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }
  }

  /**
   * Slugify a string for use in UTM campaign values.
   * "Jasper AI" → "jasper_ai"
   */
  function slugify(str) {
    try {
      return String(str)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_-]/g, '')
        .replace(/[\s-]+/g, '_')
        .slice(0, 100);
    } catch (e) {
      logError('slugify', e);
      return 'unknown';
    }
  }

  /**
   * Safe localStorage read — returns parsed JSON or a fallback value.
   */
  function lsGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (e) {
      logError('lsGet:' + key, e);
      return fallback;
    }
  }

  /**
   * Safe localStorage write.
   */
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      logError('lsSet:' + key, e);
    }
  }

  /**
   * Format a number as USD string (no cents for whole numbers).
   */
  function formatUSD(n) {
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ─── 1. UTM Parameter Tracking ─────────────────────────────────────────────

  const _utm = {};

  /**
   * Parse UTM parameters from the current URL and persist them in the session.
   * Returns an object with utm_source, utm_medium, utm_campaign, utm_content, utm_term.
   */
  function parseAndStoreUTM() {
    try {
      const params = new URLSearchParams(window.location.search);
      let found = false;

      UTM_PARAMS.forEach(key => {
        const val = params.get(key);
        if (val) {
          _utm[key] = val;
          found = true;
        }
      });

      // If we found new UTMs, persist them in sessionStorage so they survive
      // soft navigations within the session.
      if (found) {
        try {
          sessionStorage.setItem('devbotai_utm', JSON.stringify(_utm));
        } catch (_) { /* sessionStorage may be blocked */ }
      } else {
        // Try to recover from sessionStorage if no UTMs in URL
        try {
          const saved = sessionStorage.getItem('devbotai_utm');
          if (saved) {
            Object.assign(_utm, JSON.parse(saved));
          }
        } catch (_) { /* ignore */ }
      }

      return { ..._utm };
    } catch (e) {
      logError('parseAndStoreUTM', e);
      return {};
    }
  }

  /**
   * Public accessor — returns current UTM data.
   */
  function getUTM() {
    return { ..._utm };
  }

  // ─── 2. Click Tracking ─────────────────────────────────────────────────────

  /**
   * Record a click event to localStorage.
   * @param {Object} data - { name, category, tier, url }
   */
  function recordClick(data) {
    try {
      const clicks = lsGet(STORAGE_CLICKS_KEY, []);
      const clickEntry = {
        id:        generateClickId(),
        name:      data.name      || 'Unknown',
        category:  data.category  || 'unknown',
        tier:      data.tier      || 'unknown',
        url:       data.url       || '',
        ts:        new Date().toISOString(),
        day:       new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        utm:       getUTM(),
      };
      clicks.push(clickEntry);
      lsSet(STORAGE_CLICKS_KEY, clicks);
      return clickEntry;
    } catch (e) {
      logError('recordClick', e);
      return null;
    }
  }

  /**
   * Attach click listeners to all current and future .aff-card-cta elements.
   * Uses event delegation on the grid container so dynamically rendered cards
   * are covered automatically.
   */
  function attachClickTracking() {
    try {
      // Delegate from document body so re-renders are always covered
      document.addEventListener('click', (e) => {
        try {
          const cta = e.target.closest('.aff-card-cta');
          if (!cta) return;

          const card = cta.closest('.aff-card');
          if (!card) return;

          const name     = card.querySelector('.aff-card-title')?.textContent?.trim() || 'Unknown';
          const category = card.dataset.cat || 'unknown';
          const tierEl   = card.querySelector('[class*="tier-"]');
          const tier     = tierEl
            ? (tierEl.className.match(/tier-(diamond|gold|silver)/)?.[1] || 'unknown')
            : 'unknown';
          const baseUrl  = cta.href || cta.dataset.href || '';

          const clickEntry = recordClick({ name, category, tier, url: baseUrl });

          // Fire GA4 event if available
          if (typeof gtag === 'function') {
            try {
              gtag('event', 'affiliate_click', {
                program_name:     name,
                program_category: category,
                program_tier:     tier,
                utm_source:       _utm.utm_source   || '(none)',
                utm_medium:       _utm.utm_medium   || '(none)',
                utm_campaign:     _utm.utm_campaign || '(none)',
                click_id:         clickEntry ? clickEntry.id : '',
              });
            } catch (gaErr) {
              logError('gtag:affiliate_click', gaErr);
            }
          }

          // Rewrite the href with tracking params so the outbound link carries attribution
          if (baseUrl && baseUrl.startsWith('http')) {
            try {
              const tracked = buildAffiliateLink(baseUrl, name, clickEntry ? clickEntry.id : null);
              // Temporarily set href so the browser uses it; restore original so
              // the DOM doesn't permanently break if the card re-renders.
              cta.href = tracked;
              // Restore after the browser has processed the navigation intent
              setTimeout(() => { cta.href = baseUrl; }, 500);
            } catch (linkErr) {
              logError('attachClickTracking:buildLink', linkErr);
            }
          }
        } catch (innerErr) {
          logError('attachClickTracking:handler', innerErr);
        }
      });
    } catch (e) {
      logError('attachClickTracking', e);
    }
  }

  /**
   * Retrieve all stored clicks.
   */
  function getClicks() {
    return lsGet(STORAGE_CLICKS_KEY, []);
  }

  /**
   * Clear all stored clicks (useful for testing).
   */
  function clearClicks() {
    lsSet(STORAGE_CLICKS_KEY, []);
  }

  // ─── 3. Conversion Analytics Dashboard ────────────────────────────────────

  /**
   * Build aggregated stats from click data.
   */
  function buildStats(clicks) {
    try {
      // Clicks per program
      const byProgram = {};
      const byCategory = {};
      const byDay = {};

      clicks.forEach(c => {
        // By program
        if (!byProgram[c.name]) {
          byProgram[c.name] = { name: c.name, category: c.category, tier: c.tier, clicks: 0 };
        }
        byProgram[c.name].clicks++;

        // By category
        byCategory[c.category] = (byCategory[c.category] || 0) + 1;

        // By day
        byDay[c.day] = (byDay[c.day] || 0) + 1;
      });

      const programList = Object.values(byProgram).sort((a, b) => b.clicks - a.clicks);
      const top10 = programList.slice(0, 10);

      // CTR by category — we don't have impressions, so we compute share of total clicks
      const totalClicks = clicks.length || 1;
      const categoryShare = Object.entries(byCategory)
        .map(([cat, cnt]) => ({ cat, cnt, share: ((cnt / totalClicks) * 100).toFixed(1) + '%' }))
        .sort((a, b) => b.cnt - a.cnt);

      // Revenue potential per program in top10
      const revenuePotential = top10.map(p => {
        const defaults = TIER_DEFAULTS[p.tier] || TIER_DEFAULTS.default;
        const est = p.clicks * defaults.conversionRate * defaults.avgCommission;
        return { ...p, estimatedRevenue: est };
      });

      // Days sorted chronologically
      const timeData = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, cnt]) => ({ day, cnt }));

      return { programList, top10, categoryShare, revenuePotential, timeData, totalClicks };
    } catch (e) {
      logError('buildStats', e);
      return { programList: [], top10: [], categoryShare: [], revenuePotential: [], timeData: [], totalClicks: 0 };
    }
  }

  /**
   * Export clicks data as a downloadable CSV file.
   */
  function exportToCSV(clicks) {
    try {
      const headers = ['id', 'name', 'category', 'tier', 'url', 'ts', 'day',
                       'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
      const rows = clicks.map(c => [
        c.id,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.category,
        c.tier,
        `"${(c.url || '').replace(/"/g, '""')}"`,
        c.ts,
        c.day,
        c.utm?.utm_source   || '',
        c.utm?.utm_medium   || '',
        c.utm?.utm_campaign || '',
        c.utm?.utm_content  || '',
        c.utm?.utm_term     || '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `devbotai-affiliate-clicks-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      logError('exportToCSV', e);
    }
  }

  /**
   * Create and inject the analytics dashboard modal into the page.
   */
  function showAnalyticsDashboard() {
    try {
      // Remove any existing dashboard
      const existing = document.getElementById('devbotai-analytics-modal');
      if (existing) { existing.remove(); return; }

      const clicks = getClicks();
      const stats  = buildStats(clicks);

      // ── Render helpers ──
      const barColor = (tier) => {
        if (tier === 'diamond') return '#6366f1';
        if (tier === 'gold')    return '#f59e0b';
        if (tier === 'silver')  return '#94a3b8';
        return '#60a5fa';
      };

      const maxClicks = stats.programList.length > 0 ? stats.programList[0].clicks || 1 : 1;

      const programRows = stats.top10.length
        ? stats.top10.map((p, i) => {
            const pct = ((p.clicks / maxClicks) * 100).toFixed(1);
            return `
              <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                  <span style="color:#e2e8f0;font-size:0.85rem;font-weight:600;">${i + 1}. ${p.name}</span>
                  <span style="color:#94a3b8;font-size:0.8rem;">${p.clicks} click${p.clicks !== 1 ? 's' : ''}</span>
                </div>
                <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:8px;overflow:hidden;">
                  <div style="width:${pct}%;height:100%;background:${barColor(p.tier)};border-radius:4px;transition:width 0.6s ease;"></div>
                </div>
              </div>`;
          }).join('')
        : '<p style="color:#64748b;font-size:0.85rem;">No click data yet — start clicking some programs!</p>';

      const catRows = stats.categoryShare.length
        ? stats.categoryShare.map(c => `
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:#94a3b8;font-size:0.82rem;text-transform:capitalize;">${c.cat}</span>
              <span style="color:#e2e8f0;font-size:0.82rem;font-weight:600;">${c.cnt} (${c.share})</span>
            </div>`).join('')
        : '<p style="color:#64748b;font-size:0.82rem;">No category data yet.</p>';

      const revenueRows = stats.revenuePotential.length
        ? stats.revenuePotential.map(p => `
            <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:#94a3b8;font-size:0.82rem;">${p.name}</span>
              <span style="color:#10b981;font-size:0.82rem;font-weight:700;">${formatUSD(p.estimatedRevenue)}</span>
            </div>`).join('')
        : '<p style="color:#64748b;font-size:0.82rem;">No revenue data yet.</p>';

      const totalRevEst = stats.revenuePotential.reduce((sum, p) => sum + (p.estimatedRevenue || 0), 0);

      // Time-based sparkline (simple bar chart using divs)
      const maxDayClicks = stats.timeData.reduce((m, d) => Math.max(m, d.cnt), 1);
      const timeChart = stats.timeData.length
        ? `<div style="display:flex;align-items:flex-end;gap:4px;height:60px;">
            ${stats.timeData.map(d => {
              const h = Math.max(4, Math.round((d.cnt / maxDayClicks) * 60));
              return `<div title="${d.day}: ${d.cnt} clicks" style="
                flex:1;height:${h}px;background:#6366f1;border-radius:3px 3px 0 0;
                min-width:6px;opacity:0.8;cursor:default;" ></div>`;
            }).join('')}
           </div>
           <div style="display:flex;justify-content:space-between;margin-top:4px;">
             <span style="color:#64748b;font-size:0.7rem;">${stats.timeData[0]?.day || ''}</span>
             <span style="color:#64748b;font-size:0.7rem;">${stats.timeData[stats.timeData.length - 1]?.day || ''}</span>
           </div>`
        : '<p style="color:#64748b;font-size:0.82rem;">No time data yet.</p>';

      // Session summary
      const session = lsGet(STORAGE_SESSION_KEY, {});

      const html = `
<div id="devbotai-analytics-modal" style="
  position:fixed;top:0;left:0;right:0;bottom:0;
  background:rgba(0,0,0,0.85);
  z-index:99999;
  display:flex;align-items:center;justify-content:center;
  font-family:'Inter',sans-serif;
  padding:1rem;
  backdrop-filter:blur(4px);
">
  <div style="
    background:#0f172a;
    border:1px solid rgba(99,102,241,0.25);
    border-radius:1.25rem;
    width:100%;
    max-width:820px;
    max-height:90vh;
    overflow-y:auto;
    padding:2rem;
    box-shadow:0 24px 80px rgba(0,0,0,0.6);
    position:relative;
  ">
    <!-- Close button -->
    <button id="devbotai-dash-close" style="
      position:absolute;top:1rem;right:1rem;
      background:rgba(255,255,255,0.06);border:none;
      color:#94a3b8;font-size:1.2rem;cursor:pointer;
      border-radius:50%;width:36px;height:36px;
      display:flex;align-items:center;justify-content:center;
      transition:background 0.2s;
    " aria-label="Close dashboard">&#x2715;</button>

    <!-- Header -->
    <div style="margin-bottom:1.5rem;">
      <h2 style="color:#e2e8f0;font-size:1.4rem;font-weight:800;margin:0 0 0.3rem;">
        DevBotAI Affiliate Analytics
      </h2>
      <p style="color:#64748b;font-size:0.85rem;margin:0;">
        Total tracked clicks: <strong style="color:#6366f1;">${stats.totalClicks}</strong>
        &nbsp;&bull;&nbsp; Session: ${session.pageViews || 1} page view${(session.pageViews || 1) !== 1 ? 's' : ''}
        &nbsp;&bull;&nbsp; Device: ${session.deviceType || 'unknown'}
        &nbsp;&bull;&nbsp; Scroll depth: ${session.maxScrollDepth || 0}%
      </p>
    </div>

    <!-- Grid layout -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:1.2rem;">

      <!-- Top 10 Programs -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:0.75rem;padding:1.2rem;">
        <h3 style="color:#e2e8f0;font-size:0.95rem;font-weight:700;margin:0 0 1rem;">
          Top 10 Programs by Clicks
        </h3>
        ${programRows}
      </div>

      <!-- Category Breakdown -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:0.75rem;padding:1.2rem;">
        <h3 style="color:#e2e8f0;font-size:0.95rem;font-weight:700;margin:0 0 1rem;">
          Click-Through Rate by Category
        </h3>
        ${catRows}
      </div>

      <!-- Revenue Potential -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:0.75rem;padding:1.2rem;">
        <h3 style="color:#e2e8f0;font-size:0.95rem;font-weight:700;margin:0 0 0.3rem;">
          Revenue Potential Calculator
        </h3>
        <p style="color:#64748b;font-size:0.75rem;margin:0 0 1rem;">
          Clicks &times; tier conversion rate &times; avg commission
        </p>
        ${revenueRows}
        <div style="margin-top:0.8rem;padding-top:0.8rem;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;">
          <span style="color:#e2e8f0;font-size:0.85rem;font-weight:700;">Total Estimated</span>
          <span style="color:#10b981;font-size:1rem;font-weight:800;">${formatUSD(totalRevEst)}</span>
        </div>
      </div>

      <!-- Time-based Chart -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:0.75rem;padding:1.2rem;">
        <h3 style="color:#e2e8f0;font-size:0.95rem;font-weight:700;margin:0 0 1rem;">
          Clicks Per Day
        </h3>
        ${timeChart}
      </div>

    </div>

    <!-- UTM Attribution summary -->
    <div style="margin-top:1.2rem;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:0.75rem;padding:1rem;">
      <h3 style="color:#e2e8f0;font-size:0.9rem;font-weight:700;margin:0 0 0.6rem;">
        Current Session UTM Attribution
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
        ${UTM_PARAMS.map(k => `
          <div style="background:rgba(0,0,0,0.2);border-radius:6px;padding:4px 10px;">
            <span style="color:#64748b;font-size:0.72rem;">${k}:</span>
            <span style="color:#818cf8;font-size:0.78rem;font-weight:600;margin-left:4px;">${_utm[k] || '(none)'}</span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Export button -->
    <div style="margin-top:1.2rem;text-align:right;">
      <button id="devbotai-dash-export" style="
        background:linear-gradient(135deg,#6366f1,#8b5cf6);
        color:#fff;border:none;border-radius:0.5rem;
        padding:0.6rem 1.4rem;font-weight:700;font-size:0.88rem;
        cursor:pointer;transition:opacity 0.2s;margin-right:0.5rem;
      ">Export to CSV</button>
      <button id="devbotai-dash-clear" style="
        background:rgba(239,68,68,0.15);
        color:#f87171;border:1px solid rgba(239,68,68,0.25);border-radius:0.5rem;
        padding:0.6rem 1.4rem;font-weight:700;font-size:0.88rem;
        cursor:pointer;transition:opacity 0.2s;
      ">Clear All Data</button>
    </div>
  </div>
</div>`;

      document.body.insertAdjacentHTML('beforeend', html);

      // Wire up close
      document.getElementById('devbotai-dash-close').addEventListener('click', () => {
        const modal = document.getElementById('devbotai-analytics-modal');
        if (modal) modal.remove();
      });

      // Close on backdrop click
      document.getElementById('devbotai-analytics-modal').addEventListener('click', (e) => {
        if (e.target.id === 'devbotai-analytics-modal') {
          e.target.remove();
        }
      });

      // Close on Escape
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('devbotai-analytics-modal');
          if (modal) { modal.remove(); document.removeEventListener('keydown', escHandler); }
        }
      };
      document.addEventListener('keydown', escHandler);

      // Export button
      document.getElementById('devbotai-dash-export').addEventListener('click', () => {
        try { exportToCSV(getClicks()); } catch (e) { logError('exportToCSV:button', e); }
      });

      // Clear button
      document.getElementById('devbotai-dash-clear').addEventListener('click', () => {
        if (confirm('Clear all click tracking data? This cannot be undone.')) {
          clearClicks();
          const modal = document.getElementById('devbotai-analytics-modal');
          if (modal) modal.remove();
          showAnalyticsDashboard(); // re-open with empty state
        }
      });

    } catch (e) {
      logError('showAnalyticsDashboard', e);
    }
  }

  // ─── 4. Session Tracking ───────────────────────────────────────────────────

  let _sessionStart = Date.now();
  let _maxScrollDepth = 0;

  function detectDeviceType() {
    try {
      const ua = navigator.userAgent || '';
      if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
      if (/Tablet|iPad/i.test(ua)) return 'tablet';
      return 'desktop';
    } catch (e) {
      return 'unknown';
    }
  }

  function trackScrollDepth() {
    try {
      const scrolled   = window.scrollY || document.documentElement.scrollTop;
      const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
      const depth      = docHeight > 0 ? Math.round((scrolled / docHeight) * 100) : 0;
      if (depth > _maxScrollDepth) {
        _maxScrollDepth = depth;
        updateSessionData({ maxScrollDepth: _maxScrollDepth });
      }
    } catch (e) {
      logError('trackScrollDepth', e);
    }
  }

  function updateSessionData(patch) {
    try {
      const current = lsGet(STORAGE_SESSION_KEY, {});
      lsSet(STORAGE_SESSION_KEY, { ...current, ...patch });
    } catch (e) {
      logError('updateSessionData', e);
    }
  }

  function initSessionTracking() {
    try {
      const existing = lsGet(STORAGE_SESSION_KEY, null);
      const session  = existing || {};

      // Increment page views
      session.pageViews    = (session.pageViews || 0) + 1;
      session.lastSeen     = new Date().toISOString();
      session.referrer     = document.referrer || '(direct)';
      session.deviceType   = detectDeviceType();
      session.maxScrollDepth = session.maxScrollDepth || 0;
      session.utm          = getUTM();

      lsSet(STORAGE_SESSION_KEY, session);

      // Scroll depth tracking (throttled)
      let scrollTimer = null;
      window.addEventListener('scroll', () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => { trackScrollDepth(); scrollTimer = null; }, 200);
      }, { passive: true });

      // Track time on page before unload
      window.addEventListener('beforeunload', () => {
        try {
          const timeOnPage = Math.round((Date.now() - _sessionStart) / 1000);
          updateSessionData({ lastTimeOnPage: timeOnPage });

          // GA4 engagement event
          if (typeof gtag === 'function') {
            gtag('event', 'page_engagement', {
              time_on_page_seconds: timeOnPage,
              max_scroll_depth:     _maxScrollDepth,
              device_type:          session.deviceType,
            });
          }
        } catch (_) { /* unload — ignore */ }
      });

    } catch (e) {
      logError('initSessionTracking', e);
    }
  }

  // ─── 5. Google Analytics 4 Integration ────────────────────────────────────

  function initGA4() {
    try {
      if (GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
        console.info('[DevBotAI Analytics] GA4 not configured — replace G-XXXXXXXXXX with your Measurement ID.');
        return;
      }

      // Inject gtag.js script
      const script = document.createElement('script');
      script.async = true;
      script.src   = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
      script.onerror = () => logError('initGA4:script', new Error('Failed to load gtag.js'));
      document.head.appendChild(script);

      // Initialise dataLayer and gtag
      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); } // eslint-disable-line
      window.gtag = gtag;

      gtag('js', new Date());
      gtag('config', GA4_MEASUREMENT_ID, {
        page_title:    document.title,
        page_location: window.location.href,
        send_page_view: true,
      });

    } catch (e) {
      logError('initGA4', e);
    }
  }

  // ─── 6. Dynamic Affiliate Link Builder ────────────────────────────────────

  /**
   * Append DevBotAI tracking UTM parameters to any affiliate base URL.
   *
   * @param {string} baseUrl      - The original affiliate link (e.g. https://jasper.ai/partners)
   * @param {string} programName  - Human-readable program name
   * @param {string} [clickId]    - Optional pre-generated click ID; one is created if omitted
   * @returns {string}            - The full tracked URL
   */
  function buildAffiliateLink(baseUrl, programName, clickId) {
    try {
      const url = new URL(baseUrl);
      const cid = clickId || generateClickId();

      url.searchParams.set('utm_source',   'devbotai');
      url.searchParams.set('utm_medium',   'affiliate_hub');
      url.searchParams.set('utm_campaign', slugify(programName || 'unknown'));
      url.searchParams.set('utm_content',  'card_click');
      url.searchParams.set('click_id',     cid);

      return url.toString();
    } catch (e) {
      logError('buildAffiliateLink', e);
      // If URL parsing fails (e.g. relative URL), return original with query string appended
      try {
        const sep = baseUrl.includes('?') ? '&' : '?';
        const slug = slugify(programName || 'unknown');
        const cid  = clickId || generateClickId();
        return `${baseUrl}${sep}utm_source=devbotai&utm_medium=affiliate_hub&utm_campaign=${slug}&utm_content=card_click&click_id=${cid}`;
      } catch (_) {
        return baseUrl;
      }
    }
  }

  // ─── 7. Dashboard Toggle Button (Convenience) ─────────────────────────────

  /**
   * Inject a small floating trigger button so developers / admins can open
   * the dashboard without needing to call showAnalyticsDashboard() from the console.
   * Hidden by default behind a keyboard shortcut — press Alt+A to toggle.
   */
  function injectDashboardTrigger() {
    try {
      document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'a' || e.key === 'A')) {
          showAnalyticsDashboard();
        }
      });

      // Also expose to console for power users
      window.devbotAnalytics = {
        showDashboard:      showAnalyticsDashboard,
        getClicks,
        clearClicks,
        buildAffiliateLink,
        getUTM,
        exportToCSV: () => exportToCSV(getClicks()),
      };
    } catch (e) {
      logError('injectDashboardTrigger', e);
    }
  }

  // ─── initAnalytics — Main Entry Point ─────────────────────────────────────

  /**
   * Wire up all analytics features. Call once after the DOM is ready.
   * Typically: <script src="analytics.js"></script> and then initAnalytics()
   * or add data-autostart="true" to the script tag.
   */
  function initAnalytics() {
    try {
      parseAndStoreUTM();       // 1. UTM params
      attachClickTracking();    // 2. Click tracking
      initSessionTracking();    // 4. Session tracking
      initGA4();                // 5. GA4
      injectDashboardTrigger(); // Dashboard keybind + window.devbotAnalytics

      console.info(
        '%c[DevBotAI Analytics] Initialized — press Alt+A to open dashboard, or call window.devbotAnalytics.showDashboard()',
        'color:#6366f1;font-weight:bold;'
      );
    } catch (e) {
      logError('initAnalytics', e);
    }
  }

  // ─── Auto-start if script tag has data-autostart="true" ───────────────────
  (function autoStart() {
    try {
      const scripts   = document.querySelectorAll('script[src*="analytics.js"]');
      const thisScript = scripts[scripts.length - 1];
      if (thisScript && thisScript.dataset.autostart === 'true') {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initAnalytics);
        } else {
          initAnalytics();
        }
      }
    } catch (e) {
      logError('autoStart', e);
    }
  })();

  // ─── Public API ────────────────────────────────────────────────────────────
  window.initAnalytics        = initAnalytics;
  window.showAnalyticsDashboard = showAnalyticsDashboard;
  window.buildAffiliateLink   = buildAffiliateLink;

})();
