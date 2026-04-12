import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BUNDLE = {
  name: 'DevBotAI Affiliate Automation Bundle',
  description: 'The Complete Affiliate Marketing Automation Kit — 128+ affiliate programs, social media scripts, SEO templates, campaign scheduler, Google Ads templates, analytics dashboard, Slack bot, and Zapier workflows.',
  amount: 49700, // $497.00 in cents
  currency: 'usd',
};

export function registerBundleRoutes(app) {

  // ── POST /api/checkout/bundle ──────────────────────────────────────────────
  // Creates a Stripe one-time Checkout Session for the $497 bundle.
  // Returns { url } — the hosted Stripe Checkout page URL.
  app.post('/api/checkout/bundle', async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: BUNDLE.currency,
              product_data: {
                name: BUNDLE.name,
                description: BUNDLE.description,
                images: ['https://devbotai.shop/og-bundle.png'],
              },
              unit_amount: BUNDLE.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://devbotai.shop/bundle-success.html?session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  'https://devbotai.shop/bundle.html',
        metadata: {
          product: 'affiliate_automation_bundle',
          version: '1.0',
        },
        // Collect customer email for post-purchase delivery
        customer_creation: 'always',
        // Allow promo codes entered at checkout
        allow_promotion_codes: true,
      });

      return res.json({ url: session.url });
    } catch (err) {
      console.error('[bundle] Stripe checkout error:', err.message);
      return res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
    }
  });

  // ── GET /api/bundle/info ───────────────────────────────────────────────────
  // Returns bundle details and current pricing for display on the storefront.
  app.get('/api/bundle/info', (req, res) => {
    return res.json({
      id: 'affiliate_automation_bundle',
      name: BUNDLE.name,
      description: BUNDLE.description,
      pricing: {
        current:  BUNDLE.amount,          // cents — $497
        original: 149700,                 // cents — $1,497 (crossed-out price)
        currency: BUNDLE.currency,
        display: {
          current:  '$497',
          original: '$1,497',
          savings:  '$1,000',
          type:     'one-time',
        },
      },
      includes: [
        { id: 'affiliate_db',       name: '128+ Curated Affiliate Program Database',         value: '$197' },
        { id: 'social_scripts',     name: 'Auto-posting Social Media Scripts (7 platforms)', value: '$247' },
        { id: 'seo_generator',      name: 'SEO Article Generator (4 template types)',        value: '$197' },
        { id: 'campaign_scheduler', name: 'Campaign Scheduler (weekly + monthly calendars)', value: '$97'  },
        { id: 'google_ads',         name: 'Google Ads Campaign Templates ($300 → $2.7K ROI)',value: '$297' },
        { id: 'analytics_dashboard',name: 'Conversion Tracking Analytics Dashboard',        value: '$197' },
        { id: 'slack_bot',          name: 'Slack Bot Integration for Real-time Alerts',      value: '$97'  },
        { id: 'zapier_templates',   name: 'Zapier Workflow Templates (5 automations)',       value: '$97'  },
      ],
      guarantee: {
        days: 30,
        label: '30-Day Money-Back Guarantee',
      },
      checkout_url: '/api/checkout/bundle',
    });
  });

}
