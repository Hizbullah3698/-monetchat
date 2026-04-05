import type OpenAI from "openai";

/**
 * Tool definitions for OpenAI function calling in the chat API.
 * These tools enable the AI to intelligently decide when to search, clarify, or take action.
 */

// ============================================
// TOOL PARAMETER TYPES
// ============================================

export interface SearchProductsParams {
  search_query: string;
  min_price?: number;
  max_price?: number;
  region_id?: number;
}

export interface AskClarificationParams {
  question: string;
  suggested_categories?: string[];
}

export interface CreateListingParams {
  title: string;
  title_ar?: string;
  price: number;
  category: string;
  description?: string;
  description_ar?: string;
  condition?: "new" | "like_new" | "good" | "fair" | "poor";
  image_urls?: string[];
}

export interface AnalyzeImageParams {
  image_url: string;
}

// ============================================
// TOOL DEFINITIONS
// ============================================

const SEARCH_PRODUCTS_TOOL: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_products",
    description:
      "Search for products in the marketplace. Use this when the user has clearly stated what they want to buy and you have enough information to perform a meaningful search. Don't call this if you need to clarify requirements first.",
    parameters: {
      type: "object",
      properties: {
        search_query: {
          type: "string",
          description:
            "Natural language search query describing what the user wants to buy. Should be in English for best results.",
        },
        min_price: {
          type: "number",
          description: "Minimum price in local currency (KWD/SAR) if user specified a budget",
        },
        max_price: {
          type: "number",
          description: "Maximum price in local currency (KWD/SAR) if user specified a budget",
        },
        region_id: {
          type: "number",
          description: "Region ID if user specified a location preference",
        },
      },
      required: ["search_query"],
    },
  },
};

const ASK_CLARIFICATION_TOOL: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "ask_clarification",
    description:
      "Ask the user follow-up questions ONLY AFTER you have already performed a search and shown results. NEVER use this tool before an initial search. If a user asks for something vague like 'car' or 'apartment', you must immediately use search_products first to show baseline results, and only use this tool afterward to help them refine.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "The clarifying question to ask the user. Should be friendly, specific, and help narrow down what they're looking for.",
        },
        suggested_categories: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional category suggestions to help guide the user if their request could fit multiple categories",
        },
      },
      required: ["question"],
    },
  },
};

const CREATE_LISTING_TOOL: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_listing",
    description:
      "Create a product listing for the user to sell. Use when the user wants to sell something and has provided enough information (title, category). Do NOT suggest or guess a price - leave price empty and let the user set it themselves. Images are required for physical products (electronics, vehicles, fashion, furniture) but optional for property, services, spare parts.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Product title in English",
        },
        title_ar: {
          type: "string",
          description: "Product title in Arabic",
        },
        price: {
          type: "number",
          description: "Price in local currency (KWD/SAR). Do NOT suggest a price - only include if the user explicitly stated a price.",
        },
        category: {
          type: "string",
          enum: [
            "vehicles",
            "electronics",
            "property",
            "fashion",
            "furniture",
            "services",
            "jobs",
            "other",
          ],
          description: "Product category",
        },
        description: {
          type: "string",
          description: "Detailed product description in English",
        },
        description_ar: {
          type: "string",
          description: "Detailed product description in Arabic",
        },
        condition: {
          type: "string",
          enum: ["new", "like_new", "good", "fair", "poor"],
          description: "Product condition",
        },
        image_urls: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of S3 image URLs. Required for physical products (electronics, vehicles, fashion, furniture). Optional for property, services, spare parts.",
        },
      },
      required: ["title", "category"],
    },
  },
};

const ANALYZE_IMAGE_FOR_SEARCH_TOOL: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "analyze_image_for_search",
    description:
      "Analyze an uploaded image to extract product details for searching similar products in the marketplace. Use when the user uploads an image to find similar items they want to buy.",
    parameters: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "The S3 URL of the uploaded image",
        },
      },
      required: ["image_url"],
    },
  },
};

const ANALYZE_IMAGE_FOR_LISTING_TOOL: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "analyze_image_for_listing",
    description:
      "Analyze an uploaded image to create a listing draft with suggested title, description, and category. Do NOT suggest a price. Use when the user wants to sell something and uploads a product photo.",
    parameters: {
      type: "object",
      properties: {
        image_url: {
          type: "string",
          description: "The S3 URL of the uploaded product image",
        },
      },
      required: ["image_url"],
    },
  },
};

// ============================================
// TOOL DEFINITION GETTER
// ============================================

/**
 * Returns all tool definitions for the unified chat mode.
 * The AI decides which tools to use based on user intent (buy or sell).
 */
export function getToolDefinitions(): OpenAI.ChatCompletionTool[] {
  return [
    SEARCH_PRODUCTS_TOOL,
    ASK_CLARIFICATION_TOOL,
    ANALYZE_IMAGE_FOR_SEARCH_TOOL,
    CREATE_LISTING_TOOL,
    ANALYZE_IMAGE_FOR_LISTING_TOOL,
  ];
}

// ============================================
// TOOL RESULT TYPES
// ============================================

export interface SearchProductsResult {
  products: Array<{
    id: string;
    title: string;
    titleAr?: string;
    price: number;
    currency: string;
    image?: string;
    category?: string;
    categoryAr?: string;
    condition?: string;
    seller?: {
      name: string;
      phone?: string;
      whatsapp?: string;
    };
    region?: string;
    regionAr?: string;
  }>;
  count: number;
}

export interface CreateListingResult {
  success: boolean;
  product_id?: string;
  error?: string;
  message?: string;
}

export interface ImageAnalysisForSearchResult {
  analysis: {
    search_text: string;
    search_text_ar: string;
    category?: string;
    brand?: string;
    model?: string;
    [key: string]: unknown;
  };
  search_text: string;
}

export interface ImageAnalysisForListingResult {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  category: string;
  suggested_price?: number;
}

export interface AskClarificationResult {
  clarification: string;
  suggested_categories?: string[];
}
