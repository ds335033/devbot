import Stripe from 'stripe';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendOrderConfirmation } from './email.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===== DEVBOT SUBSCRIPTION PLANS =====
const PLANS = {
  solo: { name: 'DevBot AI - Solo Creator', price: 2900, interval: 'month' },
  pro: { name: 'DevBot AI - Pro Studio', price: 9900, interval: 'month' },
  enterprise: { name: 'DevBot AI - Enterprise Beast', price: 49900, interval: 'month' },
};

// ===== DEVFONE STORE HELPERS =====
const ORDERS_PATH = resolve(__dirname, '../../data/dropshipping/orders.json');
const ANALYTICS_PATH = resolve(__dirname, '../../data/dropshipping/analytics.json');

function loadJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function saveJSON(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function generateOrderId() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DF-${ts}-${rand}`;
}

export function registerStripeRoutes(app) {

  // ===== DEVBOT SUBSCRIPTION CHECKOUT =====
  app.post('/api/checkout', async (req, res) => {
    const { plan } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan. Use: solo, pro, or enterprise' });
    }
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: planConfig.name },
            unit_amount: planConfig.price,
            recurring: { interval: planConfig.interval },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: 'https://devbotai.shop/?success=true',
        cancel_url: 'https://devbotai.shop/?canceled=true',
      });
      res.json({ url: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== DEVFONE STORE CHECKOUT =====
  app.post('/api/store/checkout', async (req, res) => {
    const { items, customer } = req.body;

    // Validate
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart items are required.' });
    }
    if (!customer || !customer.email) {
      return res.status(400).json({ error: 'Customer email is required.' });
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 items per order.' });
    }

    try {
      // Build Stripe line items from cart
      const line_items = items.map(item => {
        if (!item.name || !item.price || !item.qty) {
          throw new Error('Each item must have name, price, and qty.');
        }
        if (item.price < 1 || item.price > 100000) {
          throw new Error(`Invalid price for ${item.name}.`);
        }
        if (item.qty < 1 || item.qty > 10) {
          throw new Error(`Invalid quantity for ${item.name}. Max 10 per item.`);
        }
        return {
          price_data: {
            currency: 'aud',
            product_data: {
              name: item.name,
              metadata: { product_id: String(item.id || ''), brand: item.brand || '' },
            },
            unit_amount: Math.round(item.price * 100), // cents
          },
          quantity: item.qty,
        };
      });

      // Calculate if free shipping applies
      const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0);
      if (subtotal < 99) {
        line_items.push({
          price_data: {
            currency: 'aud',
            product_data: { name: 'Standard Shipping' },
            unit_amount: 995, // $9.95
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        customer_email: customer.email,
        shipping_address_collection: {
          allowed_countries: ['AU', 'NZ', 'US', 'GB', 'CA', 'SG', 'JP'],
        },
        metadata: {
          store: 'devfone',
          item_count: String(items.length),
          customer_name: customer.name || '',
        },
        success_url: 'https://devfone.store/store.html?order=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://devfone.store/store.html?order=canceled',
      });

      res.json({ success: true, url: session.url, session_id: session.id });
    } catch (err) {
      console.error('[DEVFONE] Checkout error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ===== ORDER STATUS CHECK =====
  app.get('/api/store/order/:sessionId', async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
        expand: ['line_items', 'shipping_details'],
      });
      res.json({
        success: true,
        status: session.payment_status,
        customer_email: session.customer_details?.email,
        shipping: session.shipping_details,
        amount_total: session.amount_total / 100,
        currency: session.currency?.toUpperCase(),
      });
    } catch (err) {
      res.status(404).json({ error: 'Order not found.' });
    }
  });

  // ===== WEBHOOK (handles both DevBot subs and DEVFONE orders) =====
  app.post('/api/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        // DevBot subscriptions
        case 'checkout.session.completed': {
          const session = event.data.object;

          if (session.metadata?.store === 'devfone') {
            // ─── DEVFONE store order ───
            console.log('[DEVFONE] Order completed:', session.customer_details?.email);
            const orders = loadJSON(ORDERS_PATH) || [];
            const order = {
              id: generateOrderId(),
              type: 'customer',
              stripe_session_id: session.id,
              customer: {
                name: session.metadata?.customer_name || session.customer_details?.name || '',
                email: session.customer_details?.email || '',
                phone: session.customer_details?.phone || '',
              },
              shipping_address: session.shipping_details?.address || {},
              payment_method: 'stripe',
              total: (session.amount_total || 0) / 100,
              currency: (session.currency || 'aud').toUpperCase(),
              status: 'paid',
              stripe_payment_intent: session.payment_intent,
              notes: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              fulfilled_at: null,
              delivered_at: null,
            };
            orders.push(order);
            saveJSON(ORDERS_PATH, orders);

            // Update analytics
            const analytics = loadJSON(ANALYTICS_PATH) || { daily: {}, total_revenue: 0, total_orders: 0 };
            const today = new Date().toISOString().split('T')[0];
            if (!analytics.daily[today]) analytics.daily[today] = { revenue: 0, orders: 0 };
            analytics.daily[today].revenue += order.total;
            analytics.daily[today].orders += 1;
            analytics.total_revenue += order.total;
            analytics.total_orders += 1;
            saveJSON(ANALYTICS_PATH, analytics);

            console.log(`[DEVFONE] Order ${order.id} saved — $${order.total} AUD`);

            // Send order confirmation email
            try {
              await sendOrderConfirmation(order);
            } catch (emailErr) {
              console.error('[DEVFONE] Email send failed:', emailErr.message);
            }
          } else {
            // DevBot subscription
            console.log('[DevBot] New subscription:', session.customer_email);
          }
          break;
        }

        case 'customer.subscription.deleted':
          console.log('[DevBot] Subscription canceled:', event.data.object.id);
          break;

        case 'payment_intent.payment_failed':
          console.log('[DEVFONE] Payment failed:', event.data.object.last_payment_error?.message);
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Stripe] Webhook error:', err.message);
      res.status(400).json({ error: err.message });
    }
  });
}
