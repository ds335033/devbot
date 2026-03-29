/**
 * DevBot AI — Unified CMS Integration
 *
 * Strapi + Payload + Directus unified content management system.
 * Supports multiple site templates, content workflows, AI-generated
 * articles and SEO optimization, and content calendar management.
 *
 * Revenue: Free (1 site, 50 posts), Creator $19/mo (5 sites, 500 posts),
 *          Agency $79/mo (unlimited + AI generation)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/cms');
const SITES_PATH = resolve(DATA_DIR, 'sites.json');
const CONTENT_PATH = resolve(DATA_DIR, 'content.json');
const CALENDAR_PATH = resolve(DATA_DIR, 'calendar.json');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Constants ────────────────────────────────────────────────────────────
const PREFIX = '[DevBot CMS]';
const TEMPLATES = ['blog', 'docs', 'portfolio', 'landing', 'academy', 'wiki', 'knowledge-base'];
const CONTENT_STATUSES = ['draft', 'review', 'published', 'archived'];

const PLANS = {
  free: { name: 'Free', price: 0, maxSites: 1, maxPosts: 50, aiGeneration: false },
  creator: { name: 'Creator', price: 19, maxSites: 5, maxPosts: 500, aiGeneration: false },
  agency: { name: 'Agency', price: 79, maxSites: Infinity, maxPosts: Infinity, aiGeneration: true },
};

export class CMSService {
  /** @type {Object} */
  #engine;
  /** @type {Object} */
  #sites;
  /** @type {Object} */
  #content;
  /** @type {Object} */
  #calendar;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance for AI-powered features
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#sites = this.#loadJSON(SITES_PATH, {});
    this.#content = this.#loadJSON(CONTENT_PATH, {});
    this.#calendar = this.#loadJSON(CALENDAR_PATH, {});
    console.log(`${PREFIX} Service initialized — ${Object.keys(this.#sites).length} sites loaded`);
  }

  /**
   * Create a new CMS site.
   * @param {Object} config - Site configuration
   * @param {string} config.name - Site display name
   * @param {string} [config.type='strapi'] - CMS backend (strapi, payload, directus)
   * @param {string} [config.template='blog'] - Site template
   * @param {string} [config.domain] - Custom domain
   * @returns {{ success: boolean, site?: Object, error?: string }}
   */
  createSite(config) {
    try {
      if (!config || !config.name) {
        return { success: false, error: 'Site name is required' };
      }
      const template = config.template || 'blog';
      if (!TEMPLATES.includes(template)) {
        return { success: false, error: `Template must be one of: ${TEMPLATES.join(', ')}` };
      }
      const type = config.type || 'strapi';
      if (!['strapi', 'payload', 'directus'].includes(type)) {
        return { success: false, error: 'Type must be one of: strapi, payload, directus' };
      }

      const site = {
        id: uuidv4(),
        name: config.name,
        type,
        template,
        domain: config.domain || null,
        plan: 'free',
        contentCount: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.#sites[site.id] = site;
      this.#content[site.id] = [];
      this.#calendar[site.id] = [];
      this.#saveAll();

      console.log(`${PREFIX} Site created: ${site.name} (${site.template}) [${site.id}]`);
      return { success: true, site };
    } catch (err) {
      console.error(`${PREFIX} Error creating site:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create new content in a site.
   * @param {string} siteId - Site ID
   * @param {Object} content - Content data
   * @param {string} content.title - Content title
   * @param {string} content.body - Content body (HTML or markdown)
   * @param {string} [content.slug] - URL slug (auto-generated if omitted)
   * @param {string} [content.category] - Content category
   * @param {string[]} [content.tags] - Tags
   * @param {string} [content.author] - Author name
   * @param {'draft'|'review'|'published'|'archived'} [content.status='draft'] - Content status
   * @returns {{ success: boolean, content?: Object, error?: string }}
   */
  createContent(siteId, content) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }
      if (!content || !content.title) {
        return { success: false, error: 'Content title is required' };
      }
      if (!content.body) {
        return { success: false, error: 'Content body is required' };
      }

      const status = content.status || 'draft';
      if (!CONTENT_STATUSES.includes(status)) {
        return { success: false, error: `Status must be one of: ${CONTENT_STATUSES.join(', ')}` };
      }

      const slug = content.slug || content.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const newContent = {
        id: uuidv4(),
        siteId,
        title: content.title,
        body: content.body,
        slug,
        category: content.category || 'uncategorized',
        tags: content.tags || [],
        author: content.author || 'DevBot',
        status,
        publishedAt: status === 'published' ? new Date().toISOString() : null,
        wordCount: content.body.split(/\s+/).length,
        readTime: Math.ceil(content.body.split(/\s+/).length / 200),
        seo: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!this.#content[siteId]) this.#content[siteId] = [];
      this.#content[siteId].push(newContent);
      const site = this.#sites[siteId];
      site.contentCount = this.#content[siteId].length;
      site.updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} Content created: "${newContent.title}" [${newContent.status}] in ${site.name}`);
      return { success: true, content: newContent };
    } catch (err) {
      console.error(`${PREFIX} Error creating content:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Update existing content.
   * @param {string} siteId - Site ID
   * @param {string} contentId - Content ID
   * @param {Object} updates - Fields to update
   * @returns {{ success: boolean, content?: Object, error?: string }}
   */
  updateContent(siteId, contentId, updates) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }
      if (!contentId) {
        return { success: false, error: 'Content ID is required' };
      }

      const items = this.#content[siteId] || [];
      const idx = items.findIndex(c => c.id === contentId);
      if (idx === -1) {
        return { success: false, error: 'Content not found' };
      }

      if (updates.status && !CONTENT_STATUSES.includes(updates.status)) {
        return { success: false, error: `Status must be one of: ${CONTENT_STATUSES.join(', ')}` };
      }

      const updated = {
        ...items[idx],
        ...updates,
        id: items[idx].id,
        siteId: items[idx].siteId,
        createdAt: items[idx].createdAt,
        updatedAt: new Date().toISOString(),
      };

      if (updates.body) {
        updated.wordCount = updates.body.split(/\s+/).length;
        updated.readTime = Math.ceil(updated.wordCount / 200);
      }

      items[idx] = updated;
      this.#saveAll();

      console.log(`${PREFIX} Content updated: "${updated.title}" [${contentId}]`);
      return { success: true, content: updated };
    } catch (err) {
      console.error(`${PREFIX} Error updating content:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Publish content (change status to 'published').
   * @param {string} siteId - Site ID
   * @param {string} contentId - Content ID
   * @returns {{ success: boolean, content?: Object, error?: string }}
   */
  publishContent(siteId, contentId) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }

      const items = this.#content[siteId] || [];
      const idx = items.findIndex(c => c.id === contentId);
      if (idx === -1) {
        return { success: false, error: 'Content not found' };
      }

      items[idx].status = 'published';
      items[idx].publishedAt = new Date().toISOString();
      items[idx].updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} Content published: "${items[idx].title}" [${contentId}]`);
      return { success: true, content: items[idx] };
    } catch (err) {
      console.error(`${PREFIX} Error publishing content:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * List content in a site with optional filters.
   * @param {string} siteId - Site ID
   * @param {Object} [filters] - Filter options
   * @param {string} [filters.status] - Filter by content status
   * @param {string} [filters.category] - Filter by category
   * @param {string[]} [filters.tags] - Filter by tags (any match)
   * @param {string} [filters.search] - Search term for title/body
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=20] - Items per page
   * @returns {{ success: boolean, content?: Object[], total?: number, page?: number, totalPages?: number, error?: string }}
   */
  listContent(siteId, filters = {}) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }

      let items = [...(this.#content[siteId] || [])];

      if (filters.status) {
        if (!CONTENT_STATUSES.includes(filters.status)) {
          return { success: false, error: `Status must be one of: ${CONTENT_STATUSES.join(', ')}` };
        }
        items = items.filter(c => c.status === filters.status);
      }
      if (filters.category) {
        items = items.filter(c => c.category === filters.category);
      }
      if (filters.tags && filters.tags.length > 0) {
        items = items.filter(c => c.tags.some(t => filters.tags.includes(t)));
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.body.toLowerCase().includes(q)
        );
      }

      const total = items.length;
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const paged = items.slice(start, start + limit);

      return { success: true, content: paged, total, page, totalPages };
    } catch (err) {
      console.error(`${PREFIX} Error listing content:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate an AI-powered article using Claude.
   * @param {Object} config - Generation config
   * @param {string} config.topic - Article topic
   * @param {string} [config.tone='professional'] - Writing tone
   * @param {string} [config.length='medium'] - Article length (short, medium, long)
   * @param {string} [config.format='article'] - Output format (article, listicle, tutorial, how-to)
   * @returns {Promise<{ success: boolean, content?: Object, error?: string }>}
   */
  async generateContent(config) {
    try {
      if (!config || !config.topic) {
        return { success: false, error: 'Topic is required' };
      }

      const tone = config.tone || 'professional';
      const length = config.length || 'medium';
      const format = config.format || 'article';

      const lengthGuide = { short: '300-500 words', medium: '800-1200 words', long: '1500-2500 words' };

      if (!this.#engine) {
        const fallback = {
          title: `${config.topic} — A Comprehensive Guide`,
          body: `This is a placeholder article about ${config.topic}. Connect an AI engine to generate full content.`,
          slug: config.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          tags: [config.topic.toLowerCase()],
          format,
          wordCount: 15,
        };
        console.log(`${PREFIX} Generated fallback content for: ${config.topic}`);
        return { success: true, content: fallback };
      }

      const prompt = `Write a ${lengthGuide[length] || lengthGuide.medium} ${format} about "${config.topic}".
Tone: ${tone}
Format: ${format}
Include: compelling title, well-structured sections, actionable takeaways.
Return as JSON: { "title": "...", "body": "..." (in markdown), "tags": ["..."] }`;

      const result = await this.#engine.generateText(prompt);
      let parsed;
      try {
        parsed = JSON.parse(result);
      } catch {
        parsed = {
          title: `${config.topic}`,
          body: result,
          tags: [config.topic.toLowerCase()],
        };
      }

      parsed.slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      parsed.format = format;
      parsed.wordCount = parsed.body.split(/\s+/).length;

      console.log(`${PREFIX} AI content generated: "${parsed.title}" (${parsed.wordCount} words)`);
      return { success: true, content: parsed };
    } catch (err) {
      console.error(`${PREFIX} Error generating content:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate SEO metadata for content using AI.
   * @param {string} siteId - Site ID
   * @param {string} contentId - Content ID
   * @returns {Promise<{ success: boolean, seo?: Object, error?: string }>}
   */
  async generateSEO(siteId, contentId) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }
      const items = this.#content[siteId] || [];
      const item = items.find(c => c.id === contentId);
      if (!item) {
        return { success: false, error: 'Content not found' };
      }

      let seo;
      if (!this.#engine) {
        seo = {
          metaTitle: item.title.slice(0, 60),
          metaDescription: item.body.slice(0, 155).replace(/\n/g, ' '),
          keywords: item.tags || [],
          ogImageSuggestion: `Professional illustration related to: ${item.title}`,
        };
        console.log(`${PREFIX} Generated fallback SEO for: "${item.title}"`);
      } else {
        const prompt = `Generate SEO metadata for this content:
Title: ${item.title}
Body (first 500 chars): ${item.body.slice(0, 500)}
Category: ${item.category}
Tags: ${item.tags.join(', ')}

Return JSON: { "metaTitle": "..." (max 60 chars), "metaDescription": "..." (max 155 chars), "keywords": ["..."], "ogImageSuggestion": "..." }`;

        const result = await this.#engine.generateText(prompt);
        try {
          seo = JSON.parse(result);
        } catch {
          seo = {
            metaTitle: item.title.slice(0, 60),
            metaDescription: item.body.slice(0, 155).replace(/\n/g, ' '),
            keywords: item.tags || [],
            ogImageSuggestion: `Image suggestion for: ${item.title}`,
          };
        }
      }

      // Persist SEO data on the content item
      const idx = items.findIndex(c => c.id === contentId);
      items[idx].seo = seo;
      items[idx].updatedAt = new Date().toISOString();
      this.#saveAll();

      console.log(`${PREFIX} SEO generated for: "${item.title}"`);
      return { success: true, seo };
    } catch (err) {
      console.error(`${PREFIX} Error generating SEO:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get the content calendar for a site.
   * @param {string} siteId - Site ID
   * @returns {{ success: boolean, calendar?: Object[], published?: Object[], error?: string }}
   */
  getContentCalendar(siteId) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }

      const items = this.#content[siteId] || [];
      const scheduled = this.#calendar[siteId] || [];

      const published = items
        .filter(c => c.status === 'published')
        .map(c => ({ id: c.id, title: c.title, publishedAt: c.publishedAt, category: c.category }))
        .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

      const upcoming = items
        .filter(c => c.status === 'draft' || c.status === 'review')
        .map(c => ({ id: c.id, title: c.title, status: c.status, category: c.category, createdAt: c.createdAt }));

      console.log(`${PREFIX} Calendar retrieved for site: ${this.#sites[siteId].name}`);
      return { success: true, calendar: [...scheduled, ...upcoming], published };
    } catch (err) {
      console.error(`${PREFIX} Error getting calendar:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get analytics for a site.
   * @param {string} siteId - Site ID
   * @returns {{ success: boolean, analytics?: Object, error?: string }}
   */
  getSiteAnalytics(siteId) {
    try {
      if (!siteId || !this.#sites[siteId]) {
        return { success: false, error: 'Invalid site ID' };
      }

      const site = this.#sites[siteId];
      const items = this.#content[siteId] || [];
      const published = items.filter(c => c.status === 'published');

      const totalWordCount = items.reduce((sum, c) => sum + (c.wordCount || 0), 0);
      const avgReadTime = published.length > 0
        ? parseFloat((published.reduce((sum, c) => sum + (c.readTime || 0), 0) / published.length).toFixed(1))
        : 0;

      const categories = {};
      for (const item of items) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      }

      const popularContent = published
        .sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0))
        .slice(0, 5)
        .map(c => ({ id: c.id, title: c.title, wordCount: c.wordCount, readTime: c.readTime }));

      const analytics = {
        siteId,
        siteName: site.name,
        totalContent: items.length,
        publishedContent: published.length,
        draftContent: items.filter(c => c.status === 'draft').length,
        reviewContent: items.filter(c => c.status === 'review').length,
        archivedContent: items.filter(c => c.status === 'archived').length,
        totalWordCount,
        avgReadTime,
        categories,
        popularContent,
        generatedAt: new Date().toISOString(),
      };

      console.log(`${PREFIX} Analytics generated for site: ${site.name}`);
      return { success: true, analytics };
    } catch (err) {
      console.error(`${PREFIX} Error getting analytics:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // ─── Registry Entry ─────────────────────────────────────────────────────

  /** @returns {Object} Registry entry for this integration */
  static get registryEntry() {
    return {
      id: 'cms',
      name: 'Unified CMS (Strapi + Payload + Directus)',
      repo_url: '',
      type: 'app',
      status: 'active',
      capabilities: [
        'create_site', 'create_content', 'update_content', 'publish_content',
        'list_content', 'ai_content_generation', 'ai_seo',
        'content_calendar', 'site_analytics',
      ],
      config: {
        templates: TEMPLATES,
        contentStatuses: CONTENT_STATUSES,
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

  /** Persist all data to disk. */
  #saveAll() {
    try {
      writeFileSync(SITES_PATH, JSON.stringify(this.#sites, null, 2), 'utf-8');
      writeFileSync(CONTENT_PATH, JSON.stringify(this.#content, null, 2), 'utf-8');
      writeFileSync(CALENDAR_PATH, JSON.stringify(this.#calendar, null, 2), 'utf-8');
    } catch (err) {
      console.error(`${PREFIX} Failed to save data:`, err.message);
    }
  }
}

export default CMSService;
