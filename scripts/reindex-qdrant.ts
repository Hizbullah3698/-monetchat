// Migration: Recreate Qdrant collection with hybrid vectors and re-index all products
// Run: npx tsx --env-file=.env scripts/reindex-qdrant.ts

import { QdrantClient } from '@qdrant/js-client-rest';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const COLLECTION = 'products';
const VECTOR_SIZE = 768; // nomic-embed-text
const BATCH_SIZE = 20;

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

const prisma = new PrismaClient();

const openai = new OpenAI({
  baseURL: `${process.env.OLLAMA_BASE_URL}/v1`,
  apiKey: process.env.OLLAMA_API_KEY || 'ollama',
  defaultHeaders: {
    'x-api-key': process.env.OLLAMA_API_KEY || '',
  },
});

const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || process.env.OLLAMA_MODEL_EMBEDDING || 'nomic-embed-text';

// --- BM25 Tokenizer (same as client.ts) ---

function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

function textToSparseVector(text: string): { indices: number[]; values: number[] } {
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);

  if (tokens.length === 0) return { indices: [], values: [] };

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

async function getEmbedding(text: string, retries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 429 && attempt < retries) {
        console.log(`  Rate limited, waiting ${attempt * 2}s...`);
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to get embedding after retries');
}

async function main() {
  console.log('=== Qdrant Hybrid Search Migration ===\n');

  // Step 1: Delete existing collection
  try {
    const exists = await qdrant.collectionExists(COLLECTION);
    if (exists.exists) {
      console.log(`Deleting existing "${COLLECTION}" collection...`);
      await qdrant.deleteCollection(COLLECTION);
      console.log('Deleted.\n');
    }
  } catch {
    console.log('Collection does not exist, creating fresh.\n');
  }

  // Step 2: Create hybrid collection
  console.log(`Creating "${COLLECTION}" collection with hybrid vectors...`);
  await qdrant.createCollection(COLLECTION, {
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
  ];

  for (const index of indexes) {
    await qdrant.createPayloadIndex(COLLECTION, index);
  }
  console.log('Collection created with payload indexes.\n');

  // Step 3: Fetch all active products
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    include: {
      category: { select: { slug: true } },
    },
  });

  console.log(`Found ${products.length} active products to re-index.\n`);

  if (products.length === 0) {
    console.log('No products to index. Done.');
    return;
  }

  // Step 4: Process in batches
  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(products.length / BATCH_SIZE);
    console.log(`Processing batch ${batchNum}/${totalBatches}...`);

    const points = await Promise.all(
      batch.map(async (product) => {
        try {
          const searchText = `${product.title} ${product.description || ''}`.trim();
          const embedding = await getEmbedding(searchText);
          const sparseVector = textToSparseVector(searchText);

          return {
            id: product.id,
            vector: {
              dense: embedding,
              bm25: sparseVector,
            },
            payload: {
              product_id: product.id,
              seller_id: product.sellerId,
              title: product.title,
              title_ar: product.titleAr || undefined,
              description: product.description || undefined,
              price: Number(product.price),
              currency: product.currency,
              category_slug: product.category?.slug || 'other',
              country_code: product.countryCode,
              region_id: product.regionId || undefined,
              status: product.status,
              created_at: product.createdAt.toISOString(),
            },
          };
        } catch (err) {
          console.error(`  Failed to process product ${product.id}: ${err}`);
          failed++;
          return null;
        }
      })
    );

    const validPoints = points.filter(
      (p): p is NonNullable<typeof p> => p !== null
    );

    if (validPoints.length > 0) {
      await qdrant.upsert(COLLECTION, {
        wait: true,
        points: validPoints,
      });
      indexed += validPoints.length;
    }

    console.log(`  Indexed ${validPoints.length}/${batch.length} products.`);

    // Rate limit delay between batches
    if (i + BATCH_SIZE < products.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Step 5: Update qdrantPointId in database
  console.log('\nUpdating qdrantPointId in database...');
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { qdrantPointId: product.id },
    }).catch(() => { });
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Indexed: ${indexed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${products.length}`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
