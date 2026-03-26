/**
 * DevBot AI — Credits System
 *
 * Users buy credits → spend on AI generations → earn rewards
 *
 * Credit Packs:
 *   Starter:    $10  →  25 credits
 *   Builder:    $25  →  75 credits  (20% bonus)
 *   Power:      $50  → 175 credits  (40% bonus)
 *   Pro:       $100  → 400 credits  (60% bonus)
 *   Beast:     $250  → 1200 credits (92% bonus)
 *   Legendary: $500  → 3000 credits (140% bonus)
 *
 * Costs:
 *   App generation:  5 credits
 *   Code review:     2 credits
 *   Refactor:        3 credits
 *
 * Rewards:
 *   Every 10 generations → 5 bonus credits
 *   Every 50 generations → 25 bonus credits + "Power Builder" badge
 *   Every 100 generations → 100 bonus credits + "Legend" badge
 *   Streak bonus: 7 consecutive days → 10 bonus credits
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/credits.json');
mkdirSync(resolve(__dirname, '../../data'), { recursive: true });

const CREDIT_PACKS = {
  starter:   { name: 'Starter Pack',   price: 1000,  credits: 25,   bonus: 0 },
  builder:   { name: 'Builder Pack',   price: 2500,  credits: 75,   bonus: 13 },
  power:     { name: 'Power Pack',     price: 5000,  credits: 175,  bonus: 50 },
  pro:       { name: 'Pro Pack',       price: 10000, credits: 400,  bonus: 150 },
  beast:     { name: 'Beast Pack',     price: 25000, credits: 1200, bonus: 575 },
  legendary: { name: 'Legendary Pack', price: 50000, credits: 3000, bonus: 1750 },
};

const ACTION_COSTS = {
  generate: 5,
  review: 2,
  refactor: 3,
};

const MILESTONES = [
  { at: 10,  reward: 5,   badge: null },
  { at: 25,  reward: 10,  badge: 'Rising Star' },
  { at: 50,  reward: 25,  badge: 'Power Builder' },
  { at: 100, reward: 100, badge: 'Legend' },
  { at: 250, reward: 300, badge: 'DevBot Master' },
  { at: 500, reward: 750, badge: 'Hall of Fame' },
];

function loadDB() {
  if (!existsSync(DB_PATH)) {
    const initial = { users: {}, transactions: [], rewards: [] };
    writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getOrCreateUser(db, email) {
  if (!db.users[email]) {
    db.users[email] = {
      email,
      credits: 0,
      totalCreditsEarned: 0,
      totalCreditsBought: 0,
      totalCreditsSpent: 0,
      totalGenerations: 0,
      totalReviews: 0,
      totalRefactors: 0,
      badges: [],
      streak: { current: 0, lastActiveDate: null },
      createdAt: new Date().toISOString(),
    };
  }
  return db.users[email];
}

function checkMilestones(user, db) {
  const total = user.totalGenerations;
  const newRewards = [];

  for (const m of MILESTONES) {
    const alreadyEarned = db.rewards.some(
      r => r.email === user.email && r.milestone === m.at
    );
    if (total >= m.at && !alreadyEarned) {
      user.credits += m.reward;
      user.totalCreditsEarned += m.reward;
      if (m.badge && !user.badges.includes(m.badge)) {
        user.badges.push(m.badge);
      }
      db.rewards.push({
        email: user.email,
        milestone: m.at,
        reward: m.reward,
        badge: m.badge,
        timestamp: new Date().toISOString(),
      });
      newRewards.push({ milestone: m.at, credits: m.reward, badge: m.badge });
    }
  }

  return newRewards;
}

function checkStreak(user) {
  const today = new Date().toISOString().split('T')[0];
  const last = user.streak.lastActiveDate;

  if (!last) {
    user.streak.current = 1;
    user.streak.lastActiveDate = today;
    return null;
  }

  const lastDate = new Date(last);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return null; // Same day
  if (diffDays === 1) {
    user.streak.current++;
    user.streak.lastActiveDate = today;
    if (user.streak.current === 7) {
      user.credits += 10;
      user.totalCreditsEarned += 10;
      user.streak.current = 0;
      return { type: 'streak', days: 7, credits: 10 };
    }
  } else {
    user.streak.current = 1;
    user.streak.lastActiveDate = today;
  }
  return null;
}

export function registerCreditsRoutes(app) {

  // GET /api/credits/packs — list available credit packs
  app.get('/api/credits/packs', (req, res) => {
    const packs = Object.entries(CREDIT_PACKS).map(([id, pack]) => ({
      id,
      name: pack.name,
      price: `$${(pack.price / 100).toFixed(0)}`,
      priceInCents: pack.price,
      credits: pack.credits,
      bonusCredits: pack.bonus,
      totalCredits: pack.credits,
      costPerCredit: `$${(pack.price / 100 / pack.credits).toFixed(2)}`,
    }));
    res.json({ success: true, packs, costs: ACTION_COSTS, milestones: MILESTONES });
  });

  // POST /api/credits/buy — purchase a credit pack
  app.post('/api/credits/buy', async (req, res) => {
    try {
      const { email, pack } = req.body;

      if (!email || !pack) {
        return res.status(400).json({ error: 'Email and pack are required.' });
      }

      const packConfig = CREDIT_PACKS[pack];
      if (!packConfig) {
        return res.status(400).json({ error: `Invalid pack. Options: ${Object.keys(CREDIT_PACKS).join(', ')}` });
      }

      // Create Stripe checkout session
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `DevBot AI — ${packConfig.name}`,
              description: `${packConfig.credits} credits for AI app generation`,
            },
            unit_amount: packConfig.price,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `https://devbotai.store/credits.html?success=true&email=${encodeURIComponent(email)}&pack=${pack}`,
        cancel_url: 'https://devbotai.store/credits.html?canceled=true',
        metadata: { email, pack, credits: String(packConfig.credits) },
      });

      res.json({ success: true, checkoutUrl: session.url, pack: packConfig });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/credits/add — add credits after successful payment (called by webhook or manually)
  app.post('/api/credits/add', (req, res) => {
    try {
      const { email, pack, transactionId } = req.body;

      if (!email || !pack) {
        return res.status(400).json({ error: 'Email and pack required.' });
      }

      const packConfig = CREDIT_PACKS[pack];
      if (!packConfig) {
        return res.status(400).json({ error: 'Invalid pack.' });
      }

      const db = loadDB();
      const user = getOrCreateUser(db, email);

      user.credits += packConfig.credits;
      user.totalCreditsBought += packConfig.credits;

      db.transactions.push({
        id: transactionId || crypto.randomUUID(),
        email,
        type: 'purchase',
        pack,
        credits: packConfig.credits,
        amount: packConfig.price,
        timestamp: new Date().toISOString(),
      });

      saveDB(db);

      res.json({
        success: true,
        message: `Added ${packConfig.credits} credits to your account!`,
        balance: user.credits,
        pack: packConfig.name,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/credits/spend — spend credits on an action
  app.post('/api/credits/spend', (req, res) => {
    try {
      const { email, action } = req.body;

      if (!email || !action) {
        return res.status(400).json({ error: 'Email and action required.' });
      }

      const cost = ACTION_COSTS[action];
      if (!cost) {
        return res.status(400).json({ error: `Invalid action. Options: ${Object.keys(ACTION_COSTS).join(', ')}` });
      }

      const db = loadDB();
      const user = getOrCreateUser(db, email);

      if (user.credits < cost) {
        return res.status(402).json({
          error: 'Insufficient credits.',
          required: cost,
          balance: user.credits,
          buyUrl: 'https://devbotai.store/credits.html',
        });
      }

      user.credits -= cost;
      user.totalCreditsSpent += cost;

      if (action === 'generate') user.totalGenerations++;
      if (action === 'review') user.totalReviews++;
      if (action === 'refactor') user.totalRefactors++;

      db.transactions.push({
        id: crypto.randomUUID(),
        email,
        type: 'spend',
        action,
        credits: -cost,
        timestamp: new Date().toISOString(),
      });

      // Check milestones
      const milestoneRewards = checkMilestones(user, db);

      // Check streak
      const streakReward = checkStreak(user);

      saveDB(db);

      const response = {
        success: true,
        action,
        creditsSpent: cost,
        balance: user.credits,
        totalGenerations: user.totalGenerations,
      };

      if (milestoneRewards.length > 0) {
        response.rewards = milestoneRewards;
        response.message = `Milestone reached! You earned ${milestoneRewards.reduce((s, r) => s + r.credits, 0)} bonus credits!`;
      }

      if (streakReward) {
        response.streakReward = streakReward;
      }

      res.json(response);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/credits/balance/:email — check credit balance and stats
  app.get('/api/credits/balance/:email', (req, res) => {
    try {
      const { email } = req.params;
      const db = loadDB();
      const user = db.users[email];

      if (!user) {
        return res.json({
          success: true,
          balance: 0,
          stats: { totalGenerations: 0, totalReviews: 0, badges: [] },
          message: 'No account found. Buy credits to get started!',
        });
      }

      // Next milestone
      const nextMilestone = MILESTONES.find(m => user.totalGenerations < m.at);

      res.json({
        success: true,
        balance: user.credits,
        stats: {
          totalCreditsBought: user.totalCreditsBought,
          totalCreditsEarned: user.totalCreditsEarned,
          totalCreditsSpent: user.totalCreditsSpent,
          totalGenerations: user.totalGenerations,
          totalReviews: user.totalReviews,
          totalRefactors: user.totalRefactors,
          badges: user.badges,
          streak: user.streak.current,
        },
        nextMilestone: nextMilestone ? {
          at: nextMilestone.at,
          remaining: nextMilestone.at - user.totalGenerations,
          reward: nextMilestone.reward,
          badge: nextMilestone.badge,
        } : null,
        costs: ACTION_COSTS,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/credits/history/:email — transaction history
  app.get('/api/credits/history/:email', (req, res) => {
    try {
      const { email } = req.params;
      const db = loadDB();

      const transactions = db.transactions
        .filter(t => t.email === email)
        .reverse()
        .slice(0, 50);

      const rewards = db.rewards
        .filter(r => r.email === email)
        .reverse();

      res.json({ success: true, transactions, rewards });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/credits/leaderboard — top users by generations
  app.get('/api/credits/leaderboard', (req, res) => {
    try {
      const db = loadDB();

      const leaderboard = Object.values(db.users)
        .sort((a, b) => b.totalGenerations - a.totalGenerations)
        .slice(0, 20)
        .map((u, i) => ({
          rank: i + 1,
          email: u.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          generations: u.totalGenerations,
          badges: u.badges,
          streak: u.streak.current,
        }));

      res.json({ success: true, leaderboard });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log('[DevBot] Credits system routes registered');
}
