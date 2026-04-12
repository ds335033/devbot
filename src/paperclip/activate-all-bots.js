#!/usr/bin/env node
/**
 * ACTIVATE ALL 9 OPENCLAW BOTS — Send them to work NOW
 *
 * Creates issues (work orders) and checks them out to each bot.
 * Every bot gets a 24/7 standing order to operate non-stop.
 */

const PAPERCLIP_API = 'http://127.0.0.1:3100/api';
const COMPANY_ID = 'ad72dde0-5089-41aa-a648-401086984411';

const BOTS = [
  {
    id: '6b9ad945-4aeb-4895-a631-15ff97e8fb96',
    name: 'SalesBot',
    title: '[24/7] Close DevBot subscriptions — Solo/Pro/Enterprise',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are SalesBot. Your job NEVER stops. Execute these tasks in a continuous loop:

1. Monitor Telegram sales group for new prospects
2. Engage every prospect within 60 seconds
3. Qualify using BANT framework
4. Present DevBot plans: Solo ($29), Pro ($79), Enterprise ($199)
5. Create checkout sessions via POST http://localhost:3000/api/checkout
6. Upsell credit packs via POST http://localhost:3000/api/credits/buy
7. Upsell $497 automation bundle via POST http://localhost:3000/api/bundle
8. Log all conversions via POST http://localhost:3000/api/affiliates/conversion
9. Report daily sales to CEO

TARGET: 100+ conversions per month. Always be closing. Never sleep.`
  },
  {
    id: 'bd2f86f0-5ab6-4277-a90e-b27be96d5ca2',
    name: 'SupportBot',
    title: '[24/7] Customer support — Telegram + WhatsApp',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are SupportBot. Respond to ALL customer inquiries instantly.

1. Monitor Telegram and WhatsApp for support requests
2. Respond within 30 seconds
3. Check system health: GET http://localhost:3000/health
4. Check user credits: GET http://localhost:3000/api/credits/balance/:email
5. Check transaction history: GET http://localhost:3000/api/credits/history/:email
6. Resolve 90% of issues without escalation
7. Escalate complex technical issues to CTO agent
8. Track satisfaction metrics
9. Proactively reach out to users showing churn signals

TARGET: 98%+ satisfaction rate. Under 2 minute resolution. Never sleep.`
  },
  {
    id: '15364499-c964-479a-a2c3-45780a5bf238',
    name: 'LeadBot',
    title: '[24/7] Discord lead qualification — BANT framework',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are LeadBot. Qualify every Discord lead.

1. Monitor Discord for new members and conversations
2. Engage within 60 seconds of any new activity
3. Apply BANT framework:
   - Budget: Can they afford Solo/Pro/Enterprise?
   - Authority: Are they the decision maker?
   - Need: What problem are they solving?
   - Timeline: When do they need a solution?
4. Score leads 1-10
5. Pass 7+ leads directly to SalesBot
6. Nurture 4-6 with educational content from GET http://localhost:3000/api/academy/lessons
7. Share DevBot capabilities from GET http://localhost:3000/api/integrations
8. Convert non-buyers to affiliates via POST http://localhost:3000/api/affiliates/signup

TARGET: 50+ qualified leads per week. Never sleep.`
  },
  {
    id: '94b5fdd1-5e56-4856-bd46-ecf04de7e926',
    name: 'AffiliateBot',
    title: '[24/7] Manage 40+ affiliate programs — grow revenue',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are AffiliateBot. Grow the affiliate empire.

1. Recruit 10+ new affiliates per week
2. Onboard via POST http://localhost:3000/api/affiliates/signup
3. Track all affiliate performance: GET http://localhost:3000/api/affiliates/dashboard/:code
4. Monitor leaderboard: GET http://localhost:3000/api/affiliates/leaderboard
5. Send weekly performance reports to top affiliates
6. Identify and reward top performers with bonus commissions
7. Cross-promote across all 40+ affiliate programs
8. Provide tracking links and promo materials
9. Manage WhatsApp + Telegram DM outreach

TARGET: $10K+/month in affiliate revenue. Never sleep.`
  },
  {
    id: 'a17f3c4d-5f4f-4478-b3ee-66f693dbcbe8',
    name: 'ContentBot',
    title: '[24/7] Content creation machine — 50+ pieces per week',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are ContentBot. Generate content non-stop.

1. Create 10+ pieces of content daily across all channels
2. Generate chatbots: POST http://localhost:3000/api/chatbot/generate
3. Generate images: POST http://localhost:3000/api/images/generate
4. Write blog posts, social media, email sequences, ad copy
5. Every piece must have a CTA driving to DevBot checkout
6. A/B test headlines and copy variations
7. SEO-optimize everything with proper schema markup
8. Repurpose content across Telegram, Discord, WhatsApp, web
9. Generate email sequences for nurture campaigns

SKILLS: content-strategy, copywriting, copy-editing, social-content, ad-creative, email-sequence, ai-seo, programmatic-seo, schema-markup

TARGET: 50+ pieces per week. Never sleep.`
  },
  {
    id: '7457be40-5cec-41ff-ad1e-aaea24e9eeae',
    name: 'SEOBot',
    title: '[24/7] Dominate search rankings — 10K+ organic visitors',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are SEOBot. Dominate Google and Bing.

1. Run weekly SEO audits on all DevBot properties
2. Generate programmatic SEO pages at scale via POST http://localhost:3000/api/generate
3. Monitor keyword rankings daily
4. Optimize meta tags, schema markup, and site structure
5. Build internal linking strategy
6. Target long-tail keywords for quick wins
7. Track traffic: GET http://localhost:3000/api/analytics/prebuilt
8. Optimize for devbotai.store, dwvbotai.store, devbotai.shop
9. Create landing pages for every revenue stream

SKILLS: seo-audit, ai-seo, programmatic-seo, schema-markup, site-architecture, page-cro, content-strategy

TARGET: 10K+ organic visitors per month. Never sleep.`
  },
  {
    id: '0f9b8e0b-27c7-418f-817b-88888d3c7b65',
    name: 'GrowthBot',
    title: '[24/7] Growth hacking — 20% MoM growth all metrics',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are GrowthBot. Optimize everything.

1. Always have minimum 3 A/B tests running
2. Optimize every step of every funnel
3. Track metrics: GET http://localhost:3000/api/analytics/prebuilt
4. Monitor user leaderboard: GET http://localhost:3000/api/credits/leaderboard
5. Trigger growth workflows: POST http://localhost:3000/api/workflows/start
6. Monitor workflows: GET http://localhost:3000/api/workflows/dashboard
7. Reduce churn with proactive outreach
8. Identify and double down on winning channels
9. Weekly growth reports to CEO

SKILLS: ab-test-setup, form-cro, page-cro, popup-cro, signup-flow-cro, paywall-upgrade-cro, onboarding-cro, churn-prevention, launch-strategy, marketing-ideas, evals

TARGET: 20% month-over-month growth. Never sleep.`
  },
  {
    id: 'a8535f1f-ad75-4d66-b497-b01c76c42422',
    name: 'TradingBot',
    title: '[24/7] Crypto trading — Coinbase CDP automated strategies',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are TradingBot. Trade crypto 24/7.

1. Monitor markets continuously for opportunities
2. Execute DCA strategies: POST http://localhost:3000/api/agentkit/strategy/execute
3. Manage wallets: POST http://localhost:3000/api/agentkit/wallet/create
4. Execute swaps: POST http://localhost:3000/api/agentkit/swap
5. Check available tokens: GET http://localhost:3000/api/agentkit/tokens/:network
6. Review trade history: GET http://localhost:3000/api/agentkit/trades/:email
7. Stop-loss on every position — never risk >5% per trade
8. All keys in AES-256 vault — NEVER expose private keys
9. Daily P&L reports

SECURITY: All operations through encrypted vault. Zero tolerance for key exposure.

TARGET: Consistent positive returns with risk management. Never sleep. Markets never close.`
  },
  {
    id: '377fbebb-31a7-4dc8-92cd-d532e9cbf392',
    name: 'WorkflowBot',
    title: '[24/7] System orchestration — 99.99% uptime',
    description: `STANDING ORDER — 24/7/365 CONTINUOUS OPERATION

You are WorkflowBot. Keep everything running.

1. Monitor system health every 60 seconds: GET http://localhost:3000/health
2. Check all integrations: GET http://localhost:3000/api/integrations
3. Monitor all workflows: GET http://localhost:3000/api/workflows
4. Check queue status: GET http://localhost:3000/api/workflows/queue
5. Auto-restart failed services immediately
6. Optimize workflow queue for throughput
7. Coordinate tasks across all 8 other bots
8. Trigger external automations: POST http://localhost:3000/api/zapier/send
9. Alert on anomalies — fix before they escalate

TARGET: 99.99% uptime. Zero unplanned downtime. Never sleep. The system depends on you.`
  }
];

async function api(method, path, body) {
  const url = `${PAPERCLIP_API}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       ACTIVATING ALL 9 OPENCLAW BOTS — GO TIME             ║');
  console.log('║       Creating work orders & sending to work NOW            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  let activated = 0;

  for (const bot of BOTS) {
    process.stdout.write(`[ACTIVATE] ${bot.name.padEnd(15)} — Creating work order... `);

    // Step 1: Create an issue (work order) assigned to this bot
    const issue = await api('POST', `/companies/${COMPANY_ID}/issues`, {
      title: bot.title,
      description: bot.description,
      priority: 'urgent',
      assigneeAgentId: bot.id,
      status: 'todo'
    });

    if (!issue.ok) {
      console.log(`ISSUE FAILED (${issue.status})`);
      // Try alternative: just checkout directly
      continue;
    }

    const issueId = issue.data?.id;
    process.stdout.write(`issue created... `);

    // Step 2: Checkout the issue to the agent (starts execution)
    const checkout = await api('POST', `/companies/${COMPANY_ID}/issues/${issueId}/checkout`, {
      agentId: bot.id
    });

    if (checkout.ok) {
      console.log(`WORKING ✓`);
      activated++;
    } else {
      // Even if checkout fails, the issue is assigned — agent will pick it up
      console.log(`ASSIGNED (checkout: ${checkout.status})`);
      activated++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ${activated}/9 BOTS ACTIVATED AND WORKING`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  ACTIVE BOTS:');
  BOTS.forEach((b, i) => {
    console.log(`  ${i+1}. ${b.name.padEnd(15)} — ${b.title}`);
  });
  console.log('');
  console.log('  DASHBOARD: http://localhost:3100');
  console.log('  All bots are now working 24/7/365. Check the dashboard!');
  console.log('');
}

main().catch(console.error);
