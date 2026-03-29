/**
 * DevBot AI — LangChain + ChromaDB RAG Integration
 *
 * Retrieval-Augmented Generation service with vector storage,
 * document chunking, and knowledge base management.
 * Uses simulated ChromaDB vector storage persisted to JSON.
 *
 * Revenue: $29/mo Starter (1 KB, 100 docs), $99/mo Pro (10 KB, 1000 docs), $199/mo Enterprise (unlimited)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data/integrations/rag');
mkdirSync(DATA_DIR, { recursive: true });

// ─── Pricing Tiers ────────────────────────────────────────────────────────
const PLANS = {
  starter: { name: 'Starter', price: 29, maxKnowledgeBases: 1, maxDocuments: 100 },
  pro:     { name: 'Pro',     price: 99, maxKnowledgeBases: 10, maxDocuments: 1000 },
  enterprise: { name: 'Enterprise', price: 199, maxKnowledgeBases: Infinity, maxDocuments: Infinity },
};

export class RagService {
  /** @type {Map<string, Object>} */
  #knowledgeBases = new Map();
  /** @type {Object|null} */
  #engine;

  /**
   * @param {Object} [options]
   * @param {Object} [options.engine] - DevBot AI engine instance
   */
  constructor(options = {}) {
    this.#engine = options.engine || null;
    this.#loadAll();
    console.log(`[DevBot RAG] Service initialized — ${this.#knowledgeBases.size} knowledge bases loaded`);
  }

  /**
   * Create a new knowledge base with documents.
   * @param {Object} config - Knowledge base configuration
   * @param {string} config.name - Knowledge base name
   * @param {string} [config.description] - Description of the knowledge base
   * @param {string[]} [config.documents=[]] - Array of document texts to ingest
   * @param {number} [config.chunkSize=500] - Characters per chunk
   * @param {number} [config.overlapSize=50] - Overlap between chunks
   * @param {string} [config.userId] - Owner user ID
   * @returns {Object} Created knowledge base with success status
   */
  createKnowledgeBase(config) {
    if (!config || !config.name) {
      return { success: false, error: 'Knowledge base name is required' };
    }
    if (typeof config.name !== 'string' || config.name.trim().length === 0) {
      return { success: false, error: 'Knowledge base name must be a non-empty string' };
    }

    const chunkSize = config.chunkSize || 500;
    const overlapSize = config.overlapSize || 50;
    const documents = config.documents || [];

    if (chunkSize < 50 || chunkSize > 5000) {
      return { success: false, error: 'chunkSize must be between 50 and 5000' };
    }
    if (overlapSize < 0 || overlapSize >= chunkSize) {
      return { success: false, error: 'overlapSize must be >= 0 and < chunkSize' };
    }

    const id = uuidv4();
    const chunks = this.#chunkDocuments(documents, chunkSize, overlapSize);

    const kb = {
      id,
      name: config.name.trim(),
      description: config.description || '',
      userId: config.userId || 'default',
      chunkSize,
      overlapSize,
      documentCount: documents.length,
      chunks,
      embeddingsMetadata: {
        model: 'text-embedding-simulated',
        dimensions: 1536,
        totalChunks: chunks.length,
      },
      queryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.#knowledgeBases.set(id, kb);
    this.#save(kb);
    console.log(`[DevBot RAG] Created knowledge base: ${kb.name} (${id}) — ${chunks.length} chunks`);

    return {
      success: true,
      knowledgeBase: {
        id: kb.id,
        name: kb.name,
        description: kb.description,
        documentCount: kb.documentCount,
        chunkCount: chunks.length,
        createdAt: kb.createdAt,
      },
    };
  }

  /**
   * Query a knowledge base with a natural language question.
   * Retrieves relevant chunks and sends to Claude for answer generation.
   * @param {string} kbId - Knowledge base ID
   * @param {string} question - Natural language question
   * @param {Object} [options] - Query options
   * @param {number} [options.topK=3] - Number of relevant chunks to retrieve
   * @returns {Promise<Object>} Answer with source chunks and confidence
   */
  async queryKnowledgeBase(kbId, question, options = {}) {
    if (!kbId) {
      return { success: false, error: 'Knowledge base ID is required' };
    }
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return { success: false, error: 'Question must be a non-empty string' };
    }

    const kb = this.#knowledgeBases.get(kbId);
    if (!kb) {
      return { success: false, error: `Knowledge base not found: ${kbId}` };
    }

    const topK = options.topK || 3;
    const relevantChunks = this.#findRelevantChunks(kb.chunks, question, topK);

    // Increment query count
    kb.queryCount += 1;
    kb.updatedAt = new Date().toISOString();
    this.#save(kb);

    const context = relevantChunks.map((c, i) => `[Chunk ${i + 1}]: ${c.text}`).join('\n\n');

    // Try AI engine for answer generation
    if (this.#engine && typeof this.#engine.generate === 'function') {
      try {
        const prompt = `Based on the following context, answer the question. If the context doesn't contain enough information, say so.\n\nContext:\n${context}\n\nQuestion: ${question}`;
        const answer = await this.#engine.generate(prompt);
        console.log(`[DevBot RAG] Query answered via AI for KB ${kbId}`);
        return {
          success: true,
          answer,
          sourceChunks: relevantChunks,
          knowledgeBaseId: kbId,
          confidence: 0.85,
          queryCount: kb.queryCount,
        };
      } catch (err) {
        console.error(`[DevBot RAG] AI engine query failed: ${err.message}`);
      }
    }

    // Graceful fallback
    console.log(`[DevBot RAG] Query answered via fallback for KB ${kbId}`);
    return {
      success: true,
      answer: `Based on ${relevantChunks.length} relevant chunks from "${kb.name}", the most relevant information relates to your question about "${question}". Full AI-generated answer requires the AI engine to be connected.`,
      sourceChunks: relevantChunks,
      knowledgeBaseId: kbId,
      confidence: 0.5,
      queryCount: kb.queryCount,
      note: 'AI engine unavailable — returning chunk-based summary',
    };
  }

  /**
   * Add documents to an existing knowledge base.
   * @param {string} kbId - Knowledge base ID
   * @param {string[]} documents - Array of document texts to add
   * @returns {Object} Updated knowledge base stats
   */
  addDocuments(kbId, documents) {
    if (!kbId) {
      return { success: false, error: 'Knowledge base ID is required' };
    }
    if (!Array.isArray(documents) || documents.length === 0) {
      return { success: false, error: 'documents must be a non-empty array of strings' };
    }

    const kb = this.#knowledgeBases.get(kbId);
    if (!kb) {
      return { success: false, error: `Knowledge base not found: ${kbId}` };
    }

    const newChunks = this.#chunkDocuments(documents, kb.chunkSize, kb.overlapSize);
    kb.chunks.push(...newChunks);
    kb.documentCount += documents.length;
    kb.embeddingsMetadata.totalChunks = kb.chunks.length;
    kb.updatedAt = new Date().toISOString();

    this.#save(kb);
    console.log(`[DevBot RAG] Added ${documents.length} documents (${newChunks.length} chunks) to KB ${kbId}`);

    return {
      success: true,
      knowledgeBaseId: kbId,
      addedDocuments: documents.length,
      addedChunks: newChunks.length,
      totalDocuments: kb.documentCount,
      totalChunks: kb.chunks.length,
    };
  }

  /**
   * Delete a knowledge base and its persisted data.
   * @param {string} kbId - Knowledge base ID
   * @returns {Object} Deletion result
   */
  deleteKnowledgeBase(kbId) {
    if (!kbId) {
      return { success: false, error: 'Knowledge base ID is required' };
    }

    const kb = this.#knowledgeBases.get(kbId);
    if (!kb) {
      return { success: false, error: `Knowledge base not found: ${kbId}` };
    }

    const name = kb.name;
    this.#knowledgeBases.delete(kbId);

    try {
      const filePath = resolve(DATA_DIR, `${kbId}.json`);
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch (err) {
      console.error(`[DevBot RAG] Failed to delete file for KB ${kbId}: ${err.message}`);
    }

    console.log(`[DevBot RAG] Deleted knowledge base: ${name} (${kbId})`);
    return { success: true, deletedId: kbId, name };
  }

  /**
   * List all knowledge bases for a user.
   * @param {string} [userId='default'] - User ID to filter by
   * @returns {Object} List of knowledge bases
   */
  listKnowledgeBases(userId = 'default') {
    const knowledgeBases = Array.from(this.#knowledgeBases.values())
      .filter(kb => kb.userId === userId)
      .map(kb => ({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        documentCount: kb.documentCount,
        chunkCount: kb.chunks.length,
        queryCount: kb.queryCount,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      }));

    return { success: true, knowledgeBases, count: knowledgeBases.length };
  }

  /** Integration metadata for the registry. */
  static get registryEntry() {
    return {
      id: 'langchain-rag',
      name: 'LangChain + ChromaDB RAG',
      repo_url: '',
      type: 'sdk',
      status: 'active',
      capabilities: [
        'create_knowledge_base', 'query_knowledge_base', 'add_documents',
        'delete_knowledge_base', 'list_knowledge_bases', 'vector_search',
      ],
      config: {
        revenue: '$29-$199/mo tiered',
        plans: PLANS,
      },
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Chunk an array of document strings into overlapping text chunks.
   * @param {string[]} documents
   * @param {number} chunkSize
   * @param {number} overlapSize
   * @returns {Object[]}
   */
  #chunkDocuments(documents, chunkSize, overlapSize) {
    const chunks = [];
    for (let docIdx = 0; docIdx < documents.length; docIdx++) {
      const text = documents[docIdx];
      if (!text || typeof text !== 'string') continue;

      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push({
          id: uuidv4(),
          documentIndex: docIdx,
          text: text.slice(start, end),
          startChar: start,
          endChar: end,
        });
        start += chunkSize - overlapSize;
        if (start >= text.length) break;
      }
    }
    return chunks;
  }

  /**
   * Simple keyword-based relevance search (simulates vector similarity).
   * @param {Object[]} chunks
   * @param {string} query
   * @param {number} topK
   * @returns {Object[]}
   */
  #findRelevantChunks(chunks, query, topK) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scored = chunks.map(chunk => {
      const lower = chunk.text.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (lower.includes(word)) score += 1;
      }
      return { ...chunk, relevanceScore: score / Math.max(queryWords.length, 1) };
    });

    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK)
      .filter(c => c.relevanceScore > 0);
  }

  #loadAll() {
    try {
      const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter(f => f.endsWith('.json')) : [];
      for (const file of files) {
        try {
          const data = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8'));
          if (data.id) this.#knowledgeBases.set(data.id, data);
        } catch (err) {
          console.error(`[DevBot RAG] Failed to load ${file}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`[DevBot RAG] Failed to load knowledge bases: ${err.message}`);
    }
  }

  #save(kb) {
    try {
      writeFileSync(resolve(DATA_DIR, `${kb.id}.json`), JSON.stringify(kb, null, 2), 'utf-8');
    } catch (err) {
      console.error(`[DevBot RAG] Failed to save KB ${kb.id}: ${err.message}`);
    }
  }
}

export default RagService;
