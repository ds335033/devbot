/**
 * DevBot AI — Affiliate Program API
 *
 * Features:
 * - Unique referral codes per affiliate
 * - Click tracking with cookies (90-day attribution)
 * - Conversion tracking on Stripe checkout
 * - 20% recurring commission on all referred subscriptions
 * - Dashboard stats: clicks, signups, conversions, earnings
 * - Payout tracking
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/affiliates.json');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(resolve(__dirname, '../../data'), { recursive: true });

// Simple JSON database for affiliates
function loadDB() {
  if (!existsSync(DB_PATH)) {
    const initial = { affiliates: {}, clicks: [], conversions: [], payouts: [] };
    writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function generateReferralCode(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const rand = crypto.randomBytes(3).toString('hex');
  return `${slug}-${rand}`;
}

export function registerAffiliateRoutes(app) {

  // ==========================================
  // POST /api/affiliates/signup
  // Register a new affiliate
  // ==========================================
  app.post('/api/affiliates/signup', (req, res) => {
    try {
      const { name, email, website, paypal_email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const db = loadDB();

      // Check if email already registered
      const existing = Object.values(db.affiliates).find(a => a.email === email);
      if (existing) {
        return res.status(409).json({
          error: 'Email already registered',
          referral_code: existing.referral_code
        });
      }

      const referral_code = generateReferralCode(name);
      const affiliate_id = crypto.randomUUID();

      db.affiliates[affiliate_id] = {
        id: affiliate_id,
        name,
        email,
        website: website || '',
        paypal_email: paypal_email || email,
        referral_code,
        referral_link: `https://devbotai.store/?ref=${referral_code}`,
        commission_rate: 0.20, // 20% recurring
        status: 'active',
        total_clicks: 0,
        total_signups: 0,
        total_conversions: 0,
        total_earnings: 0,
        pending_payout: 0,
        created_at: new Date().toISOString(),
      };

      saveDB(db);

      res.json({
        success: true,
        affiliate: {
          id: affiliate_id,
          referral_code,
          referral_link: `https://devbotai.store/?ref=${referral_code}`,
          commission_rate: '20% recurring',
          cookie_duration: '90 days',
        },
        message: 'Welcome to the DevBot AI Affiliate Program! Share your link and earn 20% recurring commissions on every sale.',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // GET /api/affiliates/track/:code
  // Track a referral click (redirect to site)
  // ==========================================
  app.get('/api/affiliates/track/:code', (req, res) => {
    try {
      const { code } = req.params;
      const db = loadDB();

      const affiliate = Object.values(db.affiliates).find(a => a.referral_code === code);
      if (!affiliate) {
        return res.redirect('https://devbotai.store/');
      }

      // Record click
      db.clicks.push({
        affiliate_id: affiliate.id,
        referral_code: code,
        ip: req.ip,
        user_agent: req.headers['user-agent'] || '',
        timestamp: new Date().toISOString(),
      });
      affiliate.total_clicks++;
      saveDB(db);

      // Set 90-day attribution cookie and redirect
      res.cookie('devbot_ref', code, {
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        httpOnly: true,
        sameSite: 'lax',
      });
      res.redirect(`https://devbotai.store/?ref=${code}`);
    } catch (err) {
      res.redirect('https://devbotai.store/');
    }
  });

  // ==========================================
  // POST /api/affiliates/conversion
  // Record a conversion (called after Stripe payment)
  // ==========================================
  app.post('/api/affiliates/conversion', (req, res) => {
    try {
      const { referral_code, plan, amount, customer_email, stripe_subscription_id } = req.body;

      if (!referral_code || !amount) {
        return res.status(400).json({ error: 'referral_code and amount required' });
      }

      const db = loadDB();
      const affiliate = Object.values(db.affiliates).find(a => a.referral_code === referral_code);

      if (!affiliate) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }

      const commission = amount * affiliate.commission_rate;

      db.conversions.push({
        affiliate_id: affiliate.id,
        referral_code,
        plan: plan || 'unknown',
        amount,
        commission,
        customer_email: customer_email || '',
        stripe_subscription_id: stripe_subscription_id || '',
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });

      affiliate.total_conversions++;
      affiliate.total_earnings += commission;
      affiliate.pending_payout += commission;
      saveDB(db);

      res.json({
        success: true,
        conversion: {
          plan,
          sale_amount: amount,
          commission_earned: commission,
          commission_rate: '20%',
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // GET /api/affiliates/dashboard/:code
  // Get affiliate dashboard stats
  // ==========================================
  app.get('/api/affiliates/dashboard/:code', (req, res) => {
    try {
      const { code } = req.params;
      const db = loadDB();

      const affiliate = Object.values(db.affiliates).find(a => a.referral_code === code);
      if (!affiliate) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }

      // Get recent activity
      const recentClicks = db.clicks
        .filter(c => c.affiliate_id === affiliate.id)
        .slice(-10)
        .reverse();

      const recentConversions = db.conversions
        .filter(c => c.affiliate_id === affiliate.id)
        .slice(-10)
        .reverse();

      // Calculate monthly stats
      const now = new Date();
      const thisMonth = db.conversions.filter(c => {
        return c.affiliate_id === affiliate.id &&
               new Date(c.timestamp).getMonth() === now.getMonth() &&
               new Date(c.timestamp).getFullYear() === now.getFullYear();
      });

      const monthlyEarnings = thisMonth.reduce((sum, c) => sum + c.commission, 0);

      res.json({
        success: true,
        dashboard: {
          affiliate: {
            name: affiliate.name,
            referral_code: affiliate.referral_code,
            referral_link: affiliate.referral_link,
            status: affiliate.status,
            member_since: affiliate.created_at,
          },
          stats: {
            total_clicks: affiliate.total_clicks,
            total_conversions: affiliate.total_conversions,
            conversion_rate: affiliate.total_clicks > 0
              ? ((affiliate.total_conversions / affiliate.total_clicks) * 100).toFixed(1) + '%'
              : '0%',
            total_earnings: `$${affiliate.total_earnings.toFixed(2)}`,
            pending_payout: `$${affiliate.pending_payout.toFixed(2)}`,
            monthly_earnings: `$${monthlyEarnings.toFixed(2)}`,
            commission_rate: '20% recurring',
          },
          recent_clicks: recentClicks,
          recent_conversions: recentConversions,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // GET /api/affiliates/leaderboard
  // Public affiliate leaderboard
  // ==========================================
  app.get('/api/affiliates/leaderboard', (req, res) => {
    try {
      const db = loadDB();

      const leaderboard = Object.values(db.affiliates)
        .filter(a => a.status === 'active')
        .sort((a, b) => b.total_earnings - a.total_earnings)
        .slice(0, 20)
        .map((a, i) => ({
          rank: i + 1,
          name: a.name,
          conversions: a.total_conversions,
          earnings: `$${a.total_earnings.toFixed(2)}`,
        }));

      res.json({ success: true, leaderboard });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log('[DevBot] Affiliate program routes registered');
}
