/**
 * DevBot AI — Shopify Deep Sync Integration
 *
 * Shopify-specific deep integration for product sync, order sync,
 * inventory management, discounts, AI-generated Liquid themes,
 * and abandoned cart recovery flows.
 *
 * Revenue: $39/mo per connected store, $99/mo with AI features
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/shopify');
const STORES_PATH = resolve(DATA_DIR, 'stores.json');
const SYNCED_PRODUCTS_PATH = resolve(DATA_DIR, 'synced-products.json');
const SYNCED_ORDERS_PATH = resolve(DATA_DIR, 'synced-orders.json');
const DISCOUNTS_PATH = resolve(DATA_DIR, 'discounts.json');
const CART_FLOWS_PATH = resolve(DATA_DIR, 'cart-flows.json');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Constants ────────────────────────────────────────────────────────────
const PREFIX = '[DevBot Shopify]';
const DISCOUNT_TYPES = ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'];

const PLANS = {
  standard: { name: 'Standard', price: 39, aiFeatures: false },
  ai: { name: 'AI Enhanced', price: 99, aiFeatures: true },
};

export class ShopifySyncService {
  /** @type {Object} */
  #engine;
  /** @type {Object} */
  #stores;
  /** @type {Object} */
  #syncedProducts;
  /** @type {Object} */
  #syncedOrders;
  /** @type {Object[]} */
  #discounts;
  /** @type {Object[]} */
  #cartFlows;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance for AI-powered features
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#stores = this.#loadJSON(STORES_PATH, {});
    this.#syncedProducts = this.#loadJSON(SYNCED_PRODUCTS_PATH, {});
    this.#syncedOrders = this.#loadJSON(SYNCED_ORDERS_PATH, {});
    this.#discounts = this.#loadJSON(DISCOUNTS_PATH, []);
    this.#cartFlows = this.#loadJSON(CART_FLOWS_PATH, []);
    console.log(`${PREFIX} Service initialized — ${Object.keys(this.#stores).length} connected stores`);
  }

  /**
   * Connect a Shopify store.
   * @param {Object} config - Connection configuration
   * @param {string} config.shopDomain - Shopify store domain (e.g., mystore.myshopify.com)
   * @param {string} config.accessToken - Shopify Admin API access token
   * @returns {{ success: boolean, store?: Object, error?: string }}
   */
  connectStore(config) {
    try {
      if (!config || !config.shopDomain) {
        return { success: false, error: 'Shop domain is required' };
      }
      if (!config.accessToken) {
        return { success: false, error: 'Access token is required' };
      }

      // Normalize domain
      let domain = config.shopDomain.toLowerCase().trim();
      if (!domain.includes('.myshopify.com')) {
        domain = `${domain}.myshopify.com`;
      }

      // Check for existing connection
      const existing = Object.values(this.#stores).find(s => s.shopDomain === domain);
      if (existing) {
        return { success: false, error: `Store ${domain} is already connected [${existing.id}]` };
      }

      const store = {
        id: uuidv4(),
        shopDomain: domain,
        accessToken: config.accessToken,
        plan: 'standard',
        status: 'connected',
        productsSynced: 0,
        ordersSynced: 0,
        lastProductSync: null,
        lastOrderSync: null,
        lastInventorySync: null,
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.#stores[store.id] = store;
      this.#syncedProducts[store.id] = [];
      this.#syncedOrders[store.id] = [];
      this.#saveAll();

      console.log(`${PREFIX} Store connected: ${domain} [${store.id}]`);
      return { success: true, store: { ...store, accessToken: '***' } };
    } catch (err) {
      console.error(`${PREFIX} Error connecting store:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync all products from Shopify into DevBot catalog.
   * @param {string} storeId - Connected store ID
   * @returns {Promise<{ success: boolean, synced?: number, products?: Object[], error?: string }>}
   */
  async syncProducts(storeId) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }

      const store = this.#stores[storeId];

      // Simulate Shopify API pull (in production, this calls Shopify Admin API)
      const mockProducts = this.#generateMockShopifyProducts(store.shopDomain);

      if (!this.#syncedProducts[storeId]) this.#syncedProducts[storeId] = [];

      for (const product of mockProducts) {
        const existingIdx = this.#syncedProducts[storeId].findIndex(p => p.shopifyId === product.shopifyId);
        if (existingIdx >= 0) {
          this.#syncedProducts[storeId][existingIdx] = { ...product, syncedAt: new Date().toISOString() };
        } else {
          this.#syncedProducts[storeId].push({ ...product, syncedAt: new Date().toISOString() });
        }
      }

      store.productsSynced = this.#syncedProducts[storeId].length;
      store.lastProductSync = new Date().toISOString();
      store.updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} Products synced from ${store.shopDomain}: ${mockProducts.length} products`);
      return { success: true, synced: mockProducts.length, products: this.#syncedProducts[storeId] };
    } catch (err) {
      console.error(`${PREFIX} Error syncing products:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Push DevBot products to Shopify.
   * @param {string} storeId - Connected store ID
   * @param {string[]} productIds - Product IDs to push
   * @returns {Promise<{ success: boolean, pushed?: number, results?: Object[], error?: string }>}
   */
  async pushProducts(storeId, productIds) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return { success: false, error: 'At least one product ID is required' };
      }

      const store = this.#stores[storeId];
      const results = productIds.map(productId => ({
        productId,
        shopifyId: `gid://shopify/Product/${Date.now() + Math.floor(Math.random() * 10000)}`,
        status: 'pushed',
        pushedAt: new Date().toISOString(),
      }));

      store.updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} Products pushed to ${store.shopDomain}: ${results.length} products`);
      return { success: true, pushed: results.length, results };
    } catch (err) {
      console.error(`${PREFIX} Error pushing products:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync recent orders from Shopify.
   * @param {string} storeId - Connected store ID
   * @returns {Promise<{ success: boolean, synced?: number, orders?: Object[], error?: string }>}
   */
  async syncOrders(storeId) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }

      const store = this.#stores[storeId];

      // Simulate Shopify order pull
      const mockOrders = this.#generateMockShopifyOrders(store.shopDomain);

      if (!this.#syncedOrders[storeId]) this.#syncedOrders[storeId] = [];

      for (const order of mockOrders) {
        const existingIdx = this.#syncedOrders[storeId].findIndex(o => o.shopifyOrderId === order.shopifyOrderId);
        if (existingIdx >= 0) {
          this.#syncedOrders[storeId][existingIdx] = { ...order, syncedAt: new Date().toISOString() };
        } else {
          this.#syncedOrders[storeId].push({ ...order, syncedAt: new Date().toISOString() });
        }
      }

      store.ordersSynced = this.#syncedOrders[storeId].length;
      store.lastOrderSync = new Date().toISOString();
      store.updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} Orders synced from ${store.shopDomain}: ${mockOrders.length} orders`);
      return { success: true, synced: mockOrders.length, orders: this.#syncedOrders[storeId] };
    } catch (err) {
      console.error(`${PREFIX} Error syncing orders:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync real-time inventory levels from Shopify.
   * @param {string} storeId - Connected store ID
   * @returns {Promise<{ success: boolean, inventory?: Object[], lastSync?: string, error?: string }>}
   */
  async syncInventory(storeId) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }

      const store = this.#stores[storeId];
      const products = this.#syncedProducts[storeId] || [];

      // Simulate inventory sync
      const inventory = products.map(p => ({
        productId: p.shopifyId || p.id,
        productName: p.title || p.name,
        inventoryLevel: Math.floor(Math.random() * 200),
        available: Math.floor(Math.random() * 150),
        reserved: Math.floor(Math.random() * 20),
        locationId: `loc_${uuidv4().slice(0, 8)}`,
        updatedAt: new Date().toISOString(),
      }));

      store.lastInventorySync = new Date().toISOString();
      store.updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} Inventory synced for ${store.shopDomain}: ${inventory.length} items`);
      return { success: true, inventory, lastSync: store.lastInventorySync };
    } catch (err) {
      console.error(`${PREFIX} Error syncing inventory:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a discount code on Shopify.
   * @param {string} storeId - Connected store ID
   * @param {Object} config - Discount configuration
   * @param {string} config.code - Discount code
   * @param {'percentage'|'fixed'|'free_shipping'|'buy_x_get_y'} config.type - Discount type
   * @param {number} [config.value] - Discount value (percentage or fixed amount)
   * @param {number} [config.minPurchase] - Minimum purchase amount
   * @param {string} [config.expiresAt] - Expiry date (ISO string)
   * @returns {{ success: boolean, discount?: Object, error?: string }}
   */
  createDiscount(storeId, config) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }
      if (!config || !config.code) {
        return { success: false, error: 'Discount code is required' };
      }
      if (!config.type || !DISCOUNT_TYPES.includes(config.type)) {
        return { success: false, error: `Discount type must be one of: ${DISCOUNT_TYPES.join(', ')}` };
      }

      // Validate value for types that require it
      if ((config.type === 'percentage' || config.type === 'fixed') && (config.value == null || config.value <= 0)) {
        return { success: false, error: 'Discount value is required for percentage and fixed types' };
      }
      if (config.type === 'percentage' && config.value > 100) {
        return { success: false, error: 'Percentage discount cannot exceed 100%' };
      }

      const store = this.#stores[storeId];
      const discount = {
        id: uuidv4(),
        storeId,
        code: config.code.toUpperCase(),
        type: config.type,
        value: config.value || 0,
        minPurchase: config.minPurchase || 0,
        expiresAt: config.expiresAt || null,
        usageCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.#discounts.push(discount);
      this.#saveJSON(DISCOUNTS_PATH, this.#discounts);

      console.log(`${PREFIX} Discount created: ${discount.code} (${discount.type}: ${discount.value}) for ${store.shopDomain}`);
      return { success: true, discount };
    } catch (err) {
      console.error(`${PREFIX} Error creating discount:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get Shopify store analytics.
   * @param {string} storeId - Connected store ID
   * @returns {{ success: boolean, analytics?: Object, error?: string }}
   */
  getShopifyAnalytics(storeId) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }

      const store = this.#stores[storeId];
      const orders = this.#syncedOrders[storeId] || [];
      const products = this.#syncedProducts[storeId] || [];

      const totalSales = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const completedOrders = orders.filter(o => o.financialStatus === 'paid').length;
      const conversionRate = orders.length > 0 ? parseFloat(((completedOrders / orders.length) * 100).toFixed(1)) : 0;

      // Top products by order count
      const productOrders = {};
      for (const order of orders) {
        for (const item of (order.lineItems || [])) {
          productOrders[item.title] = (productOrders[item.title] || 0) + (item.quantity || 1);
        }
      }
      const topProducts = Object.entries(productOrders)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, unitsSold]) => ({ name, unitsSold }));

      const analytics = {
        storeId,
        shopDomain: store.shopDomain,
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalOrders: orders.length,
        completedOrders,
        conversionRate,
        totalProducts: products.length,
        topProducts,
        averageOrderValue: orders.length > 0 ? parseFloat((totalSales / orders.length).toFixed(2)) : 0,
        lastProductSync: store.lastProductSync,
        lastOrderSync: store.lastOrderSync,
        lastInventorySync: store.lastInventorySync,
        generatedAt: new Date().toISOString(),
      };

      console.log(`${PREFIX} Analytics generated for: ${store.shopDomain}`);
      return { success: true, analytics };
    } catch (err) {
      console.error(`${PREFIX} Error getting analytics:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate AI-powered Shopify Liquid theme sections.
   * @param {Object} config - Theme configuration
   * @param {string} config.sectionType - Section type (hero, featured-collection, testimonials, newsletter, etc.)
   * @param {string} [config.style] - Design style preference
   * @param {string} [config.colorScheme] - Color scheme
   * @returns {Promise<{ success: boolean, theme?: Object, error?: string }>}
   */
  async generateShopifyTheme(config) {
    try {
      if (!config || !config.sectionType) {
        return { success: false, error: 'Section type is required' };
      }

      const sectionType = config.sectionType;
      const style = config.style || 'modern, clean';
      const colorScheme = config.colorScheme || 'neutral';

      if (!this.#engine) {
        // Generate a template Liquid section
        const liquidTemplate = this.#generateFallbackLiquidSection(sectionType, style);
        console.log(`${PREFIX} Generated fallback Liquid section: ${sectionType}`);
        return {
          success: true,
          theme: {
            sectionType,
            liquid: liquidTemplate,
            style,
            colorScheme,
            generatedAt: new Date().toISOString(),
          },
        };
      }

      const prompt = `Generate a Shopify Liquid theme section for a "${sectionType}" section.
Style: ${style}
Color scheme: ${colorScheme}
Include: Liquid template code with schema settings, CSS, and section configuration.
Return clean, production-ready Liquid code.`;

      const result = await this.#engine.generateText(prompt);

      console.log(`${PREFIX} AI Liquid theme generated: ${sectionType}`);
      return {
        success: true,
        theme: {
          sectionType,
          liquid: result,
          style,
          colorScheme,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error(`${PREFIX} Error generating theme:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create an automated abandoned cart recovery email flow.
   * @param {string} storeId - Connected store ID
   * @returns {{ success: boolean, flow?: Object, error?: string }}
   */
  createAbandonedCartFlow(storeId) {
    try {
      if (!storeId || !this.#stores[storeId]) {
        return { success: false, error: 'Invalid store ID' };
      }

      const store = this.#stores[storeId];

      // Check if flow already exists
      const existing = this.#cartFlows.find(f => f.storeId === storeId && f.status === 'active');
      if (existing) {
        return { success: false, error: `Abandoned cart flow already active for this store [${existing.id}]` };
      }

      const flow = {
        id: uuidv4(),
        storeId,
        shopDomain: store.shopDomain,
        status: 'active',
        steps: [
          {
            order: 1,
            delay: '1 hour',
            delayMs: 3600000,
            subject: 'You left something behind!',
            type: 'email',
            template: 'abandoned-cart-reminder-1',
            description: 'Initial reminder with cart contents and direct checkout link',
          },
          {
            order: 2,
            delay: '24 hours',
            delayMs: 86400000,
            subject: 'Your cart is waiting for you',
            type: 'email',
            template: 'abandoned-cart-reminder-2',
            description: 'Second reminder with social proof and urgency',
          },
          {
            order: 3,
            delay: '72 hours',
            delayMs: 259200000,
            subject: 'Last chance — 10% off your cart',
            type: 'email',
            template: 'abandoned-cart-discount',
            description: 'Final reminder with 10% discount incentive',
            discountCode: `COMEBACK-${uuidv4().slice(0, 6).toUpperCase()}`,
            discountValue: 10,
          },
        ],
        stats: {
          emailsSent: 0,
          recovered: 0,
          revenueRecovered: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.#cartFlows.push(flow);
      this.#saveJSON(CART_FLOWS_PATH, this.#cartFlows);

      console.log(`${PREFIX} Abandoned cart flow created for: ${store.shopDomain} (${flow.steps.length} steps)`);
      return { success: true, flow };
    } catch (err) {
      console.error(`${PREFIX} Error creating cart flow:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ─── Registry Entry ─────────────────────────────────────────────────────

  /** @returns {Object} Registry entry for this integration */
  static get registryEntry() {
    return {
      id: 'shopify-sync',
      name: 'Shopify Deep Sync',
      repo_url: '',
      type: 'app',
      status: 'active',
      capabilities: [
        'connect_store', 'sync_products', 'push_products',
        'sync_orders', 'sync_inventory', 'create_discount',
        'shopify_analytics', 'ai_liquid_theme', 'abandoned_cart_flow',
      ],
      config: {
        discountTypes: DISCOUNT_TYPES,
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

  /** Persist all store-related data to disk. */
  #saveAll() {
    try {
      writeFileSync(STORES_PATH, JSON.stringify(this.#stores, null, 2), 'utf-8');
      writeFileSync(SYNCED_PRODUCTS_PATH, JSON.stringify(this.#syncedProducts, null, 2), 'utf-8');
      writeFileSync(SYNCED_ORDERS_PATH, JSON.stringify(this.#syncedOrders, null, 2), 'utf-8');
    } catch (err) {
      console.error(`${PREFIX} Failed to save data:`, err.message);
    }
  }

  /**
   * Generate mock Shopify products for sync simulation.
   * @param {string} domain - Shop domain
   * @returns {Object[]}
   */
  #generateMockShopifyProducts(domain) {
    const categories = ['Clothing', 'Electronics', 'Home & Garden', 'Sports', 'Beauty'];
    return Array.from({ length: 5 }, (_, i) => ({
      shopifyId: `gid://shopify/Product/${Date.now() + i}`,
      title: `${domain.split('.')[0]} Product ${i + 1}`,
      description: `Sample product ${i + 1} from ${domain}`,
      price: parseFloat((Math.random() * 200 + 10).toFixed(2)),
      category: categories[i % categories.length],
      variants: [{ title: 'Default', price: parseFloat((Math.random() * 200 + 10).toFixed(2)), sku: `SPF-${i + 1}` }],
      images: [`https://${domain}/products/product-${i + 1}.jpg`],
      status: 'active',
    }));
  }

  /**
   * Generate mock Shopify orders for sync simulation.
   * @param {string} domain - Shop domain
   * @returns {Object[]}
   */
  #generateMockShopifyOrders(domain) {
    const statuses = ['paid', 'pending', 'refunded'];
    return Array.from({ length: 3 }, (_, i) => ({
      shopifyOrderId: `gid://shopify/Order/${Date.now() + i}`,
      orderNumber: 1001 + i,
      totalPrice: parseFloat((Math.random() * 500 + 20).toFixed(2)),
      currency: 'AUD',
      financialStatus: statuses[i % statuses.length],
      fulfillmentStatus: i === 0 ? 'fulfilled' : 'unfulfilled',
      lineItems: [
        { title: `Product ${i + 1}`, quantity: Math.floor(Math.random() * 3) + 1, price: parseFloat((Math.random() * 100 + 10).toFixed(2)) },
      ],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }));
  }

  /**
   * Generate a fallback Liquid section template.
   * @param {string} sectionType - Section type
   * @param {string} style - Style preference
   * @returns {string}
   */
  #generateFallbackLiquidSection(sectionType, style) {
    return `{%- comment -%}
  DevBot Generated Section: ${sectionType}
  Style: ${style}
{%- endcomment -%}

<section class="devbot-${sectionType}" id="section-{{ section.id }}">
  <div class="container">
    {% if section.settings.heading != blank %}
      <h2 class="section-heading">{{ section.settings.heading }}</h2>
    {% endif %}
    {% if section.settings.subheading != blank %}
      <p class="section-subheading">{{ section.settings.subheading }}</p>
    {% endif %}
    <div class="section-content">
      <!-- Add your ${sectionType} content here -->
    </div>
  </div>
</section>

{% schema %}
{
  "name": "${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Section"
    },
    {
      "type": "text",
      "id": "subheading",
      "label": "Subheading"
    }
  ],
  "presets": [
    {
      "name": "${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}"
    }
  ]
}
{% endschema %}`;
  }
}

export default ShopifySyncService;
