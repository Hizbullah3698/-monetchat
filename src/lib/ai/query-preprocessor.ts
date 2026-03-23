import { AiFactory } from "./ai-factory";

/**
 * Preprocess and expand a raw user search query to improve semantic retrieval.
 * Handles normalization, spell correction, and bilingual expansion.
 */
export async function preprocessSearchQuery(
  rawQuery: string,
  language: "ar" | "en" = "en"
): Promise<{
  expandedQuery: string;
  structuredFilters: {
    category?: string;
    brand?: string;
    model?: string;
    min_price?: number;
    max_price?: number;
    year?: number;
  };
}> {
  const prompt = `You are a search query optimizer for a marketplace in Kuwait/Saudi Arabia.
Your goal is to take a vague or conversational user query and expand it into a set of semantic keywords and structured filters.

USER QUERY: "${rawQuery}"
DETECTED LANGUAGE: ${language === "ar" ? "Arabic" : "English"}

RULES:
1. Normalization: Standardize brands (بي ام -> BMW, مرسيدس -> Mercedes).
2. Expansion: If the query is vague (e.g., "family car"), add terms like "7 seater, SUV, spacious, van, large".
3. Spelling: Correct obvious typos.
4. Translation: Always include both English and Arabic keywords in the expandedQuery.
5. Extraction: Extract price, year, or category if mentioned.

OUTPUT FORMAT (JSON):
{
  "expandedQuery": "string of keywords in both EN and AR",
  "structuredFilters": {
    "category": "vehicles|electronics|property|fashion|furniture|services|jobs|other",
    "brand": "string",
    "model": "string",
    "min_price": number,
    "max_price": number,
    "year": number
  }
}

Return ONLY valid JSON.`;

  try {
    const response = await AiFactory.getProvider().createChatCompletion({
      model: AiFactory.getProvider().getDefaultChatModel(),
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content;
    const result = content ? JSON.parse(content) : {};

    return {
      expandedQuery: result.expandedQuery || rawQuery,
      structuredFilters: result.structuredFilters || {},
    };
  } catch (error) {
    console.error("Query preprocessing failed:", error);
    return {
      expandedQuery: rawQuery,
      structuredFilters: {},
    };
  }
}
