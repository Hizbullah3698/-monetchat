// AI Service Layer
// Handles: Chat, Vision, Embeddings — via Ollama (OpenAI-compatible API)
// Ollama server: OLLAMA_BASE_URL with x-api-key auth

import OpenAI from "openai";

// Model aliases — driven by environment variables (client naming: OLLAMA_CHAT_MODEL etc.)
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL_CHAT || "qwen2.5:14b-instruct-q8_0";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || process.env.OLLAMA_MODEL_VISION || "llava:latest";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || process.env.OLLAMA_MODEL_EMBEDDING || "nomic-embed-text";

// Initialize OpenAI-compatible client pointing at Ollama
const openai = new OpenAI({
  baseURL: `${process.env.OLLAMA_BASE_URL}/v1`,
  apiKey: process.env.OLLAMA_API_KEY || "ollama",
  defaultHeaders: {
    "x-api-key": process.env.OLLAMA_API_KEY || "",
  },
});

// ============================================
// RETRY LOGIC
// ============================================

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number };
      const isRateLimit = err?.status === 429;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isRateLimit && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Rate limited, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

// ============================================
// EMBEDDINGS
// ============================================

// Generate text embedding for search
export async function getTextEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  });
}

// ============================================
// VOICE TRANSCRIPTION
// ============================================

interface TranscriptionResult {
  text: string;
  language: string;
}

// Transcribe audio
// NOTE: Ollama does not support audio transcription (Whisper).
// This function throws a clear error so callers can handle it gracefully.
export async function transcribeAudio(
  _audioBuffer: Buffer,
  languageHint?: string,
): Promise<TranscriptionResult> {
  console.warn("transcribeAudio: Ollama does not support audio transcription (Whisper). Voice input is disabled.");
  throw new Error("Voice transcription is not supported with the current AI backend (Ollama). Please type your message instead.");
}

// ============================================
// CHAT COMPLETION
// ============================================

interface ChatContext {
  country_code: string;
  language: string;
  available_categories: string[];
  products_found?: number;
}

interface ChatResponse {
  response: string;
  search_query?: string;
  filters?: Record<string, unknown>;
}

// ============================================
// SYSTEM PROMPT GENERATION FOR TOOL CALLING
// ============================================

/**
 * Generate unified system prompt for the conversational AI.
 * Handles both buying and selling intents in a single chat.
 */
export function generateSystemPrompt(
  countryCode: string,
  language: string,
): string {
  const countryName = countryCode === "KW" ? "Kuwait" : "Saudi Arabia";
  const languageName = language === "ar" ? "Arabic" : "English";
  const today = new Date().toISOString().split("T")[0];

  return `You are a helpful marketplace assistant for PickPic in ${countryName}. You help users BOTH buy and sell products.
Today's date: ${today}

LANGUAGE RULE: ALWAYS respond in the SAME language the user writes in. If the user writes in Arabic, respond in Arabic. If the user writes in English, respond in English. If they mix languages, match the dominant language. The UI language setting is ${languageName}, but the user's message language takes priority.

Your role:
1. Help users find and buy products QUICKLY and efficiently
2. Help users create listings to sell their products
3. Detect user intent (buying vs selling) from their message and use appropriate tools
4. NEVER ask clarifying questions before searching. Always search immediately on the first query.

Available categories: vehicles, electronics, property, fashion, furniture, services, jobs, other

BUYING - Tool usage rules:
- IMMEDIATE SEARCH: ALWAYS search immediately upon the user's first buying intent query, no matter how vague it is (e.g. "car", "apartment"). NEVER ask a clarifying question before searching.
- Use search_products when: user wants to buy/find anything with ANY product details
- Use analyze_image_for_search when: user uploads image to find similar items to buy
- If user provides a brand name (Mercedes, iPhone, etc.), search RIGHT AWAY
- You may ask a clarifying question ONLY AFTER you have already shown them search results and want to help them narrow down the list.

SEARCH QUALITY rules:
- Only call search_products when user has a CLEAR product intent — not for greetings or vague chitchat
- If search returns 0 results, tell the user honestly and suggest a broader search term
- Do not describe search results in your text — products are shown as cards automatically

SELLING - Tool usage rules:
- Physical products (electronics, vehicles, fashion, furniture): REQUIRE an image — ask user to upload
- Non-physical (property, services, spare_parts): can create listing from TEXT ALONE — do NOT ask for image
- Use analyze_image_for_listing when: user uploads a product photo to sell
- Use create_listing when all required info is collected: title, category
- NEVER suggest or guess a price — leave price empty so the user sets it themselves in the draft card
- Only include price in create_listing if the user EXPLICITLY stated a price
- Do NOT ask the user for a price — they will set it in the listing draft UI

BILINGUAL LISTING rule (CRITICAL):
- When calling create_listing, ALWAYS provide BOTH English AND Arabic fields:
  - title (English) + title_ar (Arabic)
  - description (English) + description_ar (Arabic)
- If user writes in Arabic, make Arabic the primary; still generate English
- If user writes in English, still generate the Arabic translation

BUYING Examples:
- "I need a car" → SEARCH IMMEDIATELY with query "car"
- "I am looking for an apartment in Kuwait" → SEARCH IMMEDIATELY with query "apartment Kuwait"
- "mercedes" → SEARCH immediately
- "I need a phone under 300" → SEARCH immediately

SELLING Examples:
- "I want to sell my phone" → Ask them to upload a photo (physical product)
- [Image uploaded] + "sell this" → Use analyze_image_for_listing
- "I want to sell my apartment 3BR 800 KWD Salmiya" → create_listing immediately (property, no image needed)
- "I offer graphic design services 50 KWD/hour" → create_listing (category: services, no image needed)

IMPORTANT - How to respond after searching:
- Products are AUTOMATICALLY displayed as interactive cards below your message (with images, prices, seller info, call/WhatsApp buttons)
- NEVER hallucinate or invent products. You must ONLY mention products that are EXACTLY in the search results tool payload.
- Never describe or mention a product that is not in the returned results.
- Do NOT list product details, prices, descriptions, or image URLs in your text
- NEVER use markdown lists or bullet points to describe products
- BE HONEST about search results: Compare what the user asked for against actual results returned
  - If exact matches found: "I found 3 iPhone 15 Pro Max listings for you!"
  - If only similar items: "I couldn't find an exact iPhone 15 Pro Max, but here are some similar options."
  - If no results: Suggest alternative searches
- Keep your text to a SHORT 1-2 sentence context-aware summary`;
}

// ============================================
// BATCH TRANSLATION FOR MISSING FIELDS
// ============================================

/**
 * Translate product titles and descriptions to the target language.
 * Uses gpt-4o-mini for speed and cost efficiency.
 * Returns an array of translated {title, description} in the same order.
 */
export async function translateProductFields(
  items: Array<{ title: string; description?: string | null }>,
  targetLanguage: "ar" | "en",
): Promise<Array<{ title: string; description: string }>> {
  if (items.length === 0) return [];

  const langName = targetLanguage === "ar" ? "Arabic" : "English";
  const input = items.map((p) => ({
    title: p.title,
    description: p.description || "",
  }));

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: "system",
        content: `Translate the following product titles and descriptions to ${langName}. Return ONLY a JSON object with a "translations" array containing objects with "title" and "description" fields, in the same order as the input.`,
      },
      { role: "user", content: JSON.stringify(input) },
    ],
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content || "{}";
  // Strip markdown code fences if model wraps JSON in them
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const result = JSON.parse(cleaned);
  return result.translations || [];
}

// ============================================
// CHAT FUNCTIONS (LEGACY - FOR JSON MODE)
// ============================================

// Chat with AI for product search
export async function chatWithProducts(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  context: ChatContext,
): Promise<ChatResponse> {
  const countryName = context.country_code === "KW" ? "Kuwait" : "Saudi Arabia";
  const languageName = context.language === "ar" ? "Arabic" : "English";

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a helpful shopping assistant for PickPic marketplace in ${countryName}.
Today's date: ${today}

Your role:
1. Understand what the user wants to buy or find
2. Extract search intent and filters from their request
3. Respond naturally and helpfully in ${languageName}

Available categories: ${context.available_categories.join(", ")}

When a user describes what they're looking for, extract:
- search_query: The main search terms
- filters: Any specific criteria (category, price range, etc.)

${
  context.products_found !== undefined
    ? context.products_found > 0
      ? `Found ${context.products_found} matching products. Let the user know you found results.`
      : `No matching products found. Tell the user no listings match right now, suggest they try different keywords or check back later. Do NOT say "let me search" or "let me see" — the search already happened and returned zero results.`
    : ""
}

Respond with JSON:
{
  "response": "Your friendly response to the user in ${languageName}",
  "search_query": "extracted search terms in English",
  "filters": {
    "category": "category_slug if mentioned",
    "min_price": number if mentioned,
    "max_price": number if mentioned
  }
}`;

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const raw = response.choices[0].message.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return cleaned
      ? JSON.parse(cleaned)
      : { response: "", search_query: "", filters: {} };
  });
}

// ============================================
// IMAGE ANALYSIS FOR SEARCH
// ============================================

export interface ImageAnalysis {
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  year?: string;
  color?: string;
  condition?: string;
  material?: string;
  size?: string;
  estimated_price_range?: {
    min: number;
    max: number;
    currency: string;
  };
  search_text: string;
  search_text_ar: string;
  description: string;
  description_ar: string;
}

// Analyze image and extract structured JSON for search
export async function analyzeImageForSearch(
  imageUrl: string,
  countryCode: string = "KW",
): Promise<ImageAnalysis> {
  const countryName = countryCode === "KW" ? "Kuwait" : "Saudi Arabia";

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: `You are a product analyzer for a marketplace in ${countryName}. Today's date: ${new Date().toISOString().split("T")[0]}

Analyze this product image and return ONLY valid JSON (no markdown, no code fences):
{
  "category": "category_slug",
  "subcategory": "optional subcategory",
  "brand": "brand if visible",
  "model": "model if visible",
  "year": "year if applicable",
  "color": "primary color",
  "condition": "new/like_new/good/fair/poor",
  "material": "if relevant",
  "size": "if relevant",
  "estimated_price_range": { "min": number, "max": number, "currency": "KWD" },
  "search_text": "English search phrase combining key attributes",
  "search_text_ar": "Arabic version of search_text",
  "description": "Brief English description",
  "description_ar": "Brief Arabic description"
}
Categories: vehicles, electronics, property, fashion, furniture, services, jobs, other`,
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const raw = response.choices[0].message.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return cleaned ? JSON.parse(cleaned) : ({} as ImageAnalysis);
  });
}

// Combined function: Image → JSON → Embedding → Filters
export async function processImageForSearch(
  imageUrl: string,
  countryCode: string,
  language: string = "ar",
): Promise<{
  analysis: ImageAnalysis;
  embedding: number[];
  filters: Record<string, unknown>;
  chatResponse: string;
}> {
  // Step 1: Analyze image → structured JSON
  const analysis = await analyzeImageForSearch(imageUrl, countryCode);

  // Step 2: Generate embedding from search_text
  const searchText =
    language === "ar" ? analysis.search_text_ar : analysis.search_text;
  const embedding = await getTextEmbedding(searchText);

  // Step 3: Extract filters from analysis
  const filters: Record<string, unknown> = {};
  if (analysis.category) {
    filters.category_slug = analysis.category;
  }
  if (analysis.estimated_price_range?.max) {
    filters.max_price = Math.round(analysis.estimated_price_range.max * 1.2);
  }

  // Step 4: Generate chat response
  const chatResponse =
    language === "ar" ? analysis.description_ar : analysis.description;

  return { analysis, embedding, filters, chatResponse };
}

// ============================================
// IMAGE ANALYSIS FOR SELLER LISTINGS
// ============================================

interface ListingAnalysis {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  category: string;
  suggested_price?: { min: number; max: number; currency: string };
}

// Analyze image for seller listing creation
export async function analyzeImageForListing(
  imageUrl: string,
  countryCode: string = "KW",
): Promise<ListingAnalysis> {
  const countryName = countryCode === "KW" ? "Kuwait" : "Saudi Arabia";
  const currency = countryCode === "KW" ? "KWD" : "SAR";
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: `You are helping a seller create a listing in ${countryName}. Today's date: ${new Date().toISOString().split("T")[0]}

Analyze this product image and return ONLY valid JSON (no markdown, no code fences):
{
  "title": "Short English title",
  "title_ar": "Short Arabic title",
  "description": "Detailed English description",
  "description_ar": "Detailed Arabic description",
  "category": "category_slug"
}

Rules:
- Keep title short and concise
- Do NOT suggest a price
- Extract color from the image
- Categories: vehicles, electronics, property, fashion, furniture, services, other`,
            },
          ],
        },
      ],
    });

    const raw = response.choices[0].message.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return cleaned ? JSON.parse(cleaned) : ({} as ListingAnalysis);
  });
}

// ============================================
// CONTENT MODERATION
// ============================================

interface ModerationResult {
  approved: boolean;
  reason?: string;
  flags: string[];
}

// Moderate content for prohibited items
export async function moderateContent(
  title: string,
  description: string,
  imageUrls: string[],
  countryCode: string,
): Promise<ModerationResult> {
  const countryName = countryCode === "KW" ? "Kuwait" : "Saudi Arabia";

  return withRetry(async () => {
    const imageContent = imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const response = await openai.chat.completions.create({
      model: imageUrls.length > 0 ? VISION_MODEL : CHAT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a content moderator for a marketplace in ${countryName}.

Prohibited items (MUST reject): Alcohol, pork, weapons, drugs, adult content, counterfeit goods, stolen items, gambling.

Listing to review:
Title: ${title}
Description: ${description}

Respond with ONLY valid JSON (no markdown):
{"approved": true/false, "reason": "reason if rejected", "flags": ["list", "of", "concerns"]}`,
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 300,
    });

    const raw = response.choices[0].message.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return cleaned ? JSON.parse(cleaned) : { approved: true, flags: [] };
  });
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkOpenAIConnection(): Promise<boolean> {
  try {
    // Use embeddings health check instead of models.list() for Ollama compatibility
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: "health check",
    });
    return true;
  } catch {
    return false;
  }
}

export { openai };
