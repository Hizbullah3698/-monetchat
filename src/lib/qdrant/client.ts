// Qdrant Vector Database Client
// Hybrid search: dense vectors (semantic) + sparse BM25 vectors (keyword matching)

import { QdrantClient } from '@qdrant/js-client-rest';

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

// Collection name
const PRODUCTS_COLLECTION = 'products';

// Vector dimensions (Ollama nomic-embed-text)
const VECTOR_SIZE = 192;

// ============================================
// BM25 SPARSE TOKENIZER
// ============================================

export interface SparseVectorData {
  indices: number[];
  values: number[];
}

/**
 * FNV-1a 32-bit hash for deterministic token-to-index mapping.
 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Convert text to a sparse BM25 vector.
 * Works for both English and Arabic via Unicode-aware tokenization.
 * Qdrant's `modifier: "idf"` handles IDF weighting at query time.
 */
export function textToSparseVector(text: string): SparseVectorData {
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) {
    return { indices: [], values: [] };
  }

  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }

  const indices: number[] = [];
  const values: number[] = [];

  for (const [token, count] of termFreq) {
    indices.push(fnv1aHash(token));
    values.push(count);
  }

  return { indices, values };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function collectionExists(name: string): Promise<boolean> {
  try {
    await qdrant.getCollection(name);
    return true;
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err?.status === 404) return false;
    throw error;
  }
}

// ============================================
// INITIALIZATION
// ============================================

export async function initializeQdrant(): Promise<void> {
  const exists = await collectionExists(PRODUCTS_COLLECTION);

  if (!exists) {
    console.log('Creating Qdrant "products" collection with hybrid vectors...');

    await qdrant.createCollection(PRODUCTS_COLLECTION, {
      vectors: {
        dense: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      },
      sparse_vectors: {
        bm25: {
          modifier: 'idf',
        },
      },
      optimizers_config: {
        indexing_threshold: 10000,
      },
      on_disk_payload: true,
    });

    const indexes = [
      { field_name: 'country_code', field_schema: 'keyword' as const },
      { field_name: 'category_slug', field_schema: 'keyword' as const },
      { field_name: 'price', field_schema: 'float' as const },
      { field_name: 'status', field_schema: 'keyword' as const },
      { field_name: 'region_id', field_schema: 'integer' as const },
      { field_name: 'brand', field_schema: 'keyword' as const },
      { field_name: 'model', field_schema: 'keyword' as const },
      { field_name: 'year', field_schema: 'integer' as const },
      { field_name: 'condition', field_schema: 'keyword' as const },
    ];

    for (const index of indexes) {
      await qdrant.createPayloadIndex(PRODUCTS_COLLECTION, index);
    }

    console.log('Qdrant "products" collection initialized with hybrid vectors');
  } else {
    console.log('Qdrant "products" collection already exists');
  }
}

// ============================================
// PRODUCT INDEXING
// ============================================

export interface ProductPayload {
  product_id: string;
  seller_id: string;
  title: string;
  title_ar?: string;
  description?: string;
  price: number;
  currency: string;
  category_slug: string;
  country_code: string;
  region_id?: number;
  status: string;
  created_at: string;
  brand?: string;
  model?: string;
  year?: number;
  condition?: string;
  features?: string[];
  semantic_summary?: string;
  [key: string]: unknown;
}

export async function indexProduct(
  productId: string,
  embedding: number[],
  sparseVector: SparseVectorData,
  payload: ProductPayload
): Promise<void> {
  await qdrant.upsert(PRODUCTS_COLLECTION, {
    wait: true,
    points: [
      {
        id: productId,
        vector: {
          dense: embedding,
          bm25: sparseVector,
        },
        payload,
      },
    ],
  });
}

export async function deleteProductFromIndex(productId: string): Promise<void> {
  await qdrant.delete(PRODUCTS_COLLECTION, {
    wait: true,
    points: [productId],
  });
}

// ============================================
// SEARCH
// ============================================

export interface SearchFilters {
  country_code: string;
  category_slug?: string;
  min_price?: number;
  max_price?: number;
  region_id?: number;
  brand?: string;
  model?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: ProductPayload;
}

let _initialized = false;
async function ensureCollection(): Promise<void> {
  if (_initialized) return;
  const exists = await collectionExists(PRODUCTS_COLLECTION);
  if (!exists) {
    await initializeQdrant();
  }
  _initialized = true;
}

/**
 * Hybrid search: dense (semantic) + sparse (BM25 keyword) fused via RRF.
 */
export async function searchProducts(
  queryEmbedding: number[],
  querySparseVector: SparseVectorData,
  filters: SearchFilters,
  limit: number = 10,
  offset: number = 0
): Promise<SearchResult[]> {
  await ensureCollection();

  // Build filter conditions
  const must: Array<Record<string, unknown>> = [
    { key: 'country_code', match: { value: filters.country_code } },
    { key: 'status', match: { value: 'active' } },
  ];

  if (filters.category_slug) {
    must.push({ key: 'category_slug', match: { value: filters.category_slug } });
  }

  if (filters.region_id) {
    must.push({ key: 'region_id', match: { value: filters.region_id } });
  }

  if (filters.min_price !== undefined || filters.max_price !== undefined) {
    const range: Record<string, number> = {};
    if (filters.min_price !== undefined) range.gte = filters.min_price;
    if (filters.max_price !== undefined) range.lte = filters.max_price;
    must.push({ key: 'price', range });
  }

  if (filters.brand) {
    must.push({ key: 'brand', match: { value: filters.brand } });
  }

  if (filters.model) {
    must.push({ key: 'model', match: { value: filters.model } });
  }

  const filter = { must };

  // Hybrid search: prefetch from both dense and sparse, fuse with RRF
  const response = await qdrant.query(PRODUCTS_COLLECTION, {
    prefetch: [
      {
        query: queryEmbedding,
        using: 'dense',
        filter,
        limit: 20,
      },
      {
        query: {
          indices: querySparseVector.indices,
          values: querySparseVector.values,
        },
        using: 'bm25',
        filter,
        limit: 20,
      },
    ],
    query: { fusion: 'rrf' },
    limit,
    offset,
    with_payload: true,
  });

  return response.points.map((r) => ({
    id: r.id as string,
    score: r.score,
    payload: r.payload as unknown as ProductPayload,
  }));
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkQdrantConnection(): Promise<boolean> {
  try {
    await qdrant.getCollections();
    return true;
  } catch {
    return false;
  }
}

export { qdrant, PRODUCTS_COLLECTION };
