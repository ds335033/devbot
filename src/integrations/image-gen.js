/**
 * DevBot AI — ComfyUI + Diffusers Image Generation Integration
 *
 * AI image generation service with multiple models, styles,
 * upscaling, background removal, and variation generation.
 * Simulated pipeline with persistent generation history.
 *
 * Revenue: Free (5/day), Hobby $9.99/mo (100/day), Pro $49.99/mo (unlimited), credits $0.05/image
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/images');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Constants ────────────────────────────────────────────────────────────
const AVAILABLE_MODELS = ['sdxl', 'flux-dev', 'flux-schnell', 'stable-diffusion-3', 'dall-e-style'];

const AVAILABLE_STYLES = [
  'photorealistic', 'anime', 'oil-painting', 'watercolor', 'digital-art',
  'pixel-art', '3d-render', 'comic-book', 'minimalist', 'cyberpunk',
];

const PLANS = {
  free:    { name: 'Free',  price: 0,     maxPerDay: 5,        unlimited: false },
  hobby:   { name: 'Hobby', price: 9.99,  maxPerDay: 100,      unlimited: false },
  pro:     { name: 'Pro',   price: 49.99, maxPerDay: Infinity,  unlimited: true },
  credits: { name: 'Credits', pricePerImage: 0.05 },
};

const DEFAULT_WIDTH = 1024;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_STEPS = 30;

export class ImageGenService {
  /** @type {Map<string, Object>} */
  #images = new Map();
  /** @type {Map<string, Object>} */
  #userStats = new Map();
  /** @type {Object|null} */
  #engine;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#loadAll();
    console.log(`[DevBot ImageGen] Service initialized — ${this.#images.size} images in history`);
  }

  /**
   * Generate an AI image from a text prompt.
   * @param {Object} config - Generation configuration
   * @param {string} config.prompt - Text prompt describing the desired image
   * @param {string} [config.negativePrompt=''] - What to avoid in the image
   * @param {string} [config.model='sdxl'] - Model to use
   * @param {number} [config.width=1024] - Image width in pixels
   * @param {number} [config.height=1024] - Image height in pixels
   * @param {number} [config.steps=30] - Number of diffusion steps
   * @param {number} [config.seed] - Random seed for reproducibility
   * @param {string} [config.style] - Style preset to apply
   * @param {string} [config.userId='default'] - User ID for tracking
   * @returns {Object} Generated image metadata with success status
   */
  generateImage(config) {
    if (!config || !config.prompt) {
      return { success: false, error: 'Prompt is required' };
    }
    if (typeof config.prompt !== 'string' || config.prompt.trim().length === 0) {
      return { success: false, error: 'Prompt must be a non-empty string' };
    }

    const model = config.model || 'sdxl';
    if (!AVAILABLE_MODELS.includes(model)) {
      return { success: false, error: `Invalid model: ${model}. Available: ${AVAILABLE_MODELS.join(', ')}` };
    }

    const style = config.style || null;
    if (style && !AVAILABLE_STYLES.includes(style)) {
      return { success: false, error: `Invalid style: ${style}. Available: ${AVAILABLE_STYLES.join(', ')}` };
    }

    const width = config.width || DEFAULT_WIDTH;
    const height = config.height || DEFAULT_HEIGHT;
    if (width < 256 || width > 2048 || height < 256 || height > 2048) {
      return { success: false, error: 'Width and height must be between 256 and 2048' };
    }

    const steps = config.steps || DEFAULT_STEPS;
    if (steps < 1 || steps > 150) {
      return { success: false, error: 'Steps must be between 1 and 150' };
    }

    const userId = config.userId || 'default';
    const id = uuidv4();
    const seed = config.seed || Math.floor(Math.random() * 2147483647);

    const image = {
      id,
      prompt: config.prompt.trim(),
      negativePrompt: config.negativePrompt || '',
      model,
      style,
      width,
      height,
      steps,
      seed,
      userId,
      status: 'completed',
      imageUrl: `https://devbot.ai/images/${id}.png`,
      thumbnailUrl: `https://devbot.ai/images/${id}_thumb.png`,
      generationTime: Math.round(1500 + Math.random() * 3500),
      createdAt: new Date().toISOString(),
    };

    this.#images.set(id, image);
    this.#updateUserStats(userId, 1);
    this.#saveImage(image);

    console.log(`[DevBot ImageGen] Generated image: ${id} (${model}, ${style || 'default'}, ${width}x${height})`);

    return {
      success: true,
      image: {
        id: image.id,
        prompt: image.prompt,
        model: image.model,
        style: image.style,
        width: image.width,
        height: image.height,
        seed: image.seed,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        generationTime: image.generationTime,
        createdAt: image.createdAt,
      },
    };
  }

  /**
   * Upscale an existing image by 2x or 4x.
   * @param {string} imageId - ID of the image to upscale
   * @param {number} [scale=2] - Upscale factor (2 or 4)
   * @returns {Object} Upscaled image metadata
   */
  upscaleImage(imageId, scale = 2) {
    if (!imageId) {
      return { success: false, error: 'Image ID is required' };
    }
    if (scale !== 2 && scale !== 4) {
      return { success: false, error: 'Scale must be 2 or 4' };
    }

    const original = this.#images.get(imageId);
    if (!original) {
      return { success: false, error: `Image not found: ${imageId}` };
    }

    const id = uuidv4();
    const upscaled = {
      id,
      originalImageId: imageId,
      prompt: original.prompt,
      model: original.model,
      style: original.style,
      width: original.width * scale,
      height: original.height * scale,
      steps: original.steps,
      seed: original.seed,
      userId: original.userId,
      status: 'completed',
      type: 'upscale',
      scale,
      imageUrl: `https://devbot.ai/images/${id}_upscaled_${scale}x.png`,
      thumbnailUrl: `https://devbot.ai/images/${id}_thumb.png`,
      generationTime: Math.round(2000 + Math.random() * 4000),
      createdAt: new Date().toISOString(),
    };

    this.#images.set(id, upscaled);
    this.#updateUserStats(original.userId, 1);
    this.#saveImage(upscaled);

    console.log(`[DevBot ImageGen] Upscaled image ${imageId} by ${scale}x → ${id}`);
    return { success: true, image: upscaled };
  }

  /**
   * Remove the background from an existing image.
   * @param {string} imageId - ID of the image to process
   * @returns {Object} Processed image metadata
   */
  removeBackground(imageId) {
    if (!imageId) {
      return { success: false, error: 'Image ID is required' };
    }

    const original = this.#images.get(imageId);
    if (!original) {
      return { success: false, error: `Image not found: ${imageId}` };
    }

    const id = uuidv4();
    const processed = {
      id,
      originalImageId: imageId,
      prompt: original.prompt,
      model: original.model,
      width: original.width,
      height: original.height,
      userId: original.userId,
      status: 'completed',
      type: 'background-removal',
      imageUrl: `https://devbot.ai/images/${id}_nobg.png`,
      thumbnailUrl: `https://devbot.ai/images/${id}_thumb.png`,
      generationTime: Math.round(1000 + Math.random() * 2000),
      createdAt: new Date().toISOString(),
    };

    this.#images.set(id, processed);
    this.#updateUserStats(original.userId, 1);
    this.#saveImage(processed);

    console.log(`[DevBot ImageGen] Removed background from image ${imageId} → ${id}`);
    return { success: true, image: processed };
  }

  /**
   * Generate variations of an existing image.
   * @param {string} imageId - ID of the source image
   * @param {number} [count=3] - Number of variations to generate
   * @returns {Object} Array of variation image metadata
   */
  generateVariations(imageId, count = 3) {
    if (!imageId) {
      return { success: false, error: 'Image ID is required' };
    }
    if (count < 1 || count > 10) {
      return { success: false, error: 'Count must be between 1 and 10' };
    }

    const original = this.#images.get(imageId);
    if (!original) {
      return { success: false, error: `Image not found: ${imageId}` };
    }

    const variations = [];
    for (let i = 0; i < count; i++) {
      const id = uuidv4();
      const variation = {
        id,
        originalImageId: imageId,
        prompt: original.prompt,
        negativePrompt: original.negativePrompt || '',
        model: original.model,
        style: original.style,
        width: original.width,
        height: original.height,
        steps: original.steps,
        seed: Math.floor(Math.random() * 2147483647),
        userId: original.userId,
        status: 'completed',
        type: 'variation',
        variationIndex: i + 1,
        imageUrl: `https://devbot.ai/images/${id}_var${i + 1}.png`,
        thumbnailUrl: `https://devbot.ai/images/${id}_thumb.png`,
        generationTime: Math.round(1500 + Math.random() * 3500),
        createdAt: new Date().toISOString(),
      };

      this.#images.set(id, variation);
      this.#saveImage(variation);
      variations.push(variation);
    }

    this.#updateUserStats(original.userId, count);
    console.log(`[DevBot ImageGen] Generated ${count} variations of image ${imageId}`);

    return { success: true, variations, count: variations.length };
  }

  /**
   * Get generation history for a user.
   * @param {string} [userId='default'] - User ID
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Max results
   * @param {number} [options.offset=0] - Offset for pagination
   * @returns {Object} Generation history with stats
   */
  getHistory(userId = 'default', options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const userImages = Array.from(this.#images.values())
      .filter(img => img.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stats = this.#userStats.get(userId) || { generationsCount: 0, creditsUsed: 0 };

    return {
      success: true,
      images: userImages.slice(offset, offset + limit),
      total: userImages.length,
      offset,
      limit,
      stats,
    };
  }

  /**
   * List available models.
   * @returns {Object} Available models
   */
  listModels() {
    return { success: true, models: [...AVAILABLE_MODELS] };
  }

  /**
   * List available styles.
   * @returns {Object} Available styles
   */
  listStyles() {
    return { success: true, styles: [...AVAILABLE_STYLES] };
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'image-gen',
      name: 'ComfyUI + Diffusers Image Generation',
      repo_url: '',
      type: 'app',
      status: 'active',
      capabilities: [
        'generate_image', 'upscale_image', 'remove_background',
        'generate_variations', 'generation_history', 'multiple_models',
      ],
      config: {
        revenue: 'Free / $9.99 / $49.99 / $0.05 per image',
        models: AVAILABLE_MODELS,
        styles: AVAILABLE_STYLES,
        plans: PLANS,
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  #updateUserStats(userId, count) {
    const stats = this.#userStats.get(userId) || { generationsCount: 0, creditsUsed: 0 };
    stats.generationsCount += count;
    stats.creditsUsed += count * 0.05;
    this.#userStats.set(userId, stats);

    try {
      writeFileSync(
        resolve(DATA_DIR, `stats_${userId}.json`),
        JSON.stringify(stats, null, 2),
        'utf-8'
      );
    } catch (err) {
      console.error(`[DevBot ImageGen] Failed to save user stats: ${err.message}`);
    }
  }

  #loadAll() {
    try {
      const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter(f => f.endsWith('.json')) : [];
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8'));
          if (file.startsWith('stats_')) {
            const userId = file.replace('stats_', '').replace('.json', '');
            this.#userStats.set(userId, data);
          } else if (data.id) {
            this.#images.set(data.id, data);
          }
        } catch (err) {
          console.error(`[DevBot ImageGen] Failed to load ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`[DevBot ImageGen] Failed to load images: ${err.message}`);
    }
  }

  #saveImage(image) {
    try {
      writeFileSync(resolve(DATA_DIR, `${image.id}.json`), JSON.stringify(image, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[DevBot ImageGen] Failed to save image ${image.id}: ${err.message}`);
    }
  }
}

export default ImageGenService;
