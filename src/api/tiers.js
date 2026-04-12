import Stripe from 'stripe';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===== TIER DEFINITIONS =====
const TIERS = {
  basic: {
    name: 'DevBotAI Basic Affiliate',
    monthly: 1900,
    annual: 18240,   // $182.40/yr (20% off $228)
    programs: 50,
    features: [
      'access_50_programs',
      'all_category_filters',
      'earnings_calculator',
      'email_capture_access',
      'weekly_digest',
      'click_analytics',
    ],
  },
  pro: {
    name: 'DevBotAI Pro Marketer',
    monthly: 4900,
    annual: 47040,   // $470.40/yr (20% off $588)
    programs: 138,
    features: [
      'access_138_programs',
      'all_category_filters',
      'earnings_calculator',
      'email_capture_access',
      'weekly_digest',
      'click_analytics',
      'full_analytics_dashboard',
      'segmented_email_campaigns',
      'link_cloaking_50',
      'social_generator_3_platforms',
      'campaign_calendars',
      'seo_article_templates',
      'priority_support',
    ],
  },
  enterprise: {
    name: 'DevBotAI Enterprise Empire',
    monthly: 14900,
    annual: 143040,  // $1430.40/yr (20% off $1788)
    programs: 138,
    features: [
      'access_138_programs',
      'all_category_filters',
      'earnings_calculator',
      'email_capture_access',
      'weekly_digest',
      'click_analytics',
      'full_analytics_dashboard',
      'segmented_email_campaigns',
      'link_cloaking_unlimited',
      'social_generator_7_platforms',
      'campaign_calendars',
      'seo_article_templates',
      'priority_support',
      'full_api_access',
      'white_label_rights',
      'dfy_campaign_setup_first_month',
      'custom_landing_page_template',
      'dedicated_slack_channel',
      'google_ads_templates',
    ],
  },
  developer: {
    name: 'DevBotAI Developer API',
    monthly: 29900,
    annual: 287040,  // $2870.40/yr (20% off $3588)
    programs: 138,
    features: [
      'access_138_programs',
      'all_category_filters',
      'earnings_calculator',
      'email_capture_access',
      'weekly_digest',
      'click_analytics',
      'full_analytics_dashboard',
      'segmented_email_campaigns',
      'link_cloaking_unlimited',
      'social_generator_7_platforms',
      'campaign_calendars',
      'seo_article_templates',
      'priority_support',
      'full_api_access',
      'white_label_rights',
      'dfy_campaign_setup_first_month',
      'custom_landing_page_template',
      'dedicated_slack_channel',
      'google_ads_templates',
      'rest_api_10k_calls',
      'webhook_integrations',
      'bulk_link_cloaking_api',
      'database_export_json_csv',
      'custom_integration_support',
      'sdk_access',
      'sla_99_9_uptime',
    ],
  },
};

// ===== ADD-ON DEFINITIONS =====
const ADDONS = {
  setup: {
    name: 'Done-For-You Affiliate Setup',
    description: 'We configure your top 20 affiliate programs — tracking links, landing page copy, and email sequences.',
    price: 19900,
    recurring: false,
  },
  articles: {
    name: 'Monthly SEO Article Pack',
    description: '4 SEO-optimized articles per month targeting high-intent affiliate keywords.',
    price: 7900,
    recurring: true,
    interval: 'month',
  },
  coaching: {
    name: '1-on-1 Affiliate Coaching Session',
    description: '60-minute strategy call with Darren. Personalised affiliate funnel plan and 30-day action roadmap.',
    price: 14900,
    recurring: false,
  },
  landing: {
    name: 'Custom Landing Pages',
    description: 'Conversion-optimised custom landing page for one affiliate program.',
    price: 29900,
    recurring: false,
  },
  lifetime: {
    name: 'Lifetime Access Pass (Pro Tier)',
    description: 'Pro tier forever — never pay monthly again. Includes all future Pro feature updates.',
    price: 99900,
    recurring: false,
  },
};

// ===== MEMBERS DATA PATH =====
const MEMBERS_PATH = resolve(__dirname, '../../data/members.json');

function loadMembers() {
  try {
    return JSON.parse(readFileSync(MEMBERS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveMembers(data) {
  const dir = dirname(MEMBERS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(MEMBERS_PATH, JSON.stringify(data, null, 2));
}

// ===== FEATURE GATE HELPER =====
function getTierFromFeatures(features) {
  if (features.includes('rest_api_10k_calls')) return 'developer';
  if (features.includes('full_api_access')) return 'enterprise';
  if (features.includes('full_analytics_dashboard')) return 'pro';
  if (features.includes('click_analytics')) return 'basic';
  return 'free';
}

// ===== ROUTE REGISTRATION =====
export function registerTierRoutes(app) {

  // ------------------------------------------------------------------
  // POST /api/checkout/tier
  // Body: { tier: 'basic'|'pro'|'enterprise'|'developer', billing: 'monthly'|'annual' }
  // Creates a Stripe subscription checkout session and returns { url }
  // ------------------------------------------------------------------
  app.post('/api/checkout/tier', async (req, res) => {
    const { tier, billing = 'monthly' } = req.body;

    if (!TIERS[tier]) {
      return res.status(400).json({
        error: `Invalid tier. Valid values: ${Object.keys(TIERS).join(', ')}`,
      });
    }
    if (!['monthly', 'annual'].includes(billing)) {
      return res.status(400).json({ error: "billing must be 'monthly' or 'annual'" });
    }

    const tierConfig = TIERS[tier];
    const unitAmount = billing === 'annual' ? tierConfig.annual : tierConfig.monthly;
    const interval = billing === 'annual' ? 'year' : 'month';

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: tierConfig.name,
                description: `${tierConfig.programs}+ affiliate programs — ${billing} billing`,
                metadata: { tier, billing },
              },
              unit_amount: unitAmount,
              recurring: { interval },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        metadata: { tier, billing, source: 'affiliate_hub' },
        success_url: 'https://devbotai.shop/pricing.html?success=true',
        cancel_url: 'https://devbotai.shop/pricing.html',
      });

      console.log(`[Tiers] Checkout created — tier:${tier} billing:${billing} amount:${unitAmount}`);
      res.json({ url: session.url, session_id: session.id });
    } catch (err) {
      console.error('[Tiers] Checkout error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ------------------------------------------------------------------
  // POST /api/checkout/addon
  // Body: { addon: 'setup'|'articles'|'coaching'|'landing'|'lifetime' }
  // Creates a one-time or recurring Stripe checkout session
  // ------------------------------------------------------------------
  app.post('/api/checkout/addon', async (req, res) => {
    const { addon } = req.body;

    if (!ADDONS[addon]) {
      return res.status(400).json({
        error: `Invalid addon. Valid values: ${Object.keys(ADDONS).join(', ')}`,
      });
    }

    const addonConfig = ADDONS[addon];

    try {
      const lineItem = {
        price_data: {
          currency: 'usd',
          product_data: {
            name: addonConfig.name,
            description: addonConfig.description,
            metadata: { addon },
          },
          unit_amount: addonConfig.price,
        },
        quantity: 1,
      };

      // Recurring add-ons (e.g., articles) need a recurring interval
      if (addonConfig.recurring) {
        lineItem.price_data.recurring = { interval: addonConfig.interval };
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [lineItem],
        mode: addonConfig.recurring ? 'subscription' : 'payment',
        metadata: { addon, source: 'affiliate_hub_addon' },
        success_url: 'https://devbotai.shop/pricing.html?success=true',
        cancel_url: 'https://devbotai.shop/pricing.html',
      });

      console.log(`[Addons] Checkout created — addon:${addon} amount:${addonConfig.price}`);
      res.json({ url: session.url, session_id: session.id });
    } catch (err) {
      console.error('[Addons] Checkout error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ------------------------------------------------------------------
  // GET /api/tiers/info
  // Returns full tier and addon catalogue (prices in cents and dollars)
  // ------------------------------------------------------------------
  app.get('/api/tiers/info', (req, res) => {
    const tiers = Object.entries(TIERS).reduce((acc, [key, val]) => {
      acc[key] = {
        ...val,
        monthly_usd: (val.monthly / 100).toFixed(2),
        annual_usd: (val.annual / 100).toFixed(2),
        annual_monthly_equiv: ((val.annual / 12) / 100).toFixed(2),
        savings_annual: (((val.monthly * 12) - val.annual) / 100).toFixed(2),
      };
      return acc;
    }, {});

    const addons = Object.entries(ADDONS).reduce((acc, [key, val]) => {
      acc[key] = {
        ...val,
        price_usd: (val.price / 100).toFixed(2),
      };
      return acc;
    }, {});

    res.json({ tiers, addons });
  });

  // ------------------------------------------------------------------
  // GET /api/tiers/access/:email
  // Looks up the tier for a given email in data/members.json
  // Returns { email, tier, programs_allowed, features, member_since, billing }
  // Falls back to 'free' tier if not found
  // ------------------------------------------------------------------
  app.get('/api/tiers/access/:email', (req, res) => {
    const email = req.params.email?.toLowerCase().trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    const members = loadMembers();
    const member = members[email];

    if (!member) {
      // Unknown email → free tier defaults
      return res.json({
        email,
        tier: 'free',
        programs_allowed: 15,
        features: ['basic_filters', 'earnings_calculator', 'community_access'],
        member_since: null,
        billing: null,
        active: false,
      });
    }

    const tierConfig = TIERS[member.tier];
    res.json({
      email,
      tier: member.tier,
      programs_allowed: tierConfig ? tierConfig.programs : 15,
      features: tierConfig ? tierConfig.features : [],
      member_since: member.member_since,
      billing: member.billing || 'monthly',
      active: member.active !== false,
      stripe_customer_id: member.stripe_customer_id || null,
    });
  });

  // ------------------------------------------------------------------
  // Stripe Webhook — handles tier subscription events
  // Saves/updates member records in data/members.json
  // ------------------------------------------------------------------
  app.post('/api/webhook/tiers', async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET_TIERS || process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('[TiersWebhook] Signature error:', err.message);
      return res.status(400).json({ error: err.message });
    }

    const members = loadMembers();

    switch (event.type) {

      // New subscription checkout completed
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.metadata?.source !== 'affiliate_hub') break;

        const email = session.customer_details?.email?.toLowerCase();
        const tier = session.metadata?.tier;
        const billing = session.metadata?.billing || 'monthly';

        if (email && tier && TIERS[tier]) {
          members[email] = {
            email,
            tier,
            billing,
            active: true,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            member_since: members[email]?.member_since || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          saveMembers(members);
          console.log(`[TiersWebhook] Member activated — ${email} → ${tier} (${billing})`);
        }
        break;
      }

      // Subscription upgraded/changed
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.metadata?.source !== 'affiliate_hub') break;

        // Find member by stripe_customer_id
        const entry = Object.values(members).find(
          m => m.stripe_subscription_id === sub.id || m.stripe_customer_id === sub.customer
        );
        if (entry) {
          const newTier = sub.metadata?.tier || entry.tier;
          const newBilling = sub.metadata?.billing || entry.billing;
          entry.tier = newTier;
          entry.billing = newBilling;
          entry.active = sub.status === 'active';
          entry.updated_at = new Date().toISOString();
          saveMembers(members);
          console.log(`[TiersWebhook] Member updated — ${entry.email} → ${newTier}`);
        }
        break;
      }

      // Subscription cancelled or expired
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const entry = Object.values(members).find(
          m => m.stripe_subscription_id === sub.id || m.stripe_customer_id === sub.customer
        );
        if (entry) {
          entry.active = false;
          entry.tier = 'free';
          entry.cancelled_at = new Date().toISOString();
          entry.updated_at = new Date().toISOString();
          saveMembers(members);
          console.log(`[TiersWebhook] Member cancelled — ${entry.email} downgraded to free`);
        }
        break;
      }

      default:
        // Unhandled event type — ignore silently
        break;
    }

    res.json({ received: true });
  });
}
