// OpenAI Service Layer
// Handles: Chat (GPT-4o), Voice (Whisper), Vision, Embeddings

import OpenAI from "openai";
import { AiFactory } from "./ai-factory";

// Keep groqClient optional for voice transcription only (Ollama doesn't natively do Whisper well via API yet without extra tools)
const groqClient = process.env.GROQ_API_KEY ? new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
}) : null;

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

// Generate text embedding for search using Ollama
export async function getTextEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    return await AiFactory.getProvider().createEmbedding(text);
  });
}

// ============================================
// VOICE TRANSCRIPTION
// ============================================

interface TranscriptionResult {
  text: string;
  language: string;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  languageHint?: string,
): Promise<TranscriptionResult> {
  if (!groqClient) {
    throw new Error("Voice transcription requires GROQ_API_KEY and is currently optional.");
  }
  return withRetry(async () => {
    const file = new File([new Uint8Array(audioBuffer)], "audio.webm", { type: "audio/webm" });

    const response = await groqClient.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: languageHint,
      response_format: "verbose_json",
    });

    return {
      text: response.text,
      language:
        (response as { language?: string }).language ||
        languageHint ||
        "unknown",
    };
  });
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

  return `LANGUAGE RULE: You MUST ONLY respond in ${languageName.toUpperCase()}. NEVER USE CHINESE CHARACTERS. NEVER switch to Chinese. You are an assistant for a marketplace in ${countryName}. 

You are a helpful marketplace assistant for Monetchat in ${countryName}. You help users BOTH buy and sell products.
Today's date: ${today}

Your role:
1. Help users find and buy products QUICKLY and efficiently
2. Help users create listings to sell their products
3. Detect user intent (buying vs selling) from their message and use appropriate tools
4. Ask clarifying questions SPARINGLY (max 1 question total, then search)

Available categories: vehicles, electronics, property, fashion, furniture, services, jobs, other

BUYING - Tool usage rules:
- LIMIT clarifications: Ask MAX 1 clarifying question, then ALWAYS search with whatever info you have
- Use search_products when: user wants to buy/find anything with ANY product details
- Use analyze_image_for_search when: user uploads image to find similar items to buy
- If user provides a brand name (Mercedes, iPhone, etc.), search RIGHT AWAY
- After 1 clarification, SEARCH IMMEDIATELY with whatever info you have — never ask a second question

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
- "I need a car" → Ask 1 question MAX (budget/type?), then search no matter what
- "mercedes" → SEARCH immediately
- "I need a phone under 300" → SEARCH immediately

SELLING Examples:
- "I want to sell my phone" → Ask them to upload a photo (physical product)
- [Image uploaded] + "sell this" → Use analyze_image_for_listing
- "I want to sell my apartment 3BR 800 KWD Salmiya" → create_listing immediately (property, no image needed)
- "I offer graphic design services 50 KWD/hour" → create_listing (category: services, no image needed)

IMPORTANT - How to respond after searching:
- Products are AUTOMATICALLY displayed as interactive cards below your message (with images, prices, seller info, call/WhatsApp buttons)
- Do NOT list product details, prices, descriptions, or image URLs in your text
- NEVER use markdown lists or bullet points to describe products
- BE HONEST about search results: Compare what the user asked for against actual results returned
  - If exact matches found: "I found 3 iPhone 15 Pro Max listings for you!"
  - If only similar items: "I couldn't find an exact iPhone 15 Pro Max, but here are some similar options."
  - If no results: Suggest alternative searches
- Keep your text to a SHORT 1-2 sentence context-aware summary

FINAL REMINDER: YOU MUST RESPOND IN ${languageName.toUpperCase()} ONLY. DO NOT USE ANY CHINESE CHARACTERS.`;
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

  const response = await AiFactory.getProvider().createChatCompletion({
    model: AiFactory.getProvider().getDefaultChatModel(),
    messages: [
      {
        role: "system",
        content: `Translate the following product titles and descriptions to ${langName}. Return ONLY a JSON object with a "translations" array containing objects with "title" and "description" fields, in the same order as the input.`,
      },
      { role: "user", content: JSON.stringify(input) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
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

  const systemPrompt = `You are a helpful shopping assistant for Monetchat marketplace in ${countryName}.
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
    const response = await AiFactory.getProvider().createChatCompletion({
      model: AiFactory.getProvider().getDefaultChatModel(),
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    return content
      ? JSON.parse(content)
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
    const response = await AiFactory.getProvider().createChatCompletion({
      model: AiFactory.getProvider().getDefaultVisionModel(),
      messages: [
        {
          role: "system",
          content: `You are a product analyzer for a marketplace in ${countryName}.
Today's date: ${new Date().toISOString().split("T")[0]}

Analyze images and extract structured information for search.
The search_text field is CRITICAL - it should combine all key attributes into a natural phrase that will be used for vector similarity search.
Use current year context when estimating product details (e.g. an iPhone 15 in ${new Date().getFullYear()} is not brand new).

Categories: vehicles, electronics, property, fashion, furniture, services, jobs, other

Always respond with valid JSON.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: `Analyze this product image and return JSON:
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
}`,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : ({} as ImageAnalysis);
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
  const model = AiFactory.getProvider().getDefaultVisionModel();

  return withRetry(async () => {
    const response = await AiFactory.getProvider().createChatCompletion({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are helping a seller create a listing in ${countryName}.
Today's date: ${new Date().toISOString().split("T")[0]}

Analyze this product image and provide:
1. A compelling title (both English and Arabic)
2. A detailed description (both English and Arabic)
3. The most appropriate category
4. Extract color properly from the image
5. keep title short and concise acc to product image and standard best practices for that product

Do NOT suggest a price. The user will set the price themselves.

Categories: vehicles, electronics, property, fashion, furniture, services, other

Respond as JSON:
{
  "title": "English title",
  "title_ar": "Arabic title",
  "description": "English description",
  "description_ar": "Arabic description",
  "category": "category_slug"
}`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      // max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : ({} as ListingAnalysis);
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

    const response = await AiFactory.getProvider().createChatCompletion({
      model: AiFactory.getProvider().getDefaultVisionModel(),
      messages: [
        {
          role: "system",
          content: `You are a content moderator for a marketplace in ${countryName}.

Prohibited items (MUST reject):
- Alcohol and alcoholic beverages
- Pork and pork products
- Weapons and ammunition
- Drugs and narcotics
- Adult/inappropriate content
- Counterfeit goods
- Stolen items
- Gambling-related items

Review the listing and respond with JSON:
{
  "approved": boolean,
  "reason": "reason if rejected",
  "flags": ["list", "of", "concerns"]
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Title: ${title}\nDescription: ${description}`,
            },
            ...imageContent,
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : { approved: true, flags: [] };
  });
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkOpenAIConnection(): Promise<boolean> {
  try {
    const response = await AiFactory.getProvider().createChatCompletion({
      model: AiFactory.getProvider().getDefaultChatModel(),
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 5,
    });
    return !!response.choices[0].message;
  } catch {
    return false;
  }
}

export { groqClient };
