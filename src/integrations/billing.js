/**
 * DevBot AI — Billing & Invoicing Integration
 *
 * Kill Bill + Crater unified billing, invoicing, subscriptions,
 * expense tracking, and revenue analytics.
 *
 * Revenue: Free (5 invoices/mo), Pro $9.99/mo (unlimited + recurring),
 *          Business $29.99/mo (+ expense tracking + analytics)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/billing');
const INVOICES_PATH = resolve(DATA_DIR, 'invoices.json');
const SUBSCRIPTIONS_PATH = resolve(DATA_DIR, 'subscriptions.json');
const QUOTES_PATH = resolve(DATA_DIR, 'quotes.json');
const EXPENSES_PATH = resolve(DATA_DIR, 'expenses.json');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Constants ────────────────────────────────────────────────────────────
const PREFIX = '[DevBot Billing]';
const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'];
const BILLING_CYCLES = ['monthly', 'quarterly', 'annual'];
const SEND_METHODS = ['email', 'slack', 'link'];

const TAX_RATES = {
  AU: { default: 10, name: 'GST' },
  US: { default: 0, states: { CA: 7.25, NY: 8, TX: 6.25, FL: 6, WA: 6.5 }, name: 'Sales Tax' },
  GB: { default: 20, name: 'VAT' },
  EU: { default: 21, name: 'VAT' },
  CA: { default: 5, provinces: { ON: 13, QC: 14.975, BC: 12, AB: 5 }, name: 'GST/HST' },
  JP: { default: 10, name: 'Consumption Tax' },
};

const PLANS = {
  free: { name: 'Free', price: 0, maxInvoicesPerMonth: 5, recurring: false, expenses: false, analytics: false },
  pro: { name: 'Pro', price: 9.99, maxInvoicesPerMonth: Infinity, recurring: true, expenses: false, analytics: false },
  business: { name: 'Business', price: 29.99, maxInvoicesPerMonth: Infinity, recurring: true, expenses: true, analytics: true },
};

export class BillingService {
  /** @type {Object} */
  #engine;
  /** @type {Object} */
  #invoices;
  /** @type {Object} */
  #subscriptions;
  /** @type {Object} */
  #quotes;
  /** @type {Object} */
  #expenses;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#invoices = this.#loadJSON(INVOICES_PATH, []);
    this.#subscriptions = this.#loadJSON(SUBSCRIPTIONS_PATH, []);
    this.#quotes = this.#loadJSON(QUOTES_PATH, []);
    this.#expenses = this.#loadJSON(EXPENSES_PATH, []);
    console.log(`${PREFIX} Service initialized — ${this.#invoices.length} invoices, ${this.#subscriptions.length} subscriptions`);
  }

  /**
   * Create a new invoice.
   * @param {Object} config - Invoice configuration
   * @param {string} config.customerId - Customer ID
   * @param {Object[]} config.items - Line items
   * @param {string} config.items[].description - Item description
   * @param {number} config.items[].quantity - Quantity
   * @param {number} config.items[].unitPrice - Unit price
   * @param {number} [config.items[].tax] - Tax percentage for this item
   * @param {string} [config.currency='AUD'] - Invoice currency
   * @param {string} [config.dueDate] - Due date (ISO string)
   * @param {string} [config.notes] - Invoice notes
   * @returns {{ success: boolean, invoice?: Object, error?: string }}
   */
  createInvoice(config) {
    try {
      if (!config || !config.customerId) {
        return { success: false, error: 'Customer ID is required' };
      }
      if (!config.items || !Array.isArray(config.items) || config.items.length === 0) {
        return { success: false, error: 'At least one line item is required' };
      }

      for (const item of config.items) {
        if (!item.description) return { success: false, error: 'Each item must have a description' };
        if (item.quantity == null || item.quantity <= 0) return { success: false, error: 'Each item must have a positive quantity' };
        if (item.unitPrice == null || item.unitPrice < 0) return { success: false, error: 'Each item must have a valid unit price' };
      }

      const currency = config.currency || 'AUD';
      const lineItems = config.items.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        const taxRate = item.tax || 0;
        const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
        return {
          id: uuidv4(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: parseFloat(subtotal.toFixed(2)),
          taxRate,
          taxAmount,
          total: parseFloat((subtotal + taxAmount).toFixed(2)),
        };
      });

      const subtotal = lineItems.reduce((sum, i) => sum + i.subtotal, 0);
      const totalTax = lineItems.reduce((sum, i) => sum + i.taxAmount, 0);
      const totalAmount = lineItems.reduce((sum, i) => sum + i.total, 0);

      const invoice = {
        id: uuidv4(),
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
        customerId: config.customerId,
        items: lineItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        currency,
        status: 'draft',
        dueDate: config.dueDate || new Date(Date.now() + 30 * 86400000).toISOString(),
        notes: config.notes || '',
        sentAt: null,
        paidAt: null,
        paymentDetails: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.#invoices.push(invoice);
      this.#saveJSON(INVOICES_PATH, this.#invoices);

      console.log(`${PREFIX} Invoice created: ${invoice.invoiceNumber} — ${currency} ${totalAmount.toFixed(2)} [${invoice.id}]`);
      return { success: true, invoice };
    } catch (err) {
      console.error(`${PREFIX} Error creating invoice:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send an invoice to the customer.
   * @param {string} invoiceId - Invoice ID
   * @param {'email'|'slack'|'link'} [method='email'] - Delivery method
   * @returns {{ success: boolean, invoice?: Object, deliveryUrl?: string, error?: string }}
   */
  sendInvoice(invoiceId, method = 'email') {
    try {
      if (!invoiceId) {
        return { success: false, error: 'Invoice ID is required' };
      }
      if (!SEND_METHODS.includes(method)) {
        return { success: false, error: `Method must be one of: ${SEND_METHODS.join(', ')}` };
      }

      const idx = this.#invoices.findIndex(i => i.id === invoiceId);
      if (idx === -1) {
        return { success: false, error: 'Invoice not found' };
      }

      const invoice = this.#invoices[idx];
      invoice.status = 'sent';
      invoice.sentAt = new Date().toISOString();
      invoice.updatedAt = new Date().toISOString();
      this.#saveJSON(INVOICES_PATH, this.#invoices);

      const deliveryUrl = `https://devbot.app/invoices/${invoice.id}`;
      console.log(`${PREFIX} Invoice sent: ${invoice.invoiceNumber} via ${method}`);
      return { success: true, invoice, deliveryUrl, method };
    } catch (err) {
      console.error(`${PREFIX} Error sending invoice:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Mark an invoice as paid.
   * @param {string} invoiceId - Invoice ID
   * @param {Object} [paymentDetails] - Payment details (method, reference, etc.)
   * @returns {{ success: boolean, invoice?: Object, error?: string }}
   */
  markPaid(invoiceId, paymentDetails = {}) {
    try {
      if (!invoiceId) {
        return { success: false, error: 'Invoice ID is required' };
      }

      const idx = this.#invoices.findIndex(i => i.id === invoiceId);
      if (idx === -1) {
        return { success: false, error: 'Invoice not found' };
      }

      const invoice = this.#invoices[idx];
      invoice.status = 'paid';
      invoice.paidAt = new Date().toISOString();
      invoice.paymentDetails = paymentDetails;
      invoice.updatedAt = new Date().toISOString();
      this.#saveJSON(INVOICES_PATH, this.#invoices);

      console.log(`${PREFIX} Invoice paid: ${invoice.invoiceNumber} — ${invoice.currency} ${invoice.totalAmount}`);
      return { success: true, invoice };
    } catch (err) {
      console.error(`${PREFIX} Error marking paid:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a subscription for a customer.
   * @param {Object} config - Subscription configuration
   * @param {string} config.customerId - Customer ID
   * @param {string} config.planId - Plan ID
   * @param {'monthly'|'quarterly'|'annual'} [config.billingCycle='monthly'] - Billing cycle
   * @param {number} [config.trialDays=0] - Trial period in days
   * @returns {{ success: boolean, subscription?: Object, error?: string }}
   */
  createSubscription(config) {
    try {
      if (!config || !config.customerId) {
        return { success: false, error: 'Customer ID is required' };
      }
      if (!config.planId) {
        return { success: false, error: 'Plan ID is required' };
      }

      const billingCycle = config.billingCycle || 'monthly';
      if (!BILLING_CYCLES.includes(billingCycle)) {
        return { success: false, error: `Billing cycle must be one of: ${BILLING_CYCLES.join(', ')}` };
      }

      const trialDays = config.trialDays || 0;
      const now = new Date();
      const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null;
      const startDate = trialEnd || now;

      const cycleMs = { monthly: 30 * 86400000, quarterly: 90 * 86400000, annual: 365 * 86400000 };
      const nextBillingDate = new Date(startDate.getTime() + cycleMs[billingCycle]);

      const subscription = {
        id: uuidv4(),
        customerId: config.customerId,
        planId: config.planId,
        billingCycle,
        status: trialDays > 0 ? 'trialing' : 'active',
        trialDays,
        trialEndsAt: trialEnd ? trialEnd.toISOString() : null,
        currentPeriodStart: startDate.toISOString(),
        currentPeriodEnd: nextBillingDate.toISOString(),
        nextBillingDate: nextBillingDate.toISOString(),
        cancelledAt: null,
        cancellationReason: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      this.#subscriptions.push(subscription);
      this.#saveJSON(SUBSCRIPTIONS_PATH, this.#subscriptions);

      console.log(`${PREFIX} Subscription created: ${subscription.id} — ${billingCycle} (${trialDays > 0 ? `${trialDays}-day trial` : 'no trial'})`);
      return { success: true, subscription };
    } catch (err) {
      console.error(`${PREFIX} Error creating subscription:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Cancel a subscription.
   * @param {string} subscriptionId - Subscription ID
   * @param {string} [reason] - Cancellation reason
   * @returns {{ success: boolean, subscription?: Object, error?: string }}
   */
  cancelSubscription(subscriptionId, reason = '') {
    try {
      if (!subscriptionId) {
        return { success: false, error: 'Subscription ID is required' };
      }

      const idx = this.#subscriptions.findIndex(s => s.id === subscriptionId);
      if (idx === -1) {
        return { success: false, error: 'Subscription not found' };
      }

      const sub = this.#subscriptions[idx];
      sub.status = 'cancelled';
      sub.cancelledAt = new Date().toISOString();
      sub.cancellationReason = reason;
      sub.updatedAt = new Date().toISOString();
      this.#saveJSON(SUBSCRIPTIONS_PATH, this.#subscriptions);

      console.log(`${PREFIX} Subscription cancelled: ${sub.id} — reason: ${reason || 'none given'}`);
      return { success: true, subscription: sub };
    } catch (err) {
      console.error(`${PREFIX} Error cancelling subscription:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get revenue dashboard for a period.
   * @param {string} [period='month'] - Period: 'week', 'month', 'quarter', 'year', 'all'
   * @returns {{ success: boolean, dashboard?: Object, error?: string }}
   */
  getRevenueDashboard(period = 'month') {
    try {
      const now = new Date();
      const periodMs = {
        week: 7 * 86400000,
        month: 30 * 86400000,
        quarter: 90 * 86400000,
        year: 365 * 86400000,
        all: Infinity,
      };
      const cutoff = periodMs[period] === Infinity
        ? new Date(0)
        : new Date(now.getTime() - (periodMs[period] || periodMs.month));

      const periodInvoices = this.#invoices.filter(i =>
        i.status === 'paid' && new Date(i.paidAt) >= cutoff
      );

      const totalRevenue = periodInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const activeSubs = this.#subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
      const cancelledSubs = this.#subscriptions.filter(s => s.status === 'cancelled' && new Date(s.cancelledAt) >= cutoff);

      // MRR: sum of active subscriptions (simplified as count * average)
      const mrr = activeSubs.length > 0 ? parseFloat((totalRevenue / (periodMs[period] / (30 * 86400000) || 1)).toFixed(2)) : 0;
      const totalSubs = this.#subscriptions.length;
      const churnRate = totalSubs > 0 ? parseFloat(((cancelledSubs.length / totalSubs) * 100).toFixed(1)) : 0;
      const arpu = activeSubs.length > 0 ? parseFloat((totalRevenue / activeSubs.length).toFixed(2)) : 0;
      const ltv = churnRate > 0 ? parseFloat((arpu / (churnRate / 100)).toFixed(2)) : 0;

      const dashboard = {
        period,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        mrr,
        activeSubscriptions: activeSubs.length,
        churnRate,
        ltv,
        arpu,
        invoicesPaid: periodInvoices.length,
        invoicesOutstanding: this.#invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length,
        generatedAt: now.toISOString(),
      };

      console.log(`${PREFIX} Revenue dashboard generated for period: ${period}`);
      return { success: true, dashboard };
    } catch (err) {
      console.error(`${PREFIX} Error generating dashboard:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate an expense report for a user.
   * @param {string} userId - User ID
   * @param {Object} dateRange - Date range
   * @param {string} dateRange.start - Start date (ISO)
   * @param {string} dateRange.end - End date (ISO)
   * @returns {{ success: boolean, report?: Object, error?: string }}
   */
  generateExpenseReport(userId, dateRange) {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }
      if (!dateRange || !dateRange.start || !dateRange.end) {
        return { success: false, error: 'Date range with start and end is required' };
      }

      const userExpenses = this.#expenses.filter(e =>
        e.userId === userId &&
        e.date >= dateRange.start &&
        e.date <= dateRange.end
      );

      const categories = {};
      let totalAmount = 0;
      for (const expense of userExpenses) {
        const cat = expense.category || 'uncategorized';
        if (!categories[cat]) categories[cat] = { total: 0, count: 0, items: [] };
        categories[cat].total += expense.amount;
        categories[cat].count += 1;
        categories[cat].items.push(expense);
        totalAmount += expense.amount;
      }

      const report = {
        id: uuidv4(),
        userId,
        dateRange,
        totalExpenses: userExpenses.length,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        categories,
        generatedAt: new Date().toISOString(),
      };

      console.log(`${PREFIX} Expense report generated for user ${userId}: ${userExpenses.length} expenses`);
      return { success: true, report };
    } catch (err) {
      console.error(`${PREFIX} Error generating expense report:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a professional quote for a customer.
   * @param {Object} config - Quote configuration
   * @param {string} config.customerId - Customer ID
   * @param {Object[]} config.items - Line items (description, quantity, unitPrice, tax)
   * @param {string} [config.validUntil] - Quote validity date (ISO)
   * @param {string} [config.notes] - Quote notes
   * @returns {{ success: boolean, quote?: Object, error?: string }}
   */
  createQuote(config) {
    try {
      if (!config || !config.customerId) {
        return { success: false, error: 'Customer ID is required' };
      }
      if (!config.items || !Array.isArray(config.items) || config.items.length === 0) {
        return { success: false, error: 'At least one line item is required' };
      }

      const lineItems = config.items.map(item => {
        const subtotal = (item.quantity || 1) * (item.unitPrice || 0);
        const taxRate = item.tax || 0;
        const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
        return {
          id: uuidv4(),
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          subtotal: parseFloat(subtotal.toFixed(2)),
          taxRate,
          taxAmount,
          total: parseFloat((subtotal + taxAmount).toFixed(2)),
        };
      });

      const totalAmount = lineItems.reduce((sum, i) => sum + i.total, 0);

      const quote = {
        id: uuidv4(),
        quoteNumber: `QTE-${Date.now().toString(36).toUpperCase()}`,
        customerId: config.customerId,
        items: lineItems,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        status: 'pending',
        validUntil: config.validUntil || new Date(Date.now() + 14 * 86400000).toISOString(),
        notes: config.notes || '',
        convertedToInvoiceId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.#quotes.push(quote);
      this.#saveJSON(QUOTES_PATH, this.#quotes);

      console.log(`${PREFIX} Quote created: ${quote.quoteNumber} — ${totalAmount.toFixed(2)} [${quote.id}]`);
      return { success: true, quote };
    } catch (err) {
      console.error(`${PREFIX} Error creating quote:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Convert a quote to an invoice.
   * @param {string} quoteId - Quote ID
   * @returns {{ success: boolean, invoice?: Object, quote?: Object, error?: string }}
   */
  convertQuoteToInvoice(quoteId) {
    try {
      if (!quoteId) {
        return { success: false, error: 'Quote ID is required' };
      }

      const qIdx = this.#quotes.findIndex(q => q.id === quoteId);
      if (qIdx === -1) {
        return { success: false, error: 'Quote not found' };
      }

      const quote = this.#quotes[qIdx];
      if (quote.convertedToInvoiceId) {
        return { success: false, error: `Quote already converted to invoice: ${quote.convertedToInvoiceId}` };
      }

      // Create invoice from quote items
      const result = this.createInvoice({
        customerId: quote.customerId,
        items: quote.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tax: item.taxRate,
        })),
        notes: quote.notes ? `Converted from ${quote.quoteNumber}. ${quote.notes}` : `Converted from ${quote.quoteNumber}`,
      });

      if (!result.success) {
        return result;
      }

      quote.status = 'converted';
      quote.convertedToInvoiceId = result.invoice.id;
      quote.updatedAt = new Date().toISOString();
      this.#saveJSON(QUOTES_PATH, this.#quotes);

      console.log(`${PREFIX} Quote ${quote.quoteNumber} converted to invoice ${result.invoice.invoiceNumber}`);
      return { success: true, invoice: result.invoice, quote };
    } catch (err) {
      console.error(`${PREFIX} Error converting quote:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * List invoices with optional filters.
   * @param {Object} [filters] - Filter options
   * @param {string} [filters.status] - Filter by status (draft, sent, paid, overdue)
   * @param {string} [filters.customerId] - Filter by customer
   * @param {string} [filters.startDate] - Filter after this date (ISO)
   * @param {string} [filters.endDate] - Filter before this date (ISO)
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=20] - Items per page
   * @returns {{ success: boolean, invoices?: Object[], total?: number, page?: number, totalPages?: number, error?: string }}
   */
  listInvoices(filters = {}) {
    try {
      let invoices = [...this.#invoices];

      if (filters.status) {
        if (!INVOICE_STATUSES.includes(filters.status)) {
          return { success: false, error: `Status must be one of: ${INVOICE_STATUSES.join(', ')}` };
        }
        invoices = invoices.filter(i => i.status === filters.status);
      }
      if (filters.customerId) {
        invoices = invoices.filter(i => i.customerId === filters.customerId);
      }
      if (filters.startDate) {
        invoices = invoices.filter(i => i.createdAt >= filters.startDate);
      }
      if (filters.endDate) {
        invoices = invoices.filter(i => i.createdAt <= filters.endDate);
      }

      const total = invoices.length;
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paged = invoices.slice(start, start + limit);

      return { success: true, invoices: paged, total, page, totalPages };
    } catch (err) {
      console.error(`${PREFIX} Error listing invoices:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Calculate tax for an amount based on country and state/province.
   * @param {number} amount - Base amount
   * @param {string} country - Country code (AU, US, GB, EU, CA, JP)
   * @param {string} [state] - State/province code
   * @returns {{ success: boolean, tax?: Object, error?: string }}
   */
  calculateTax(amount, country, state) {
    try {
      if (amount == null || typeof amount !== 'number' || amount < 0) {
        return { success: false, error: 'Valid positive amount is required' };
      }
      if (!country) {
        return { success: false, error: 'Country code is required' };
      }

      const countryTax = TAX_RATES[country.toUpperCase()];
      if (!countryTax) {
        return { success: false, error: `Unsupported country: ${country}. Supported: ${Object.keys(TAX_RATES).join(', ')}` };
      }

      let rate = countryTax.default;
      if (state && countryTax.states && countryTax.states[state.toUpperCase()]) {
        rate = countryTax.states[state.toUpperCase()];
      }
      if (state && countryTax.provinces && countryTax.provinces[state.toUpperCase()]) {
        rate = countryTax.provinces[state.toUpperCase()];
      }

      const taxAmount = parseFloat((amount * (rate / 100)).toFixed(2));
      const totalAmount = parseFloat((amount + taxAmount).toFixed(2));

      const tax = {
        baseAmount: amount,
        country: country.toUpperCase(),
        state: state ? state.toUpperCase() : null,
        taxName: countryTax.name,
        taxRate: rate,
        taxAmount,
        totalAmount,
      };

      console.log(`${PREFIX} Tax calculated: ${country}${state ? '/' + state : ''} ${rate}% on ${amount} = ${taxAmount}`);
      return { success: true, tax };
    } catch (err) {
      console.error(`${PREFIX} Error calculating tax:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ─── Registry Entry ─────────────────────────────────────────────────────

  /** @returns {Object} Registry entry for this integration */
  static get registryEntry() {
    return {
      id: 'billing',
      name: 'Billing & Invoicing (Kill Bill + Crater)',
      repo_url: '',
      type: 'app',
      status: 'active',
      capabilities: [
        'create_invoice', 'send_invoice', 'mark_paid',
        'create_subscription', 'cancel_subscription',
        'revenue_dashboard', 'expense_report',
        'create_quote', 'convert_quote', 'list_invoices',
        'calculate_tax',
      ],
      config: {
        invoiceStatuses: INVOICE_STATUSES,
        billingCycles: BILLING_CYCLES,
        taxCountries: Object.keys(TAX_RATES),
        plans: PLANS,
      },
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  /** @param {string} path @param {*} fallback */
  #loadJSON(path, fallback) {
    try {
      if (existsSync(path)) {
        return JSON.parse(readFileSync(path, 'utf-8'));
      }
    } catch (err) {
      console.error(`${PREFIX} Failed to load ${path}:`, err.message);
    }
    return fallback;
  }

  /** @param {string} path @param {*} data */
  #saveJSON(path, data) {
    try {
      writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error(`${PREFIX} Failed to save ${path}:`, err.message);
    }
  }
}

export default BillingService;
