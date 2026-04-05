import { getTextEmbedding } from '../src/lib/ai/openai';
import { searchProducts, textToSparseVector, PRODUCTS_COLLECTION, qdrant } from '../src/lib/qdrant/client';

async function runTest(query: string) {
  console.log(`\n================================`);
  console.log(`TEST QUERY: "${query}"`);
  console.log(`================================`);
  
  try {
    const embedding = await getTextEmbedding(query);
    const sparse = textToSparseVector(query);
    const filters = { country_code: "KW" };
    
    // Pass high limit to ensure we see exactly what Qdrant cuts off
    const results = await searchProducts(embedding, sparse, filters, 10);
    
    console.log(`RESULTS RETURNED: ${results.length}`);
    
    if (results.length > 0) {
      const { prisma } = require('../src/lib/db/prisma');
      const productIds = results.map(r => r.payload.product_id);
      
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } }
      });
      
      // Map title to results and sort by RRF rank
      const top3 = results.slice(0, 3).map((r, index) => {
        const dbp = dbProducts.find((db: any) => db.id === r.payload.product_id);
        // Using RRF score, so score is the rank math, print it nicely
        return `${index + 1}. [Score: ${r.score.toFixed(4)}] ${dbp?.title || 'Unknown Title'}`;
      });
      
      console.log('TOP 3 RESULTS:');
      top3.forEach(str => console.log(`  ${str}`));
    } else {
      console.log('TOP 3 RESULTS: None (No products found)');
    }
  } catch (e: any) {
    console.error(`Error during query "${query}":`, e.message);
  }
}

async function main() {
  const queries = [
    "nissan",
    "tesla",
    "apartment Kuwait",
    "car",
    "xyzabc"
  ];
  
  for (const q of queries) {
    await runTest(q);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
