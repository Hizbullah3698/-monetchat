import { getTextEmbedding } from '../src/lib/ai/openai';
import { searchProducts, textToSparseVector, PRODUCTS_COLLECTION, qdrant } from '../src/lib/qdrant/client';

async function main() {
  console.log('--- TEST QDRANT SEARCH ---');
  console.log('QDRANT_URL:', process.env.QDRANT_URL);
  console.log('QDRANT_API_KEY set?', !!process.env.QDRANT_API_KEY);
  console.log('Collection Name:', PRODUCTS_COLLECTION);
  console.log('--------------------------');

  try {
    const info = await qdrant.getCollection(PRODUCTS_COLLECTION);
    console.log(`Collection ${PRODUCTS_COLLECTION} exists. Vectors count: ${info.points_count}`);
  } catch (e: any) {
    console.error(`Collection check failed: ${e.message}`);
  }
  
  const query = "tesla";
  
  try {
    console.log(`\n1. Fetching dense embedding for: "${query}"`);
    console.time('Embedding Speed');
    const embedding = await getTextEmbedding(query);
    console.timeEnd('Embedding Speed');
    console.log(`   -> Success! Vector length: ${embedding.length}`);
    
    console.log(`\n2. Generating sparse BM25 vector for: "${query}"`);
    const sparse = textToSparseVector(query);
    console.log(`   -> Indices: ${sparse.indices.length}, Values: ${sparse.values.length}`);
    
    console.log(`\n3. Querying Qdrant index...`);
    const filters = { country_code: "KW" };
    console.log('   Filters:', JSON.stringify(filters));
    
    console.time('Qdrant Speed');
    const results = await searchProducts(embedding, sparse, filters, 5);
    console.timeEnd('Qdrant Speed');
    
    console.log(`\nQdrant returned ${results.length} results.`);
    if (results.length > 0) {
      console.log('Top 3 IDs from Qdrant:', results.slice(0, 3).map(r => r.id));
      
      const productIds = results.map((r) => r.payload.product_id);
      console.log(`\n4. Querying Prisma for these ${productIds.length} IDs...`);
      const { prisma } = require('../src/lib/db/prisma');
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });
      console.log(`Prisma returned ${dbProducts.length} products.`);
      console.log('Product Titles:', dbProducts.map(p => p.title).join(', '));
      if (dbProducts.length === 0) {
        console.error('❌ FATAL MISMATCH: Qdrant returned vectors, but Prisma returned 0 products. Your Qdrant IDs likely do not match your Neon DB IDs!');
      } else {
        console.log('✅ Pipeline fully functional. IDs map correctly.');
      }
    } else {
      console.log('\n❌ ERROR: 0 results returned. This means the query executed successfully on Qdrant, but NO products matched the filter or vector.');
    }
  } catch (err: any) {
    console.error('\n❌ PIPELINE BROKE HERE:', err.message);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
