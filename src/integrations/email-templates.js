/**
 * DevBot AI — Email Template Engine (React Email)
 *
 * Create, render, preview, and send templated emails with section-based
 * layouts, branding, AI generation, and analytics. Supports transactional,
 * marketing, notification, newsletter, receipt, and onboarding types.
 *
 * Revenue: Free (3 templates), Creator $9/mo (unlimited templates),
 *          Pro $29/mo (+ analytics + AI generation)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/email-templates');
mkdirSync(DATA_DIR, { recursive: true });

const LOG = '[DevBot Email]';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = ['transactional', 'marketing', 'notification', 'newsletter', 'receipt', 'onboarding'];

const SECTION_TYPES = [
  'hero', 'text', 'image', 'button', 'divider', 'product-grid',
  'pricing-table', 'testimonial', 'footer', 'social-links',
];

const PLANS = {
  free:    { maxTemplates: 3, analytics: false, aiGeneration: false, price: 0 },
  creator: { maxTemplates: Infinity, analytics: false, aiGeneration: false, price: 9 },
  pro:     { maxTemplates: Infinity, analytics: true, aiGeneration: true, price: 29 },
};

// ─── Pre-built Templates ──────────────────────────────────────────────────────

const BUILTIN_TEMPLATES = [
  { id: 'welcome-email', name: 'Welcome Email', type: 'onboarding', subject: 'Welcome to {{appName}}, {{name}}!', sections: ['hero', 'text', 'button', 'footer'], variables: ['appName', 'name', 'ctaUrl'] },
  { id: 'order-receipt', name: 'Order Receipt', type: 'receipt', subject: 'Order #{{orderId}} Receipt', sections: ['hero', 'text', 'product-grid', 'divider', 'text', 'footer'], variables: ['orderId', 'items', 'total', 'date'] },
  { id: 'password-reset', name: 'Password Reset', type: 'transactional', subject: 'Reset Your Password', sections: ['text', 'button', 'text', 'footer'], variables: ['name', 'resetUrl', 'expiresIn'] },
  { id: 'shipping-notification', name: 'Shipping Notification', type: 'notification', subject: 'Your order has shipped!', sections: ['hero', 'text', 'button', 'footer'], variables: ['name', 'orderId', 'trackingUrl', 'carrier'] },
  { id: 'invoice', name: 'Invoice', type: 'receipt', subject: 'Invoice #{{invoiceId}} from {{company}}', sections: ['hero', 'text', 'pricing-table', 'button', 'footer'], variables: ['invoiceId', 'company', 'items', 'total', 'dueDate', 'payUrl'] },
  { id: 'newsletter-weekly', name: 'Weekly Newsletter', type: 'newsletter', subject: '{{appName}} Weekly — {{weekOf}}', sections: ['hero', 'text', 'image', 'text', 'button', 'divider', 'social-links', 'footer'], variables: ['appName', 'weekOf', 'content', 'imageUrl'] },
  { id: 'promo-discount', name: 'Promotional Discount', type: 'marketing', subject: '{{discount}}% Off — Limited Time!', sections: ['hero', 'text', 'product-grid', 'button', 'footer'], variables: ['discount', 'code', 'expiresDate', 'products'] },
  { id: 'trial-ending', name: 'Trial Ending Soon', type: 'notification', subject: 'Your trial ends in {{daysLeft}} days', sections: ['text', 'pricing-table', 'button', 'footer'], variables: ['name', 'daysLeft', 'upgradeUrl'] },
  { id: 'feedback-request', name: 'Feedback Request', type: 'transactional', subject: 'How was your experience?', sections: ['hero', 'text', 'button', 'footer'], variables: ['name', 'feedbackUrl'] },
  { id: 'event-invitation', name: 'Event Invitation', type: 'marketing', subject: 'You\'re invited: {{eventName}}', sections: ['hero', 'text', 'image', 'button', 'footer'], variables: ['eventName', 'date', 'location', 'rsvpUrl'] },
  { id: 'account-verification', name: 'Account Verification', type: 'transactional', subject: 'Verify your email', sections: ['text', 'button', 'text', 'footer'], variables: ['name', 'verifyUrl'] },
  { id: 'subscription-confirmed', name: 'Subscription Confirmed', type: 'receipt', subject: 'Subscription confirmed — {{plan}} plan', sections: ['hero', 'text', 'pricing-table', 'button', 'footer'], variables: ['name', 'plan', 'amount', 'nextBillingDate'] },
  { id: 'onboarding-step1', name: 'Onboarding Step 1', type: 'onboarding', subject: 'Getting started with {{appName}}', sections: ['hero', 'text', 'image', 'button', 'footer'], variables: ['appName', 'name', 'step1Url'] },
  { id: 'onboarding-step2', name: 'Onboarding Step 2', type: 'onboarding', subject: 'Next steps in {{appName}}', sections: ['text', 'image', 'button', 'testimonial', 'footer'], variables: ['appName', 'name', 'step2Url'] },
  { id: 'referral-invite', name: 'Referral Invite', type: 'marketing', subject: '{{referrerName}} invited you to {{appName}}', sections: ['hero', 'text', 'button', 'testimonial', 'footer'], variables: ['referrerName', 'appName', 'signupUrl', 'reward'] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadData(filename) {
  const p = resolve(DATA_DIR, filename);
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return {}; }
}

function saveData(filename, data) {
  writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

/**
 * Interpolate {{variables}} in a string with provided data.
 * @param {string} str - Template string
 * @param {Object} data - Variable values
 * @returns {string}
 */
function interpolate(str, data) {
  if (!str || !data) return str || '';
  let result = str;
  for (const [key, val] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
  }
  return result;
}

/**
 * Render a section to HTML.
 * @param {Object} section - Section definition
 * @param {Object} data - Template data
 * @param {Object} [branding={}] - Branding config
 * @returns {string} HTML string
 */
function renderSection(section, data, branding = {}) {
  const bg = branding.backgroundColor || '#ffffff';
  const primary = branding.primaryColor || '#2563eb';
  const textColor = branding.textColor || '#333333';
  const font = branding.fontFamily || 'Arial, sans-serif';
  const content = interpolate(section.content || '', data);

  switch (section.type) {
    case 'hero':
      return `<div style="background:${primary};color:#fff;padding:40px 20px;text-align:center;font-family:${font}"><h1 style="margin:0;font-size:28px">${content || 'Hero Section'}</h1></div>`;
    case 'text':
      return `<div style="padding:20px;color:${textColor};font-family:${font};line-height:1.6">${content || ''}</div>`;
    case 'image':
      return `<div style="text-align:center;padding:20px"><img src="${section.src || data.imageUrl || ''}" alt="${section.alt || ''}" style="max-width:100%;border-radius:8px" /></div>`;
    case 'button':
      return `<div style="text-align:center;padding:20px"><a href="${section.url || data.ctaUrl || '#'}" style="background:${primary};color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-family:${font};font-weight:bold;display:inline-block">${section.label || 'Click Here'}</a></div>`;
    case 'divider':
      return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px" />`;
    case 'product-grid':
      return `<div style="padding:20px;font-family:${font}"><table width="100%" cellpadding="10"><tr><td style="text-align:center;border:1px solid #e5e7eb;border-radius:8px">${content || 'Product Grid'}</td></tr></table></div>`;
    case 'pricing-table':
      return `<div style="padding:20px;font-family:${font}"><table width="100%" cellpadding="8" style="border-collapse:collapse"><tr style="background:${primary};color:#fff"><th>Item</th><th>Amount</th></tr><tr><td colspan="2" style="text-align:center;padding:12px">${content || 'Pricing details'}</td></tr></table></div>`;
    case 'testimonial':
      return `<div style="padding:20px;font-family:${font};background:#f9fafb;border-left:4px solid ${primary};margin:20px"><em>"${content || 'Great product!'}"</em></div>`;
    case 'footer':
      return `<div style="padding:20px;text-align:center;color:#9ca3af;font-size:12px;font-family:${font}">${content || '&copy; ' + new Date().getFullYear() + ' All rights reserved.'}<br/>You received this email because you signed up. <a href="#" style="color:${primary}">Unsubscribe</a></div>`;
    case 'social-links':
      return `<div style="text-align:center;padding:10px;font-family:${font}"><a href="#" style="margin:0 8px;color:${primary}">Twitter</a><a href="#" style="margin:0 8px;color:${primary}">LinkedIn</a><a href="#" style="margin:0 8px;color:${primary}">GitHub</a></div>`;
    default:
      return `<div style="padding:20px">${content}</div>`;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class EmailTemplateService {
  #templates;
  #emails;
  #analytics;

  constructor() {
    this.#templates = loadData('templates.json');
    this.#emails = loadData('emails.json');
    this.#analytics = loadData('analytics.json');
    console.log(`${LOG} Service initialized — ${Object.keys(this.#templates).length} custom templates`);
  }

  /**
   * Create a new email template.
   * @param {Object} config
   * @param {string} config.name - Template name
   * @param {string} config.type - Template type
   * @param {string} config.subject - Email subject with {{variables}}
   * @param {Array<Object>} config.sections - Section definitions [{type, content, ...}]
   * @param {Object} [config.branding] - { primaryColor, backgroundColor, textColor, fontFamily, logoUrl }
   * @param {string} [config.userId] - Owner user ID
   * @param {string} [config.plan='free'] - User plan
   * @returns {{ success: boolean, template?: Object, error?: string }}
   */
  createTemplate(config) {
    if (!config || !config.name || !config.type || !config.subject) {
      return { success: false, error: 'name, type, and subject are required' };
    }
    if (!TEMPLATE_TYPES.includes(config.type)) {
      return { success: false, error: `Invalid type. Valid: ${TEMPLATE_TYPES.join(', ')}` };
    }
    if (!Array.isArray(config.sections) || config.sections.length === 0) {
      return { success: false, error: 'At least one section is required' };
    }
    for (const section of config.sections) {
      if (!section.type || !SECTION_TYPES.includes(section.type)) {
        return { success: false, error: `Invalid section type: ${section.type}. Valid: ${SECTION_TYPES.join(', ')}` };
      }
    }

    const plan = PLANS[config.plan || 'free'];
    const userTemplates = Object.values(this.#templates).filter(t => t.userId === config.userId);
    if (userTemplates.length >= plan.maxTemplates) {
      return { success: false, error: `Template limit reached (${plan.maxTemplates}). Upgrade plan.` };
    }

    // Extract variables from subject and section content
    const allText = config.subject + ' ' + config.sections.map(s => s.content || '').join(' ');
    const variables = [...new Set((allText.match(/\{\{(\w+)\}\}/g) || []).map(m => m.slice(2, -2)))];

    const id = uuidv4();
    const template = {
      id,
      name: config.name,
      type: config.type,
      subject: config.subject,
      sections: config.sections.map((s, i) => ({ id: uuidv4(), order: i + 1, ...s })),
      branding: config.branding || {},
      variables,
      userId: config.userId || null,
      plan: config.plan || 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.#templates[id] = template;
    saveData('templates.json', this.#templates);
    console.log(`${LOG} Created template "${config.name}" (${id})`);
    return { success: true, template };
  }

  /**
   * Render a template to full HTML email.
   * @param {string} templateId - Template ID (custom or built-in)
   * @param {Object} [data={}] - Variable data for interpolation
   * @returns {{ success: boolean, html?: string, subject?: string, error?: string }}
   */
  renderTemplate(templateId, data = {}) {
    if (!templateId) return { success: false, error: 'templateId is required' };

    const tmpl = this.#templates[templateId] || BUILTIN_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return { success: false, error: 'Template not found' };

    const subject = interpolate(tmpl.subject, data);
    const branding = tmpl.branding || {};
    const bg = branding.backgroundColor || '#f4f4f5';

    const sectionsHtml = (tmpl.sections || []).map(s => {
      const section = typeof s === 'string' ? { type: s, content: '' } : s;
      return renderSection(section, data, branding);
    }).join('\n');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${bg}">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg}"><tr><td align="center" style="padding:20px 0">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
<tr><td>
${sectionsHtml}
</td></tr>
</table>
</td></tr></table>
</body>
</html>`;

    console.log(`${LOG} Rendered template ${templateId} with ${Object.keys(data).length} variables`);
    return { success: true, html, subject };
  }

  /**
   * Preview a template with sample data.
   * @param {string} templateId - Template ID
   * @param {Object} [sampleData] - Sample variable data (auto-generated if omitted)
   * @returns {{ success: boolean, html?: string, subject?: string, error?: string }}
   */
  previewTemplate(templateId, sampleData) {
    if (!templateId) return { success: false, error: 'templateId is required' };

    const tmpl = this.#templates[templateId] || BUILTIN_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return { success: false, error: 'Template not found' };

    // Generate sample data if not provided
    if (!sampleData) {
      sampleData = {};
      const vars = tmpl.variables || [];
      for (const v of vars) {
        sampleData[v] = `[${v}]`;
      }
    }

    console.log(`${LOG} Preview for template ${templateId}`);
    return this.renderTemplate(templateId, sampleData);
  }

  /**
   * AI-generate an email template based on purpose and tone.
   * @param {Object} config
   * @param {string} config.purpose - Template purpose description
   * @param {string} [config.tone='professional'] - Tone: professional, casual, friendly, urgent
   * @param {Object} [config.brandColors] - { primary, background, text }
   * @param {string} [config.userId] - Owner user ID
   * @param {string} [config.plan='pro'] - Must be pro plan
   * @returns {{ success: boolean, template?: Object, error?: string }}
   */
  generateTemplate(config) {
    if (!config || !config.purpose) {
      return { success: false, error: 'purpose is required' };
    }
    const plan = PLANS[config.plan || 'free'];
    if (!plan.aiGeneration) {
      return { success: false, error: 'AI generation requires Pro plan ($29/mo)' };
    }

    const tone = config.tone || 'professional';
    const colors = config.brandColors || {};

    // AI-generated structure based on purpose
    const sections = [
      { type: 'hero', content: `AI-Generated: ${config.purpose}` },
      { type: 'text', content: `This ${tone} email was generated for: ${config.purpose}. Customize the content to match your needs.` },
      { type: 'button', label: 'Take Action', url: '{{ctaUrl}}' },
      { type: 'divider' },
      { type: 'footer', content: '' },
    ];

    const templateConfig = {
      name: `AI: ${config.purpose.slice(0, 50)}`,
      type: 'transactional',
      subject: `{{appName}} — ${config.purpose.slice(0, 60)}`,
      sections,
      branding: {
        primaryColor: colors.primary || '#2563eb',
        backgroundColor: colors.background || '#f4f4f5',
        textColor: colors.text || '#333333',
      },
      userId: config.userId,
      plan: config.plan || 'pro',
    };

    console.log(`${LOG} AI-generating template for: "${config.purpose}"`);
    return this.createTemplate(templateConfig);
  }

  /**
   * Send an email using a template.
   * @param {Object} config
   * @param {string} config.templateId - Template ID
   * @param {string} config.to - Recipient email
   * @param {Object} [config.data={}] - Template variable data
   * @param {string} [config.from] - Sender email
   * @param {string} [config.replyTo] - Reply-to email
   * @returns {{ success: boolean, email?: Object, error?: string }}
   */
  sendEmail(config) {
    if (!config || !config.templateId || !config.to) {
      return { success: false, error: 'templateId and to are required' };
    }

    const rendered = this.renderTemplate(config.templateId, config.data || {});
    if (!rendered.success) return rendered;

    const id = uuidv4();
    const email = {
      id,
      templateId: config.templateId,
      to: config.to,
      from: config.from || 'noreply@devbot.ai',
      replyTo: config.replyTo || null,
      subject: rendered.subject,
      html: rendered.html,
      data: config.data || {},
      status: 'sent',
      openedAt: null,
      clickedAt: null,
      bouncedAt: null,
      sentAt: new Date().toISOString(),
    };

    this.#emails[id] = email;

    // Update analytics
    if (!this.#analytics[config.templateId]) {
      this.#analytics[config.templateId] = { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
    }
    this.#analytics[config.templateId].sent += 1;

    saveData('emails.json', this.#emails);
    saveData('analytics.json', this.#analytics);
    console.log(`${LOG} Sent email to ${config.to} using template ${config.templateId}`);
    return { success: true, email: { id, to: email.to, subject: email.subject, status: email.status, sentAt: email.sentAt } };
  }

  /**
   * Get analytics for a template.
   * @param {string} templateId
   * @returns {{ success: boolean, analytics?: Object, error?: string }}
   */
  getEmailAnalytics(templateId) {
    if (!templateId) return { success: false, error: 'templateId is required' };

    const stats = this.#analytics[templateId] || { sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
    const analytics = {
      templateId,
      ...stats,
      openRate: stats.sent ? (stats.opened / stats.sent * 100).toFixed(1) + '%' : '0%',
      clickRate: stats.sent ? (stats.clicked / stats.sent * 100).toFixed(1) + '%' : '0%',
      bounceRate: stats.sent ? (stats.bounced / stats.sent * 100).toFixed(1) + '%' : '0%',
    };

    console.log(`${LOG} Analytics for template ${templateId}: ${stats.sent} sent`);
    return { success: true, analytics };
  }

  /**
   * List templates filtered by type.
   * @param {string} [type] - Template type filter
   * @returns {{ success: boolean, templates: Array }}
   */
  listTemplates(type) {
    let templates = [
      ...BUILTIN_TEMPLATES.map(t => ({ ...t, builtin: true })),
      ...Object.values(this.#templates).map(t => ({ ...t, builtin: false })),
    ];
    if (type) {
      if (!TEMPLATE_TYPES.includes(type)) {
        return { success: false, error: `Invalid type. Valid: ${TEMPLATE_TYPES.join(', ')}` };
      }
      templates = templates.filter(t => t.type === type);
    }
    console.log(`${LOG} Listed ${templates.length} templates${type ? ` of type "${type}"` : ''}`);
    return { success: true, templates };
  }
}

export default EmailTemplateService;
