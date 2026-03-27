// ===== DEVFONE EMAIL NOTIFICATION SYSTEM =====
// Uses SendGrid for transactional emails (order confirmation, shipping updates, welcome)
// Fallback: logs emails to console if SENDGRID_API_KEY is not set

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.DEVFONE_FROM_EMAIL || 'orders@devfone.store';
const FROM_NAME = 'DEVFONE';

// ===== SEND EMAIL VIA SENDGRID API =====
async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject) throw new Error('Email "to" and "subject" are required.');

  if (!SENDGRID_API_KEY) {
    console.log(`[DEVFONE Email] (No API key — logging only)`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Preview: ${text?.substring(0, 120)}...`);
    return { success: true, mode: 'dry_run' };
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    }),
  });

  if (res.status >= 200 && res.status < 300) {
    console.log(`[DEVFONE Email] Sent "${subject}" to ${to}`);
    return { success: true, mode: 'live' };
  } else {
    const err = await res.text();
    console.error(`[DEVFONE Email] Failed:`, err);
    throw new Error(`SendGrid error: ${res.status}`);
  }
}

// ===== EMAIL TEMPLATES =====

const baseStyle = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px; margin: 0 auto; background: #ffffff;
`;

const headerHTML = `
  <div style="background: #111827; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">DEVFONE</h1>
    <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0; letter-spacing: 1px;">BUILT FOR THE FUTURE</p>
  </div>
`;

const footerHTML = `
  <div style="background: #f5f5f7; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px;">DEVFONE &copy; 2026 — Built for the Future</p>
    <p style="color: #9ca3af; font-size: 11px; margin: 0;">
      <a href="https://devfone.store/devfone-legal.html#privacy" style="color: #2563eb; text-decoration: none;">Privacy</a> &middot;
      <a href="https://devfone.store/devfone-legal.html#terms" style="color: #2563eb; text-decoration: none;">Terms</a> &middot;
      <a href="https://devfone.store/devfone-legal.html#returns" style="color: #2563eb; text-decoration: none;">Returns</a> &middot;
      <a href="https://devfone.store/devfone-legal.html#contact" style="color: #2563eb; text-decoration: none;">Contact</a>
    </p>
    <p style="color: #d1d5db; font-size: 10px; margin-top: 12px;">South Australia, Australia</p>
  </div>
`;

// ─── ORDER CONFIRMATION ───
function orderConfirmationEmail(order) {
  const itemsHTML = (order.items || []).map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f7;">
        <strong style="color: #111827; font-size: 14px;">${item.name}</strong>
        <br><span style="color: #9ca3af; font-size: 12px;">${item.brand || 'DEVFONE'} &middot; Qty: ${item.qty || 1}</span>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f5f5f7; text-align: right; font-weight: 600; color: #111827;">
        $${((item.price || 0) * (item.qty || 1)).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('');

  const html = `
  <div style="${baseStyle}">
    ${headerHTML}
    <div style="padding: 32px 24px;">
      <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 8px;">Order Confirmed!</h2>
      <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px;">
        Thanks for shopping with DEVFONE, <strong>${order.customer?.name || 'there'}</strong>! We've received your order and it's being processed.
      </p>

      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #059669; font-size: 14px; font-weight: 600; margin: 0;">
          Order #${order.id} &middot; ${order.currency || 'AUD'} $${(order.total || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <h3 style="color: #111827; font-size: 14px; font-weight: 700; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHTML}
        <tr>
          <td style="padding: 12px 0; font-weight: 700; color: #111827;">Total</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 800; color: #2563eb; font-size: 18px;">
            $${(order.total || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </table>

      ${order.shipping_address ? `
        <h3 style="color: #111827; font-size: 14px; font-weight: 700; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Shipping To</h3>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
          ${order.shipping_address.name || order.customer?.name || ''}<br>
          ${order.shipping_address.line1 || ''}${order.shipping_address.line2 ? '<br>' + order.shipping_address.line2 : ''}<br>
          ${order.shipping_address.city || ''}, ${order.shipping_address.state || ''} ${order.shipping_address.postal_code || ''}<br>
          ${order.shipping_address.country || 'Australia'}
        </p>
      ` : ''}

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-top: 24px;">
        <p style="color: #2563eb; font-size: 13px; margin: 0;">
          <strong>What's next?</strong> We'll send you a shipping confirmation with tracking details once your order is dispatched.
          Most orders ship within 1-2 business days.
        </p>
      </div>
    </div>
    ${footerHTML}
  </div>`;

  const text = `Order Confirmed! #${order.id}\n\nThanks for your order, ${order.customer?.name || 'there'}!\nTotal: $${(order.total || 0).toFixed(2)} ${order.currency || 'AUD'}\n\nWe'll send tracking details once shipped.\n\nDEVFONE — Built for the Future`;

  return { html, text, subject: `Order Confirmed! #${order.id} — DEVFONE` };
}

// ─── SHIPPING CONFIRMATION ───
function shippingConfirmationEmail(order) {
  const html = `
  <div style="${baseStyle}">
    ${headerHTML}
    <div style="padding: 32px 24px;">
      <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 8px;">Your Order Has Shipped!</h2>
      <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px;">
        Great news, <strong>${order.customer?.name || 'there'}</strong>! Your DEVFONE order #${order.id} is on its way.
      </p>

      ${order.tracking_number ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <p style="color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Tracking Number</p>
          <p style="color: #2563eb; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: 1px;">${order.tracking_number}</p>
          ${order.tracking_url ? `<a href="${order.tracking_url}" style="display: inline-block; margin-top: 12px; padding: 10px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 100px; font-weight: 600; font-size: 14px;">Track Your Package</a>` : ''}
        </div>
      ` : ''}

      <div style="background: #f5f5f7; border-radius: 12px; padding: 16px;">
        <p style="color: #4b5563; font-size: 13px; margin: 0;">
          <strong>Estimated delivery:</strong> 3-7 business days (AU) / 10-18 business days (International)<br>
          <strong>Order total:</strong> $${(order.total || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} ${order.currency || 'AUD'}
        </p>
      </div>

      <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
        Questions? Reply to this email or contact <a href="mailto:support@devfone.store" style="color: #2563eb;">support@devfone.store</a>
      </p>
    </div>
    ${footerHTML}
  </div>`;

  const text = `Your order #${order.id} has shipped!\n\nTracking: ${order.tracking_number || 'Processing'}\n${order.tracking_url ? `Track: ${order.tracking_url}` : ''}\n\nEstimated delivery: 3-7 business days (AU)\n\nDEVFONE — Built for the Future`;

  return { html, text, subject: `Your Order Has Shipped! #${order.id} — DEVFONE` };
}

// ─── WELCOME EMAIL ───
function welcomeEmail(customer) {
  const html = `
  <div style="${baseStyle}">
    ${headerHTML}
    <div style="padding: 32px 24px; text-align: center;">
      <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 12px;">Welcome to DEVFONE!</h2>
      <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
        Hey <strong>${customer.name || 'there'}</strong>, thanks for joining the DEVFONE community. Get ready for the best tech at the best prices.
      </p>

      <a href="https://devfone.store/store.html" style="display: inline-block; padding: 14px 32px; background: #111827; color: white; text-decoration: none; border-radius: 100px; font-weight: 700; font-size: 15px;">Start Shopping</a>

      <div style="margin-top: 32px; text-align: left;">
        <h3 style="color: #111827; font-size: 14px; font-weight: 700; margin: 0 0 12px;">Why DEVFONE?</h3>
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;">&#x2713; Latest iPhones, MacBooks & Samsung Galaxy</p>
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;">&#x2713; Premium accessories at unbeatable prices</p>
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;">&#x2713; Fast Australian shipping (FREE over $99)</p>
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;">&#x2713; 30-day hassle-free returns</p>
        <p style="color: #4b5563; font-size: 13px; margin: 0;">&#x2713; Secure checkout with Stripe</p>
      </div>
    </div>
    ${footerHTML}
  </div>`;

  const text = `Welcome to DEVFONE, ${customer.name || 'there'}!\n\nShop the latest phones, laptops & accessories.\nFREE shipping over $99 AU.\n30-day hassle-free returns.\n\nhttps://devfone.store\n\nDEVFONE — Built for the Future`;

  return { html, text, subject: `Welcome to DEVFONE! Built for the Future` };
}

// ===== PUBLIC API =====
export async function sendOrderConfirmation(order) {
  const { html, text, subject } = orderConfirmationEmail(order);
  return sendEmail({ to: order.customer?.email, subject, html, text });
}

export async function sendShippingConfirmation(order) {
  const { html, text, subject } = shippingConfirmationEmail(order);
  return sendEmail({ to: order.customer?.email, subject, html, text });
}

export async function sendWelcomeEmail(customer) {
  const { html, text, subject } = welcomeEmail(customer);
  return sendEmail({ to: customer.email, subject, html, text });
}

// ===== EXPRESS ROUTES =====
export function registerEmailRoutes(app) {

  // Send test email (admin only)
  app.post('/api/store/email/test', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, to } = req.body;
    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required.' });
    }

    try {
      const sampleOrder = {
        id: 'DF-TEST-001',
        customer: { name: 'Test Customer', email: to },
        items: [
          { name: 'iPhone 16 Clear MagSafe Case', brand: 'DEVFONE', price: 24.99, qty: 2 },
          { name: 'GaN 65W Charger', brand: 'DEVFONE', price: 44.99, qty: 1 },
        ],
        total: 94.97,
        currency: 'AUD',
        shipping_address: { name: 'Test Customer', line1: '123 Test St', city: 'Adelaide', state: 'SA', postal_code: '5000', country: 'AU' },
        tracking_number: 'AU123456789',
        tracking_url: 'https://auspost.com.au/track/AU123456789',
      };

      let result;
      switch (type) {
        case 'shipping': result = await sendShippingConfirmation(sampleOrder); break;
        case 'welcome': result = await sendWelcomeEmail({ name: 'Test Customer', email: to }); break;
        default: result = await sendOrderConfirmation(sampleOrder);
      }

      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Email status
  app.get('/api/store/email/status', (req, res) => {
    res.json({
      configured: !!SENDGRID_API_KEY,
      from: FROM_EMAIL,
      templates: ['order_confirmation', 'shipping_confirmation', 'welcome'],
    });
  });
}
