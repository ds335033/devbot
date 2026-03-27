import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

const router = Router();
const DATA_DIR = 'data/dropshipping';
const PRODUCTS_FILE = `${DATA_DIR}/products.json`;
const ORDERS_FILE = `${DATA_DIR}/orders.json`;
const SETTINGS_FILE = `${DATA_DIR}/settings.json`;
const ANALYTICS_FILE = `${DATA_DIR}/analytics.json`;

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ============================================================
// DATA HELPERS
// ============================================================
function loadJson(file, fallback = []) {
  try { return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback; }
  catch { return fallback; }
}

function saveJson(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function genId() { return crypto.randomBytes(8).toString('hex'); }

// ============================================================
// CJDropshipping API Client
// ============================================================
class CJDropshippingClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://developers.cjdropshipping.com/api2.0/v1';
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async authenticate() {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

    const res = await fetch(`${this.baseUrl}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });
    const data = await res.json();
    if (data.result && data.data) {
      this.accessToken = data.data.accessToken;
      this.tokenExpiry = Date.now() + (data.data.accessTokenExpiryDate || 86400) * 1000;
      return this.accessToken;
    }
    throw new Error(data.message || 'CJ authentication failed');
  }

  async request(method, endpoint, body = null) {
    const token = await this.authenticate();
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${this.baseUrl}${endpoint}`, opts);
    const data = await res.json();
    if (!data.result) throw new Error(data.message || 'CJ API error');
    return data.data;
  }

  // Product search
  async searchProducts(query, page = 1, pageSize = 20) {
    return this.request('GET',
      `/product/list?productNameEn=${encodeURIComponent(query)}&pageNum=${page}&pageSize=${pageSize}`
    );
  }

  // Product details
  async getProduct(pid) {
    return this.request('GET', `/product/query?pid=${pid}`);
  }

  // Product variants
  async getVariants(pid) {
    return this.request('GET', `/product/variant/query?pid=${pid}`);
  }

  // Category list
  async getCategories() {
    return this.request('GET', '/product/getCategory');
  }

  // Shipping estimate
  async getShipping(startCountry, endCountry, products) {
    return this.request('POST', '/logistic/freightCalculate', {
      startCountryCode: startCountry,
      endCountryCode: endCountry,
      products,
    });
  }

  // Create order
  async createOrder(orderData) {
    return this.request('POST', '/shopping/order/createOrder', orderData);
  }

  // Get order status
  async getOrder(orderId) {
    return this.request('GET', `/shopping/order/getOrderDetail?orderId=${orderId}`);
  }

  // Get tracking
  async getTracking(orderId) {
    return this.request('GET', `/logistic/getTrackInfo?orderId=${orderId}`);
  }

  // Inventory/stock check
  async checkStock(vid) {
    return this.request('GET', `/product/stock?vid=${vid}`);
  }
}

// ============================================================
// ALIEXPRESS / DSERS MOCK CLIENT (for backup supplier)
// ============================================================
class AliExpressClient {
  constructor(appKey, appSecret) {
    this.appKey = appKey;
    this.appSecret = appSecret;
  }

  async searchProducts(query, page = 1) {
    // AliExpress Affiliate API integration
    // In production, this connects to aliexpress.com/open/api
    return { products: [], total: 0, message: 'Configure AliExpress API keys to enable' };
  }
}

// ============================================================
// BANGGOOD CLIENT (AU warehouse fast-ship)
// ============================================================
class BanggoodClient {
  constructor(appId, appSecret) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.baseUrl = 'https://api.banggood.com';
  }

  async searchProducts(query, warehouse = 'AU') {
    return { products: [], total: 0, message: 'Configure Banggood API keys to enable' };
  }
}

// ============================================================
// SUPPLIER MANAGER — Multi-supplier orchestration
// ============================================================
class SupplierManager {
  constructor() {
    this.settings = loadJson(SETTINGS_FILE, {
      cj_api_key: process.env.CJ_API_KEY || '',
      aliexpress_app_key: process.env.ALIEXPRESS_APP_KEY || '',
      aliexpress_app_secret: process.env.ALIEXPRESS_APP_SECRET || '',
      banggood_app_id: process.env.BANGGOOD_APP_ID || '',
      banggood_app_secret: process.env.BANGGOOD_APP_SECRET || '',
      default_supplier: 'cjdropshipping',
      auto_fulfill: true,
      markup_percent: 45,
      shipping_markup: 0,
      free_shipping_threshold: 99,
      store_currency: 'AUD',
      store_country: 'AU',
    });

    this.cj = new CJDropshippingClient(this.settings.cj_api_key);
    this.ali = new AliExpressClient(this.settings.aliexpress_app_key, this.settings.aliexpress_app_secret);
    this.banggood = new BanggoodClient(this.settings.banggood_app_id, this.settings.banggood_app_secret);
  }

  getSupplier(name) {
    switch (name) {
      case 'cjdropshipping': return this.cj;
      case 'aliexpress': return this.ali;
      case 'banggood': return this.banggood;
      default: return this.cj;
    }
  }

  calculateRetailPrice(costPrice) {
    const markup = this.settings.markup_percent / 100;
    return Math.ceil(costPrice * (1 + markup) * 100) / 100;
  }

  updateSettings(updates) {
    Object.assign(this.settings, updates);
    saveJson(SETTINGS_FILE, this.settings);
    // Re-init clients with new keys
    this.cj = new CJDropshippingClient(this.settings.cj_api_key);
  }
}

const supplier = new SupplierManager();

// ============================================================
// PRODUCT CATALOG MANAGEMENT
// ============================================================

// Import product from supplier to DEVFONE catalog
router.post('/products/import', async (req, res) => {
  try {
    const { supplier_pid, supplier_name, custom_name, custom_price, category } = req.body;
    if (!supplier_pid) return res.status(400).json({ error: 'supplier_pid required' });

    const sup = supplier.getSupplier(supplier_name || 'cjdropshipping');
    let productData;

    try {
      productData = await sup.getProduct(supplier_pid);
    } catch (e) {
      // If API fails, allow manual product creation
      productData = null;
    }

    const products = loadJson(PRODUCTS_FILE, []);
    const product = {
      id: genId(),
      supplier: supplier_name || 'cjdropshipping',
      supplier_pid,
      name: custom_name || productData?.productNameEn || 'New Product',
      description: productData?.description || '',
      category: category || 'accessories',
      cost_price: productData?.sellPrice || 0,
      retail_price: custom_price || supplier.calculateRetailPrice(productData?.sellPrice || 0),
      images: productData?.productImageSet || [],
      variants: productData?.variantList || [],
      stock: productData?.stock || 999,
      active: true,
      featured: false,
      badge: null,
      specs: [],
      imported_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    products.push(product);
    saveJson(PRODUCTS_FILE, products);

    res.json({ success: true, product });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search supplier products
router.get('/products/search', async (req, res) => {
  try {
    const { q, supplier: supName, page } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query (q) required' });

    const sup = supplier.getSupplier(supName || 'cjdropshipping');
    const results = await sup.searchProducts(q, parseInt(page) || 1);
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all DEVFONE catalog products
router.get('/products', (req, res) => {
  const products = loadJson(PRODUCTS_FILE, []);
  const { category, active, featured } = req.query;

  let filtered = products;
  if (category) filtered = filtered.filter(p => p.category === category);
  if (active !== undefined) filtered = filtered.filter(p => p.active === (active === 'true'));
  if (featured !== undefined) filtered = filtered.filter(p => p.featured === (featured === 'true'));

  res.json({
    success: true,
    products: filtered,
    total: filtered.length,
    stats: {
      total: products.length,
      active: products.filter(p => p.active).length,
      featured: products.filter(p => p.featured).length,
      avg_margin: products.length > 0
        ? Math.round(products.reduce((s, p) => s + ((p.retail_price - p.cost_price) / p.retail_price * 100), 0) / products.length)
        : 0,
    },
  });
});

// Update product
router.put('/products/:id', (req, res) => {
  const products = loadJson(PRODUCTS_FILE, []);
  const idx = products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const allowed = ['name', 'description', 'category', 'retail_price', 'active', 'featured', 'badge', 'specs', 'images'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) products[idx][key] = req.body[key];
  }
  products[idx].updated_at = new Date().toISOString();
  saveJson(PRODUCTS_FILE, products);

  res.json({ success: true, product: products[idx] });
});

// Delete product
router.delete('/products/:id', (req, res) => {
  let products = loadJson(PRODUCTS_FILE, []);
  const before = products.length;
  products = products.filter(p => p.id !== req.params.id);
  if (products.length === before) return res.status(404).json({ error: 'Product not found' });
  saveJson(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// Bulk import products
router.post('/products/bulk-import', async (req, res) => {
  try {
    const { product_ids, supplier_name } = req.body;
    if (!product_ids?.length) return res.status(400).json({ error: 'product_ids array required' });

    const products = loadJson(PRODUCTS_FILE, []);
    const imported = [];
    const errors = [];

    for (const pid of product_ids) {
      try {
        const sup = supplier.getSupplier(supplier_name || 'cjdropshipping');
        const data = await sup.getProduct(pid);
        const product = {
          id: genId(),
          supplier: supplier_name || 'cjdropshipping',
          supplier_pid: pid,
          name: data?.productNameEn || pid,
          description: data?.description || '',
          category: 'accessories',
          cost_price: data?.sellPrice || 0,
          retail_price: supplier.calculateRetailPrice(data?.sellPrice || 0),
          images: data?.productImageSet || [],
          variants: data?.variantList || [],
          stock: data?.stock || 999,
          active: true,
          featured: false,
          badge: null,
          specs: [],
          imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        products.push(product);
        imported.push(product);
      } catch (e) {
        errors.push({ pid, error: e.message });
      }
    }

    saveJson(PRODUCTS_FILE, products);
    res.json({ success: true, imported: imported.length, errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// ORDER MANAGEMENT & AUTO-FULFILLMENT
// ============================================================

// Create order (from storefront checkout)
router.post('/orders', async (req, res) => {
  try {
    const { customer, items, shipping_address, payment_method } = req.body;
    if (!customer || !items?.length || !shipping_address) {
      return res.status(400).json({ error: 'customer, items, and shipping_address required' });
    }

    const catalog = loadJson(PRODUCTS_FILE, []);
    const orders = loadJson(ORDERS_FILE, []);

    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = catalog.find(p => p.id === item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      const lineTotal = product.retail_price * (item.qty || 1);
      subtotal += lineTotal;
      return {
        product_id: product.id,
        supplier: product.supplier,
        supplier_pid: product.supplier_pid,
        name: product.name,
        qty: item.qty || 1,
        cost_price: product.cost_price,
        retail_price: product.retail_price,
        line_total: lineTotal,
        variant: item.variant || null,
      };
    });

    const shipping = subtotal >= supplier.settings.free_shipping_threshold ? 0 : 9.95;
    const total = subtotal + shipping;
    const profit = orderItems.reduce((s, i) => s + ((i.retail_price - i.cost_price) * i.qty), 0);

    const order = {
      id: `DF-${Date.now().toString(36).toUpperCase()}`,
      customer,
      items: orderItems,
      shipping_address,
      payment_method: payment_method || 'stripe',
      subtotal,
      shipping,
      total,
      profit,
      currency: supplier.settings.store_currency,
      status: 'pending',
      supplier_order_id: null,
      tracking_number: null,
      tracking_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fulfilled_at: null,
      delivered_at: null,
    };

    orders.push(order);
    saveJson(ORDERS_FILE, orders);

    // Auto-fulfill if enabled
    if (supplier.settings.auto_fulfill) {
      try {
        await fulfillOrder(order, orders);
      } catch (e) {
        console.error(`[DEVFONE] Auto-fulfill failed for ${order.id}:`, e.message);
        // Order still created, just not fulfilled yet
      }
    }

    // Update analytics
    updateAnalytics(order);

    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fulfill an order (send to supplier)
async function fulfillOrder(order, orders) {
  // Group items by supplier
  const supplierGroups = {};
  for (const item of order.items) {
    if (!supplierGroups[item.supplier]) supplierGroups[item.supplier] = [];
    supplierGroups[item.supplier].push(item);
  }

  for (const [supName, items] of Object.entries(supplierGroups)) {
    const sup = supplier.getSupplier(supName);

    if (supName === 'cjdropshipping' && supplier.settings.cj_api_key) {
      try {
        const cjOrder = await sup.createOrder({
          orderNumber: order.id,
          shippingCountryCode: supplier.settings.store_country,
          shippingProvince: order.shipping_address.state,
          shippingCity: order.shipping_address.city,
          shippingAddress: order.shipping_address.line1,
          shippingCustomerName: order.customer.name,
          shippingPhone: order.customer.phone,
          shippingZip: order.shipping_address.postcode,
          products: items.map(i => ({
            vid: i.supplier_pid,
            quantity: i.qty,
          })),
        });

        order.supplier_order_id = cjOrder?.orderId || null;
        order.status = 'processing';
      } catch (e) {
        console.error(`[DEVFONE] CJ order failed:`, e.message);
        order.status = 'fulfillment_failed';
      }
    } else {
      order.status = 'awaiting_fulfillment';
    }
  }

  order.updated_at = new Date().toISOString();
  saveJson(ORDERS_FILE, orders);
}

// Manual fulfill trigger
router.post('/orders/:id/fulfill', async (req, res) => {
  try {
    const orders = loadJson(ORDERS_FILE, []);
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await fulfillOrder(order, orders);
    res.json({ success: true, order });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all orders
router.get('/orders', (req, res) => {
  const orders = loadJson(ORDERS_FILE, []);
  const { status, limit } = req.query;

  let filtered = orders;
  if (status) filtered = filtered.filter(o => o.status === status);
  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (limit) filtered = filtered.slice(0, parseInt(limit));

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalProfit = orders.reduce((s, o) => s + o.profit, 0);
  const totalOrders = orders.length;

  res.json({
    success: true,
    orders: filtered,
    stats: {
      total_orders: totalOrders,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_profit: Math.round(totalProfit * 100) / 100,
      avg_order_value: totalOrders > 0 ? Math.round(totalRevenue / totalOrders * 100) / 100 : 0,
      avg_margin: totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
    },
  });
});

// Get single order
router.get('/orders/:id', (req, res) => {
  const orders = loadJson(ORDERS_FILE, []);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ success: true, order });
});

// Update order status
router.put('/orders/:id', (req, res) => {
  const orders = loadJson(ORDERS_FILE, []);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { status, tracking_number, tracking_url } = req.body;
  if (status) order.status = status;
  if (tracking_number) order.tracking_number = tracking_number;
  if (tracking_url) order.tracking_url = tracking_url;
  if (status === 'shipped') order.fulfilled_at = new Date().toISOString();
  if (status === 'delivered') order.delivered_at = new Date().toISOString();
  order.updated_at = new Date().toISOString();

  saveJson(ORDERS_FILE, orders);
  res.json({ success: true, order });
});

// Track order
router.get('/orders/:id/tracking', async (req, res) => {
  try {
    const orders = loadJson(ORDERS_FILE, []);
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.supplier_order_id && supplier.settings.cj_api_key) {
      const tracking = await supplier.cj.getTracking(order.supplier_order_id);
      res.json({ success: true, tracking, order_status: order.status });
    } else {
      res.json({ success: true, tracking: null, order_status: order.status });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SHIPPING CALCULATOR
// ============================================================
router.post('/shipping/calculate', async (req, res) => {
  try {
    const { items, country } = req.body;
    const catalog = loadJson(PRODUCTS_FILE, []);
    let subtotal = 0;

    for (const item of items) {
      const product = catalog.find(p => p.id === item.product_id);
      if (product) subtotal += product.retail_price * (item.qty || 1);
    }

    // Free shipping threshold
    if (subtotal >= supplier.settings.free_shipping_threshold) {
      return res.json({ success: true, shipping: 0, method: 'Free Express', days: '7-12' });
    }

    // Try CJ shipping estimate
    if (supplier.settings.cj_api_key) {
      try {
        const estimate = await supplier.cj.getShipping('CN', country || 'AU',
          items.map(i => ({ quantity: i.qty || 1, vid: i.variant_id || '' }))
        );
        return res.json({ success: true, shipping: estimate, days: '7-15' });
      } catch {}
    }

    // Default shipping rates
    const rates = {
      AU: { standard: 9.95, express: 14.95, days_standard: '10-18', days_express: '7-12' },
      US: { standard: 12.95, express: 19.95, days_standard: '12-20', days_express: '8-14' },
      GB: { standard: 11.95, express: 17.95, days_standard: '12-22', days_express: '8-15' },
      DEFAULT: { standard: 14.95, express: 24.95, days_standard: '15-25', days_express: '10-18' },
    };

    const rate = rates[country] || rates.DEFAULT;
    res.json({ success: true, rates: rate });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// ANALYTICS
// ============================================================
function updateAnalytics(order) {
  const analytics = loadJson(ANALYTICS_FILE, {
    daily: {},
    total_revenue: 0,
    total_profit: 0,
    total_orders: 0,
    total_items_sold: 0,
  });

  const day = new Date().toISOString().split('T')[0];
  if (!analytics.daily[day]) {
    analytics.daily[day] = { revenue: 0, profit: 0, orders: 0, items: 0 };
  }

  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  analytics.daily[day].revenue += order.total;
  analytics.daily[day].profit += order.profit;
  analytics.daily[day].orders += 1;
  analytics.daily[day].items += itemCount;
  analytics.total_revenue += order.total;
  analytics.total_profit += order.profit;
  analytics.total_orders += 1;
  analytics.total_items_sold += itemCount;

  saveJson(ANALYTICS_FILE, analytics);
}

router.get('/analytics', (req, res) => {
  const analytics = loadJson(ANALYTICS_FILE, {
    daily: {}, total_revenue: 0, total_profit: 0, total_orders: 0, total_items_sold: 0,
  });

  // Last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({
      date: key,
      revenue: analytics.daily[key]?.revenue || 0,
      profit: analytics.daily[key]?.profit || 0,
      orders: analytics.daily[key]?.orders || 0,
      items: analytics.daily[key]?.items || 0,
    });
  }

  const products = loadJson(PRODUCTS_FILE, []);

  res.json({
    success: true,
    totals: {
      revenue: Math.round(analytics.total_revenue * 100) / 100,
      profit: Math.round(analytics.total_profit * 100) / 100,
      orders: analytics.total_orders,
      items_sold: analytics.total_items_sold,
      products_listed: products.length,
      active_products: products.filter(p => p.active).length,
      avg_margin: analytics.total_revenue > 0
        ? Math.round(analytics.total_profit / analytics.total_revenue * 100)
        : 0,
    },
    daily: days,
  });
});

// ============================================================
// SETTINGS
// ============================================================
router.get('/settings', (req, res) => {
  const safe = { ...supplier.settings };
  // Mask API keys in response
  if (safe.cj_api_key) safe.cj_api_key = safe.cj_api_key.substring(0, 8) + '***';
  if (safe.aliexpress_app_key) safe.aliexpress_app_key = safe.aliexpress_app_key.substring(0, 8) + '***';
  if (safe.banggood_app_id) safe.banggood_app_id = safe.banggood_app_id.substring(0, 8) + '***';
  res.json({ success: true, settings: safe });
});

router.put('/settings', (req, res) => {
  const allowed = [
    'cj_api_key', 'aliexpress_app_key', 'aliexpress_app_secret',
    'banggood_app_id', 'banggood_app_secret', 'default_supplier',
    'auto_fulfill', 'markup_percent', 'shipping_markup',
    'free_shipping_threshold', 'store_currency', 'store_country',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  supplier.updateSettings(updates);
  res.json({ success: true, message: 'Settings updated' });
});

// ============================================================
// INVENTORY SYNC (check stock levels with supplier)
// ============================================================
router.post('/inventory/sync', async (req, res) => {
  try {
    const products = loadJson(PRODUCTS_FILE, []);
    const updated = [];
    const errors = [];

    for (const product of products) {
      if (product.supplier === 'cjdropshipping' && supplier.settings.cj_api_key) {
        try {
          const stock = await supplier.cj.checkStock(product.supplier_pid);
          const oldStock = product.stock;
          product.stock = stock?.stockQuantity || 0;
          if (product.stock !== oldStock) {
            updated.push({ id: product.id, name: product.name, old: oldStock, new: product.stock });
          }
          // Auto-disable out of stock
          if (product.stock === 0) product.active = false;
        } catch (e) {
          errors.push({ id: product.id, error: e.message });
        }
      }
    }

    saveJson(PRODUCTS_FILE, products);
    res.json({ success: true, updated: updated.length, changes: updated, errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// STORE API — Public endpoints for the DEVFONE storefront
// ============================================================

// Get store products (public, no cost prices)
router.get('/store/products', (req, res) => {
  const products = loadJson(PRODUCTS_FILE, []);
  const active = products.filter(p => p.active);

  const publicProducts = active.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.retail_price,
    images: p.images,
    specs: p.specs,
    badge: p.badge,
    featured: p.featured,
    stock: p.stock > 0 ? 'in_stock' : 'out_of_stock',
  }));

  res.json({ success: true, products: publicProducts });
});

// ============================================================
// EXPORT
// ============================================================
export function registerDropshippingRoutes(app) {
  app.use('/api/dropship', router);
  console.log('[DEVFONE] Dropshipping API loaded — CJ, AliExpress, Banggood');
}
