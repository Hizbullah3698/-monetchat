import { SearchResult } from "../qdrant/client";

/**
 * Rerank search results based on explicit metadata matches and semantic consistency.
 */
export function rerankSearchResults(
  results: SearchResult[],
  originalQuery: string,
  expandedQuery: string,
  requestedFilters: Record<string, any>
): SearchResult[] {
  const queryLower = originalQuery.toLowerCase();
  const expandedLower = expandedQuery.toLowerCase();

  return results
    .map((res) => {
      let boost = 0;
      const p = res.payload;
      const title = (p.title || "").toLowerCase();
      const titleAr = (p.title_ar || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();

      // 1. Exact Brand/Model Match Boost
      if (requestedFilters.brand) {
        const brand = requestedFilters.brand.toLowerCase();
        if (title.includes(brand) || titleAr.includes(brand)) boost += 5.0;
      }
      if (requestedFilters.model) {
        const model = requestedFilters.model.toLowerCase();
        if (title.includes(model) || titleAr.includes(model)) boost += 5.0;
      }

      // 2. Keyword Match in Title (Original Query)
      const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
      for (const term of queryTerms) {
        if (title.includes(term) || titleAr.includes(term)) boost += 2.0;
      }

      // 3. Category Alignment
      if (requestedFilters.category && p.category_slug === requestedFilters.category) {
        boost += 3.0;
      }

      // 4. Price Logic (if user specified range)
      if (requestedFilters.max_price && p.price <= requestedFilters.max_price) {
        boost += 1.0;
      }

      // 5. Semantic Score Integration
      // Qdrant score is already RRF fused, but we add our boost
      return {
        ...res,
        rerankScore: (res.score || 0) + boost,
      };
    })
    .sort((a, b) => (b as any).rerankScore - (a as any).rerankScore);
}
