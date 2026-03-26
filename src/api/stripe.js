import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  solo: { name: 'DevBot AI - Solo Creator', price: 2900, interval: 'month' },
  pro: { name: 'DevBot AI - Pro Studio', price: 9900, interval: 'month' },
  enterprise: { name: 'DevBot AI - Enterprise Beast', price: 49900, interval: 'month' },
};

export function registerStripeRoutes(app) {
  // Create checkout session
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
        success_url: 'https://devbotai.store/?success=true',
        cancel_url: 'https://devbotai.store/?canceled=true',
      });

      res.json({ url: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook for Stripe events
  app.post('/api/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('[DevBot] New subscription:', event.data.object.customer_email);
          break;
        case 'customer.subscription.deleted':
          console.log('[DevBot] Subscription canceled:', event.data.object.id);
          break;
      }
      res.json({ received: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}
