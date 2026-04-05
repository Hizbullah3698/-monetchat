import { getTextEmbedding } from '../src/lib/ai/openai';
import { PRODUCTS_COLLECTION, qdrant } from '../src/lib/qdrant/client';

async function main() {
  const queries = ['car', 'tesla'];
  for (const query of queries) {
    console.log('\n================================');
    console.log('RAW DENSE COSINE QUERY:', query);
    console.log('================================');
    const e1 = await getTextEmbedding(query);
    
    const r1 = await qdrant.query(PRODUCTS_COLLECTION, { 
      query: e1,
      using: 'dense',
      limit: 5,
      with_payload: true
    });
    
    r1.points.forEach((p: any, i: number) => {
      console.log(`Rank ${i+1} | Raw Cosine Score: ${p.score.toFixed(4)} | Title: ${p.payload?.title || p.payload?.title_ar}`);
    });
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
