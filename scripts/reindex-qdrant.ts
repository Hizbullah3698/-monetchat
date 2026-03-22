// Migration: Recreate Qdrant collection with hybrid vectors and re-index all products
// Run: npx tsx --env-file=.env scripts/reindex-qdrant.ts

import { QdrantClient } from '@qdrant/js-client-rest';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const COLLECTION = 'products';
const VECTOR_SIZE = 192; // Dimension for nomic-embed-text (as observed from current Ollama instance)
const BATCH_SIZE = 20;

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

const prisma = new PrismaClient();

const ollamaClient = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL}/v1` : "http://127.0.0.1:11434/v1",
  apiKey: "ollama",
});

// --- BM25 Tokenizer (same as client.ts) ---

function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function textToSparseVector(text: string) {
  const tokens = tokenize(text);
  const frequencies = new Map<number, number>();

  for (const token of tokens) {
    const idx = fnv1aHash(token);
    frequencies.set(idx, (frequencies.get(idx) || 0) + 1);
  }

  const indices = Array.from(frequencies.keys());
  const values = Array.from(frequencies.values());

  return { indices, values };
}

async function getEmbedding(text: string, retries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ollamaClient.embeddings.create({
        model: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
        input: text,
      });
      return response.data[0].embedding;
    } catch (err: unknown) {
      const error = err as { status?: number };
      console.warn(`Embedding failed attempt ${attempt}:`, error?.status || err);
      if (attempt < retries) {
        console.log(`  Retrying in ${attempt * 2}s...`);
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

  const CONCURRENCY = 5;
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(products.length / CONCURRENCY);
    console.log(`Processing batch ${batchNum}/${totalBatches}...`);

    const points = await Promise.all(
      batch.map(async (product) => {
        try {
          console.log(`  - Processing: ${product.title.slice(0, 30)}...`);
          // --- RICH METADATA EXTRACTION ---
          const metaPrompt = `Extract searchable keywords for this product: Brand, Model, Year, Category, Features.
Title: ${product.title}
Desc: ${product.description || 'N/A'}
Keywords:`;

          const metaResponse = await ollamaClient.chat.completions.create({
            model: process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b',
            messages: [{ role: 'system', content: metaPrompt }],
            temperature: 0.1,
            max_tokens: 100,
          });

          const keywords = metaResponse.choices[0].message.content || '';
          const meta = { brand: '', model: '', year: null, features: [], semantic_summary: keywords };

          // --- UNIFIED SEARCHABLE TEXT ---
          const unifiedText = `${product.title} ${product.titleAr || ''} ${keywords} ${product.category?.slug || ''} ${product.condition} ${product.price} ${product.currency} ${product.description || ''} ${product.descriptionAr || ''}`.trim();

          const embedding = await getEmbedding(unifiedText);
          const sparseVector = textToSparseVector(unifiedText);

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
              // ENRICHED METADATA
              brand: meta.brand || undefined,
              model: meta.model || undefined,
              year: meta.year || undefined,
              condition: product.condition,
              features: meta.features || [],
              semantic_summary: meta.semantic_summary || undefined,
            },
          };
        } catch (err) {
          console.error(`  Failed to process product ${product.id}: ${err}`);
          failed++;
          return null;
        }
      })
    );

    const validPoints = points.filter((p): p is NonNullable<typeof p> => p !== null);

    if (validPoints.length > 0) {
      await qdrant.upsert(COLLECTION, {
        wait: true,
        points: validPoints,
      });
      indexed += validPoints.length;
    }
    console.log(`  Indexed ${validPoints.length}/${batch.length}. Total: ${indexed}`);
  }

  // Step 5: Update qdrantPointId in database
  console.log('\nUpdating qdrantPointId in database...');
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { qdrantPointId: product.id },
    }).catch(() => {});
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
