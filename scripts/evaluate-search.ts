import { preprocessSearchQuery } from "../src/lib/ai/query-preprocessor";
import { rerankSearchResults } from "../src/lib/ai/reranker";
import { searchProducts, textToSparseVector } from "../src/lib/qdrant/client";
import { getTextEmbedding } from "../src/lib/ai/openai";

const TEST_QUERIES = [
  "family car",
  "luxury German SUV",
  "white sports car",
  "affordable BMW",
  "comfortable long drive car",
  "7 seater",
  "fuel efficient city car",
  "offroad vehicle",
  "بورش",
  "بي ام دبليو"
];

async function evaluate() {
  console.log("=== Monetchat Search Evaluation ===\n");

  for (const query of TEST_QUERIES) {
    console.log(`Query: "${query}"`);
    
    // Process
    const { expandedQuery, structuredFilters } = await preprocessSearchQuery(query);
    console.log(`  Expanded: "${expandedQuery}"`);
    console.log(`  Filters: ${JSON.stringify(structuredFilters)}`);

    const embedding = await getTextEmbedding(expandedQuery);
    const sparse = textToSparseVector(expandedQuery);

    const results = await searchProducts(
      embedding,
      sparse,
      { country_code: "KW", ...structuredFilters } as any,
      20
    );

    const reranked = rerankSearchResults(results, query, expandedQuery, structuredFilters);
    
    console.log(`  Results (${reranked.length}):`);
    reranked.slice(0, 5).forEach((r, i) => {
      console.log(`    ${i+1}. [Score: ${r.score?.toFixed(3)}, Rerank: ${(r as any).rerankScore?.toFixed(2)}] ${r.payload.title} (${r.payload.brand} ${r.payload.model}) - ${r.payload.price} ${r.payload.currency}`);
    });
    console.log("");
  }
}

evaluate().catch(console.error);
