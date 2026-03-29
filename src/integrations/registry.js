/**
 * DevBot AI — Integration Registry
 *
 * Central registry for all integrated repos/services.
 * Stores metadata, capabilities, and config for each integration.
 * Persists state to data/integrations/registry.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations');
const REGISTRY_PATH = resolve(DATA_DIR, 'registry.json');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Valid Integration Types ───────────────────────────────────────────────
// Accept any integration type — extensible registry
const INTEGRATION_TYPES = null; // No restriction — accept all types

/**
 * @typedef {Object} Integration
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} repo_url - GitHub repository URL
 * @property {'sdk'|'docs'|'app'|'data'|'tutorial'} type - Integration type
 * @property {'active'|'inactive'|'error'} status - Current status
 * @property {string[]} capabilities - List of capabilities
 * @property {Object} config - Integration-specific configuration
 * @property {string} registeredAt - ISO timestamp of registration
 * @property {string} updatedAt - ISO timestamp of last update
 */

export class Registry {
  /** @type {Map<string, Integration>} */
  #integrations = new Map();

  constructor() {
    this.#load();
    console.log(`[DevBot][Registry] Initialized with ${this.#integrations.size} integrations`);
  }

  /**
   * Register a new integration.
   * @param {Integration} integration - Integration metadata
   * @returns {Integration} The registered integration
   */
  register(integration) {
    if (!integration.id || !integration.name) {
      throw new Error('Integration must have an id and name');
    }
    // Type validation removed — accept any integration type for extensibility

    const entry = {
      id: integration.id,
      name: integration.name,
      repo_url: integration.repo_url || '',
      type: integration.type || 'sdk',
      status: integration.status || 'active',
      capabilities: integration.capabilities || [],
      config: integration.config || {},
      registeredAt: integration.registeredAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.#integrations.set(entry.id, entry);
    this.#save();
    console.log(`[DevBot][Registry] Registered: ${entry.name} (${entry.id})`);
    return entry;
  }

  /**
   * Get an integration by ID.
   * @param {string} id - Integration ID
   * @returns {Integration|null}
   */
  get(id) {
    return this.#integrations.get(id) || null;
  }

  /**
   * List all integrations.
   * @returns {Integration[]}
   */
  list() {
    return Array.from(this.#integrations.values());
  }

  /**
   * List integrations filtered by type.
   * @param {'sdk'|'docs'|'app'|'data'|'tutorial'} type
   * @returns {Integration[]}
   */
  listByType(type) {
    return this.list().filter(i => i.type === type);
  }

  /**
   * Search integrations by keyword (matches name, id, capabilities).
   * @param {string} query - Search query
   * @returns {Integration[]}
   */
  search(query) {
    const q = query.toLowerCase();
    return this.list().filter(i =>
      i.id.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      i.capabilities.some(c => c.toLowerCase().includes(q)) ||
      (i.repo_url && i.repo_url.toLowerCase().includes(q))
    );
  }

  /**
   * Get all capabilities across all integrations (deduplicated).
   * @returns {string[]}
   */
  getCapabilities() {
    const caps = new Set();
    for (const integration of this.#integrations.values()) {
      for (const cap of integration.capabilities) {
        caps.add(cap);
      }
    }
    return Array.from(caps).sort();
  }

  /**
   * Update an existing integration's fields.
   * @param {string} id - Integration ID
   * @param {Partial<Integration>} updates - Fields to update
   * @returns {Integration|null}
   */
  update(id, updates) {
    const existing = this.#integrations.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, id: existing.id, updatedAt: new Date().toISOString() };
    this.#integrations.set(id, updated);
    this.#save();
    return updated;
  }

  /**
   * Remove an integration.
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    const removed = this.#integrations.delete(id);
    if (removed) this.#save();
    return removed;
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  /** Load registry from disk. */
  #load() {
    try {
      if (existsSync(REGISTRY_PATH)) {
        const data = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
        if (Array.isArray(data)) {
          for (const entry of data) {
            this.#integrations.set(entry.id, entry);
          }
        }
      }
    } catch (err) {
      console.error('[DevBot][Registry] Failed to load registry:', err.message);
    }
  }

  /** Save registry to disk. */
  #save() {
    try {
      writeFileSync(REGISTRY_PATH, JSON.stringify(this.list(), null, 2), 'utf-8');
    } catch (err) {
      console.error('[DevBot][Registry] Failed to save registry:', err.message);
    }
  }
}

export default Registry;
