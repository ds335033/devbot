/**
 * DevBot AI — Financial Modeling Prep SDK Integration
 *
 * Wraps the FMP API for real-time stock quotes, company profiles,
 * financial statements, market movers, crypto, forex, stock screening,
 * and AI-powered financial reports and trading signals.
 *
 * Repo: https://github.com/daxm/fmpsdk
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, '../../data/integrations/financial');
const CACHE_PATH = resolve(CACHE_DIR, 'cache.json');
mkdirSync(CACHE_DIR, { recursive: true });

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

// ─── Cache TTL Configuration (milliseconds) ───────────────────────────────
const TTL = {
  quotes: 60_000,        // 60 seconds
  profiles: 3_600_000,   // 1 hour
  statements: 86_400_000, // 24 hours
  movers: 300_000,       // 5 minutes
  crypto: 60_000,        // 60 seconds
  forex: 60_000,         // 60 seconds
  calendar: 3_600_000,   // 1 hour
  screen: 600_000,       // 10 minutes
};

export class FinancialDataService {
  /** @type {string|null} */
  #apiKey;
  /** @type {Object} */
  #engine;
  /** @type {Object} */
  #cache;

  /**
   * @param {Object} [options]
   * @param {string} [options.apiKey] - FMP API key (falls back to env)
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#apiKey = options.apiKey || process.env.FINANCIAL_MODELING_PREP_API_KEY || null;
    this.#engine = options.engine || null;
    this.#cache = this.#loadCache();

    if (!this.#apiKey) {
      console.warn('[DevBot][Financial] No API key configured — set FINANCIAL_MODELING_PREP_API_KEY in env');
    } else {
      console.log('[DevBot][Financial] Service initialized with API key');
    }
  }

  /**
   * Get real-time stock quote.
   * @param {string} symbol - Stock ticker symbol
   * @returns {Promise<Object>} Stock quote data
   */
  async getStockQuote(symbol) {
    if (!symbol) throw new Error('Stock symbol is required');
    symbol = symbol.toUpperCase();

    const cached = this.#getCached(`quote:${symbol}`, TTL.quotes);
    if (cached) return cached;

    const data = await this.#fetch(`/quote/${symbol}`);
    const result = Array.isArray(data) ? data[0] || null : data;
    this.#setCache(`quote:${symbol}`, result);
    return result;
  }

  /**
   * Get company profile/fundamentals.
   * @param {string} symbol - Stock ticker symbol
   * @returns {Promise<Object>} Company profile
   */
  async getCompanyProfile(symbol) {
    if (!symbol) throw new Error('Stock symbol is required');
    symbol = symbol.toUpperCase();

    const cached = this.#getCached(`profile:${symbol}`, TTL.profiles);
    if (cached) return cached;

    const data = await this.#fetch(`/profile/${symbol}`);
    const result = Array.isArray(data) ? data[0] || null : data;
    this.#setCache(`profile:${symbol}`, result);
    return result;
  }

  /**
   * Get financial statements.
   * @param {string} symbol - Stock ticker symbol
   * @param {'income'|'balance'|'cashflow'} [type='income'] - Statement type
   * @returns {Promise<Object[]>} Financial statements
   */
  async getFinancialStatements(symbol, type = 'income') {
    if (!symbol) throw new Error('Stock symbol is required');
    symbol = symbol.toUpperCase();

    const endpoints = {
      income: `/income-statement/${symbol}`,
      balance: `/balance-sheet-statement/${symbol}`,
      cashflow: `/cash-flow-statement/${symbol}`,
    };

    const endpoint = endpoints[type];
    if (!endpoint) throw new Error(`Invalid statement type: ${type}. Use: income, balance, cashflow`);

    const cacheKey = `statement:${symbol}:${type}`;
    const cached = this.#getCached(cacheKey, TTL.statements);
    if (cached) return cached;

    const data = await this.#fetch(endpoint);
    this.#setCache(cacheKey, data);
    return data;
  }

  /**
   * Get market movers (gainers, losers, most active).
   * @returns {Promise<Object>} Market movers data
   */
  async getMarketMovers() {
    const cached = this.#getCached('movers', TTL.movers);
    if (cached) return cached;

    const [gainers, losers, active] = await Promise.all([
      this.#fetch('/stock_market/gainers').catch(() => []),
      this.#fetch('/stock_market/losers').catch(() => []),
      this.#fetch('/stock_market/actives').catch(() => []),
    ]);

    const result = {
      gainers: (gainers || []).slice(0, 10),
      losers: (losers || []).slice(0, 10),
      mostActive: (active || []).slice(0, 10),
      timestamp: new Date().toISOString(),
    };

    this.#setCache('movers', result);
    return result;
  }

  /**
   * Get cryptocurrency quotes.
   * @param {string|string[]} symbols - Crypto symbols (e.g., 'BTCUSD' or ['BTCUSD','ETHUSD'])
   * @returns {Promise<Object[]>} Crypto quote data
   */
  async getCryptoQuotes(symbols) {
    if (!symbols) throw new Error('Crypto symbols are required');

    const symbolList = Array.isArray(symbols) ? symbols : symbols.split(',').map(s => s.trim());
    const results = [];

    for (const sym of symbolList) {
      const cacheKey = `crypto:${sym.toUpperCase()}`;
      const cached = this.#getCached(cacheKey, TTL.crypto);
      if (cached) {
        results.push(cached);
        continue;
      }

      try {
        const data = await this.#fetch(`/quote/${sym.toUpperCase()}`);
        const quote = Array.isArray(data) ? data[0] : data;
        if (quote) {
          this.#setCache(cacheKey, quote);
          results.push(quote);
        }
      } catch (err) {
        console.error(`[DevBot][Financial] Crypto quote failed for ${sym}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Get forex exchange rates.
   * @param {string|string[]} pairs - Forex pairs (e.g., 'EURUSD' or ['EURUSD','GBPUSD'])
   * @returns {Promise<Object[]>} Forex rate data
   */
  async getForexRates(pairs) {
    if (!pairs) throw new Error('Forex pairs are required');

    const pairList = Array.isArray(pairs) ? pairs : pairs.split(',').map(s => s.trim());
    const results = [];

    for (const pair of pairList) {
      const cacheKey = `forex:${pair.toUpperCase()}`;
      const cached = this.#getCached(cacheKey, TTL.forex);
      if (cached) {
        results.push(cached);
        continue;
      }

      try {
        const data = await this.#fetch(`/quote/${pair.toUpperCase()}`);
        const rate = Array.isArray(data) ? data[0] : data;
        if (rate) {
          this.#setCache(cacheKey, rate);
          results.push(rate);
        }
      } catch (err) {
        console.error(`[DevBot][Financial] Forex rate failed for ${pair}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Stock screener with filters.
   * @param {Object} criteria - Screening criteria
   * @param {number} [criteria.marketCapMin] - Minimum market cap
   * @param {number} [criteria.marketCapMax] - Maximum market cap
   * @param {number} [criteria.priceMin] - Minimum price
   * @param {number} [criteria.priceMax] - Maximum price
   * @param {string} [criteria.sector] - Sector filter
   * @param {string} [criteria.industry] - Industry filter
   * @param {number} [criteria.dividendMin] - Minimum dividend yield
   * @param {number} [criteria.volumeMin] - Minimum volume
   * @param {number} [criteria.limit=20] - Result limit
   * @returns {Promise<Object[]>} Matching stocks
   */
  async screenStocks(criteria = {}) {
    const params = new URLSearchParams();
    if (criteria.marketCapMin) params.set('marketCapMoreThan', criteria.marketCapMin);
    if (criteria.marketCapMax) params.set('marketCapLowerThan', criteria.marketCapMax);
    if (criteria.priceMin) params.set('priceMoreThan', criteria.priceMin);
    if (criteria.priceMax) params.set('priceLowerThan', criteria.priceMax);
    if (criteria.sector) params.set('sector', criteria.sector);
    if (criteria.industry) params.set('industry', criteria.industry);
    if (criteria.dividendMin) params.set('dividendMoreThan', criteria.dividendMin);
    if (criteria.volumeMin) params.set('volumeMoreThan', criteria.volumeMin);
    params.set('limit', String(criteria.limit || 20));

    const cacheKey = `screen:${params.toString()}`;
    const cached = this.#getCached(cacheKey, TTL.screen);
    if (cached) return cached;

    const data = await this.#fetch(`/stock-screener?${params.toString()}`);
    this.#setCache(cacheKey, data);
    return data;
  }

  /**
   * Get upcoming economic calendar events.
   * @returns {Promise<Object[]>} Economic events
   */
  async getEconomicCalendar() {
    const cached = this.#getCached('calendar', TTL.calendar);
    if (cached) return cached;

    const data = await this.#fetch('/economic_calendar');
    this.#setCache('calendar', data);
    return data;
  }

  /**
   * Generate an AI-powered financial analysis report.
   * @param {string} symbol - Stock ticker symbol
   * @returns {Promise<Object>} AI-generated financial report
   */
  async generateFinancialReport(symbol) {
    if (!symbol) throw new Error('Stock symbol is required');
    symbol = symbol.toUpperCase();

    // Gather data
    const [quote, profile, income] = await Promise.all([
      this.getStockQuote(symbol).catch(() => null),
      this.getCompanyProfile(symbol).catch(() => null),
      this.getFinancialStatements(symbol, 'income').catch(() => []),
    ]);

    const dataContext = JSON.stringify({ quote, profile, recentIncome: (income || []).slice(0, 4) }, null, 2);

    const prompt = `Analyze the following financial data for ${symbol} and provide a comprehensive report including:
1. Company Overview
2. Financial Health Assessment
3. Key Metrics Analysis (P/E, revenue growth, profit margins)
4. Risk Factors
5. Investment Thesis (Bull/Bear case)
6. Price Target Estimate

Data:
${dataContext}`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const analysis = await this.#engine.generate(prompt);
        return {
          symbol,
          generatedAt: new Date().toISOString(),
          data: { quote, profile },
          analysis,
          type: 'financial_report',
        };
      } catch (err) {
        console.error('[DevBot][Financial] AI report generation failed:', err.message);
      }
    }

    return {
      symbol,
      generatedAt: new Date().toISOString(),
      data: { quote, profile },
      analysis: 'AI engine unavailable — raw data provided for manual analysis.',
      type: 'financial_report',
    };
  }

  /**
   * Generate an AI-powered trading signal.
   * @param {string} symbol - Stock ticker symbol
   * @param {string} [strategy='momentum'] - Trading strategy (momentum, value, swing, scalp)
   * @returns {Promise<Object>} Trading signal with recommendation
   */
  async generateTradingSignal(symbol, strategy = 'momentum') {
    if (!symbol) throw new Error('Stock symbol is required');
    symbol = symbol.toUpperCase();

    const quote = await this.getStockQuote(symbol).catch(() => null);
    const profile = await this.getCompanyProfile(symbol).catch(() => null);

    const prompt = `Based on a ${strategy} trading strategy, analyze ${symbol} and provide:
1. Signal: BUY / SELL / HOLD
2. Confidence: 0-100%
3. Entry price suggestion
4. Stop loss level
5. Take profit target
6. Rationale (2-3 sentences)
7. Risk level: LOW / MEDIUM / HIGH

Current data: Price=${quote?.price || 'N/A'}, Change=${quote?.changesPercentage || 'N/A'}%, Market Cap=${profile?.mktCap || 'N/A'}`;

    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const signal = await this.#engine.generate(prompt);
        return {
          symbol,
          strategy,
          generatedAt: new Date().toISOString(),
          currentPrice: quote?.price || null,
          signal,
          type: 'trading_signal',
        };
      } catch (err) {
        console.error('[DevBot][Financial] AI signal generation failed:', err.message);
      }
    }

    return {
      symbol,
      strategy,
      generatedAt: new Date().toISOString(),
      currentPrice: quote?.price || null,
      signal: 'AI engine unavailable — manual analysis recommended.',
      type: 'trading_signal',
    };
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'financial',
      name: 'Financial Modeling Prep SDK',
      repo_url: 'https://github.com/daxm/fmpsdk',
      type: 'sdk',
      status: 'active',
      capabilities: [
        'stock_quotes', 'company_profiles', 'financial_statements',
        'market_movers', 'crypto_quotes', 'forex_rates',
        'stock_screener', 'economic_calendar',
        'ai_financial_report', 'ai_trading_signal',
      ],
      config: { requiresApiKey: true, envVar: 'FINANCIAL_MODELING_PREP_API_KEY' },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Make an authenticated request to the FMP API.
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<any>}
   */
  async #fetch(endpoint) {
    if (!this.#apiKey) {
      throw new Error('Financial API key not configured. Set FINANCIAL_MODELING_PREP_API_KEY in environment.');
    }

    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${FMP_BASE}${endpoint}${separator}apikey=${this.#apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (err.message.includes('FMP API error')) throw err;
      throw new Error(`Failed to reach FMP API: ${err.message}`);
    }
  }

  #getCached(key, ttl) {
    const entry = this.#cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttl) {
      delete this.#cache[key];
      return null;
    }
    return entry.data;
  }

  #setCache(key, data) {
    this.#cache[key] = { data, timestamp: Date.now() };
    this.#persistCache();
  }

  #loadCache() {
    try {
      if (existsSync(CACHE_PATH)) {
        return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
      }
    } catch (err) {
      console.error('[DevBot][Financial] Failed to load cache:', err.message);
    }
    return {};
  }

  #persistCache() {
    try {
      // Only persist non-expired entries
      const toSave = {};
      for (const [key, entry] of Object.entries(this.#cache)) {
        // Keep entries less than 24 hours old for persistence
        if (Date.now() - entry.timestamp < 86_400_000) {
          toSave[key] = entry;
        }
      }
      writeFileSync(CACHE_PATH, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DevBot][Financial] Failed to persist cache:', err.message);
    }
  }
}

export default FinancialDataService;
