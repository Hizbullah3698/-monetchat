// POST /api/chat - Core AI chat endpoint with OpenAI tool calling + SSE streaming
// Streams: status events during tool execution, text deltas for AI response, product/analysis data

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import {
  getTextEmbedding,
  processImageForSearch,
  analyzeImageForListing,
  generateSystemPrompt,
  translateProductFields,
} from '@/lib/ai/openai';
import {
  getToolDefinitions,
  type SearchProductsParams,
  type CreateListingParams,
  type AnalyzeImageParams,
  type AskClarificationParams,
} from '@/lib/ai/tools';
import { searchProducts, indexProduct, textToSparseVector } from '@/lib/qdrant/client';
import { getPresignedReadUrl, getKeyFromUrl, CDN_URL } from '@/lib/s3/client';

// Initialize OpenAI-compatible client pointing at Ollama
const openai = new OpenAI({
  baseURL: `${process.env.OLLAMA_BASE_URL}/v1`,
  apiKey: process.env.OLLAMA_API_KEY || 'ollama',
  defaultHeaders: {
    'x-api-key': process.env.OLLAMA_API_KEY || '',
  },
});

const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL_CHAT || 'qwen2.5:14b-instruct-q8_0';

// SSE helper: format an event for the stream
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      session_id,
      message,
      image_url,
      voice_transcript,
      location,
    } = body;

    const countryCode = (location?.country_code || 'KW').toUpperCase();
    const regionId = location?.region_id;

    // Determine the search query from text, voice, or image
    const userQuery = message || voice_transcript || '';

    // Detect message language purely from content (ignores UI language toggle)
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(userQuery);
    const language = hasArabic ? 'ar' : 'en';

    if (!userQuery && !image_url) {
      return NextResponse.json(
        { error: 'Message, voice transcript, or image is required' },
        { status: 400 }
      );
    }

    // Optionally get current user (chat works for anonymous too)
    const user = await getCurrentUser().catch(() => null);

    // Find or create chat session
    let sessionId = session_id;
    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: {
          userId: user?.userId || null,
          sessionToken: !user ? crypto.randomUUID() : null,
          title: userQuery ? userQuery.slice(0, 100) : null,
          countryCode,
          language,
        },
      });
      sessionId = session.id;
    } else {
      // Update last message timestamp + set title if still empty
      const existing = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { title: true },
      }).catch(() => null);
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          lastMessageAt: new Date(),
          ...(!existing?.title && userQuery ? { title: userQuery.slice(0, 100) } : {}),
        },
      }).catch(() => {
        // Session might not exist if client sent stale ID
      });
    }

    const startTime = Date.now();

    // ============================
    // LOAD CONVERSATION HISTORY
    // ============================
    const conversationHistory = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    // ============================
    // RESOLVE IMAGE URL
    // ============================
    let resolvedImageUrl = image_url || null;
    if (!resolvedImageUrl) {
      const lastImageMsg = [...conversationHistory]
        .reverse()
        .find((msg) => msg.hasImage && msg.imageUrl);
      if (lastImageMsg) {
        resolvedImageUrl = lastImageMsg.imageUrl;
      }
    }

    // ============================
    // BUILD MESSAGES FOR OPENAI
    // ============================
    let userContent = userQuery;
    if (image_url) {
      userContent = userQuery
        ? `${userQuery}\n[User uploaded an image: ${image_url}]`
        : `[User uploaded an image: ${image_url}]`;
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: generateSystemPrompt(countryCode, language),
      },
      ...conversationHistory.map((msg) => {
        if (msg.hasImage && msg.imageUrl) {
          return {
            role: msg.role as 'user' | 'assistant',
            content: `${msg.content}\n[Image: ${msg.imageUrl}]`,
          };
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      }),
      {
        role: 'user',
        content: userContent || '[Empty message]',
      },
    ];

    // ============================
    // SSE STREAMING RESPONSE
    // ============================
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let products: Array<Record<string, unknown>> = [];
          let imageAnalysis: { title?: string; title_ar?: string; description?: string; description_ar?: string; category?: string; suggested_price?: { min: number; max: number; currency: string } } | null = null;
          let searchQuery = userQuery;
          const maxIterations = 5;
          let iterations = 0;
          let clarificationCount = 0;
          let assistantResponse = '';
          let draftMetadata: Record<string, unknown> | null = null;

          // Send initial thinking status
          controller.enqueue(encoder.encode(sseEvent('status', {
            text: language === 'ar' ? 'جاري التفكير...' : 'Thinking...',
          })));

          // ============================
          // FULLY STREAMING TOOL CALLING LOOP
          // Every OpenAI call uses stream:true so text arrives token-by-token
          // ============================

          while (iterations < maxIterations) {
            iterations++;

            const streamCompletion = await openai.chat.completions.create({
              model: CHAT_MODEL,
              messages,
              tools: getToolDefinitions(),
              tool_choice: 'auto',
              temperature: 0.7,
              stream: true,
            });

            // Accumulate streamed response: could be tool calls OR text
            const toolCallChunks = new Map<number, { id: string; name: string; arguments: string }>();
            let hasToolCalls = false;
            let responseContent = '';
            // Buffer content - don't stream until we know it's clean text (not a tool call)
            const contentBuffer: string[] = [];

            for await (const chunk of streamCompletion) {
              const delta = chunk.choices[0]?.delta;
              if (!delta) continue;

              // Accumulate OpenAI-style tool call chunks
              if (delta.tool_calls) {
                hasToolCalls = true;
                for (const tc of delta.tool_calls) {
                  const existing = toolCallChunks.get(tc.index) || { id: '', name: '', arguments: '' };
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name = tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                  toolCallChunks.set(tc.index, existing);
                }
              }

              // Early streaming detection - block tool call markup from streaming
              if (delta.content) {
                responseContent += delta.content;
                
                // Fast check if it's the start of a Qwen native tool call
                const mightBeToolCall = responseContent.startsWith('<tool_call') || responseContent.startsWith('CanBeConvertedTo');
                
                if (!hasToolCalls && !mightBeToolCall) {
                  // Once we know it's regular text, clear the status and stream instantly
                  if (contentBuffer.length > 0) {
                    controller.enqueue(encoder.encode(sseEvent('status', { text: '' })));
                    for (const chunk of contentBuffer) {
                      controller.enqueue(encoder.encode(sseEvent('delta', { content: chunk })));
                    }
                    contentBuffer.length = 0; // Clear buffer
                  }
                  // Stream current token in real time
                  controller.enqueue(encoder.encode(sseEvent('delta', { content: delta.content })));
                } else if (!hasToolCalls) {
                  // Need to buffer in case it forms a tool call
                  contentBuffer.push(delta.content);
                }
              }
            }

            // --- Detect Qwen native tool call format in content ---
            // Qwen outputs: <tool_call>{"name":"...","arguments":{...}}</tool_call>
            // Also handles: CanBeConvertedToJSONButNotProvidedDirectly prefix
            const toolCallPattern = /(?:<tool_call>|CanBeConvertedToJSONButNotProvidedDirectly\s*)([\s\S]*?)(?:<\/tool_call>|$)/g;
            const nativeToolCalls = [...responseContent.matchAll(toolCallPattern)];

            if (!hasToolCalls && nativeToolCalls.length > 0) {
              hasToolCalls = true;
              // Parse each native tool call
              nativeToolCalls.forEach((match, idx) => {
                try {
                  const raw = match[1].trim();
                  const parsed = JSON.parse(raw);
                  toolCallChunks.set(idx, {
                    id: `native_tc_${idx}`,
                    name: parsed.name || parsed.function || '',
                    arguments: typeof parsed.arguments === 'string'
                      ? parsed.arguments
                      : JSON.stringify(parsed.arguments || parsed.parameters || {}),
                  });
                } catch {
                  // ignore malformed tool call
                }
              });
              // Strip ALL tool call markup from content so nothing leaks to client
              responseContent = responseContent
                .replace(/CanBeConvertedToJSONButNotProvidedDirectly\s*/g, '')
                .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
                .replace(/<tool_call>[\s\S]*/g, '')  // unclosed tag
                .trim();
            }

            // If we finished and there is still clean text in the buffer 
            // (e.g. responseContent was too short to definitively not be a tool call until the end)
            if (!hasToolCalls && responseContent && contentBuffer.length > 0) {
              controller.enqueue(encoder.encode(sseEvent('status', { text: '' })));
              for (const chunk of contentBuffer) {
                controller.enqueue(encoder.encode(sseEvent('delta', { content: chunk })));
              }
            }

            if (hasToolCalls) {
              // AI wants to call tools — build message and execute them
              const toolCallsArray = Array.from(toolCallChunks.values());

              messages.push({
                role: 'assistant',
                content: responseContent || null,
                tool_calls: toolCallsArray.map((tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: { name: tc.name, arguments: tc.arguments },
                })),
              });

              for (const tc of toolCallsArray) {
                const toolName = tc.name;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let toolArgs: any;
                try {
                  toolArgs = JSON.parse(tc.arguments);
                } catch {
                  toolArgs = {};
                }

                // Send status event to client
                const statusMessages: Record<string, string> = {
                  search_products: language === 'ar' ? 'جاري البحث عن المنتجات...' : 'Searching products...',
                  analyze_image_for_search: language === 'ar' ? 'جاري تحليل الصورة...' : 'Analyzing image...',
                  analyze_image_for_listing: language === 'ar' ? 'جاري تحليل الصورة للإعلان...' : 'Analyzing image for listing...',
                  create_listing: language === 'ar' ? 'جاري إنشاء الإعلان...' : 'Creating listing...',
                  ask_clarification: '',
                };
                const statusText = statusMessages[toolName];
                if (statusText) {
                  controller.enqueue(encoder.encode(sseEvent('status', { text: statusText })));
                }

                // Track clarifications and enforce limit
                if (toolName === 'ask_clarification') {
                  clarificationCount++;

                  if (clarificationCount >= 2) {
                    console.log('Max clarifications reached, forcing search instead');
                    const forcedSearchArgs: SearchProductsParams = {
                      search_query: userQuery || 'products',
                    };
                    controller.enqueue(encoder.encode(sseEvent('status', {
                      text: language === 'ar' ? 'جاري البحث عن المنتجات...' : 'Searching products...',
                    })));
                    const searchResult = await executeSearchProducts(
                      forcedSearchArgs,
                      countryCode,
                      regionId
                    );
                    products = searchResult.products;
                    searchQuery = forcedSearchArgs.search_query;

                    controller.enqueue(encoder.encode(sseEvent('products', {
                      products,
                      count: products.length,
                    })));

                    messages.push({
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: JSON.stringify({
                        clarification: 'Understood. Let me search for what you described.',
                        forced_search: true,
                      }),
                    });
                    continue;
                  }
                }

                let toolResult: unknown;

                try {
                  switch (toolName) {
                    case 'search_products': {
                      const searchResult = await executeSearchProducts(
                        toolArgs as SearchProductsParams,
                        countryCode,
                        regionId
                      );
                      products = searchResult.products;
                      searchQuery = (toolArgs as SearchProductsParams).search_query;
                      
                      let summaryMsg = "";
                      if (products.length > 0) {
                        const topNames = products.slice(0, 3).map((p: any) => p.title || p.title_ar).filter(Boolean);
                        summaryMsg = "Products found. The UI has automatically displayed them as interactive cards below your message. Do NOT list the products using bullet points, and do NOT mention prices or details. Instead, simply write a 1-sentence friendly and concise summary saying you found some options. Keep it extremely brief. IMPORTANT RULES: 1. Only mention products that are in the search results. Never describe or mention a product that is not in the returned results. 2. DO NOT output any placeholder text like '(Initialized product cards display here)' or mention that you are displaying cards. Just say the items were found.";
                        if (topNames.length > 0) {
                          summaryMsg += ` The ONLY products you are allowed to mention are these exact matches: ${topNames.join(", ")}.`;
                        }
                      } else {
                        summaryMsg = "No products were found matching the user's search criteria. Apologize and ask if they would like to search for something else or broaden their search. Do NOT mention that you displayed any cards, because no cards were displayed.";
                      }

                      toolResult = {
                        success: true,
                        count: products.length,
                        system_instruction: summaryMsg
                      };

                      // Translate missing fields based on user language
                      if (products.length > 0) {
                        const targetLang = language === 'ar' ? 'ar' : 'en';
                        const fieldKey = targetLang === 'ar' ? 'title_ar' : 'title';
                        const needsTranslation = products.filter(
                          (p: Record<string, unknown>) => targetLang === 'ar' ? !p.title_ar : !p.title
                        );
                        if (needsTranslation.length > 0) {
                          try {
                            const translations = await translateProductFields(
                              needsTranslation.map((p: Record<string, unknown>) => ({
                                title: (targetLang === 'ar' ? p.title : p.title_ar) as string,
                                description: (targetLang === 'ar' ? p.description : p.description_ar) as string | null,
                              })),
                              targetLang
                            );
                            needsTranslation.forEach((p: Record<string, unknown>, i: number) => {
                              if (translations[i]) {
                                if (targetLang === 'ar') {
                                  p.title_ar = translations[i].title;
                                  p.description_ar = translations[i].description;
                                } else {
                                  p.title = translations[i].title;
                                  p.description = translations[i].description;
                                }
                              }
                            });
                          } catch (e) {
                            console.error('Product translation failed:', e);
                          }
                        }
                      }

                      controller.enqueue(encoder.encode(sseEvent('products', {
                        products,
                        count: products.length,
                        language,
                      })));
                      break;
                    }

                    case 'create_listing': {
                      // Gate: unauthenticated → show login prompt immediately
                      if (!user) {
                        controller.enqueue(encoder.encode(sseEvent('login_required', {})));
                        toolResult = { success: false, message: 'A login dialog has been shown to the user. Tell them to log in using the dialog to create their listing.' };
                        break;
                      }
                      // Check seller profile before showing draft
                      const sellerCheck = await prisma.seller.findUnique({
                        where: { userId: user.userId },
                      });
                      if (!sellerCheck || !sellerCheck.isProfileComplete) {
                        controller.enqueue(encoder.encode(sseEvent('seller_action_required', {
                          action: 'complete_profile',
                        })));
                        toolResult = { success: false, error: 'seller_profile_incomplete', message: 'Please complete your seller profile before listing.' };
                        break;
                      }
                      // Emit a draft for the user to review, edit, and publish
                      const listingArgs = toolArgs as CreateListingParams;

                      // Ensure both EN and AR fields exist
                      let draftTitle = listingArgs.title;
                      let draftTitleAr = listingArgs.title_ar;
                      let draftDesc = listingArgs.description;
                      let draftDescAr = listingArgs.description_ar;

                      // Use image analysis data as fallback (already has bilingual fields)
                      if (imageAnalysis) {
                        if (!draftTitleAr && imageAnalysis.title_ar) draftTitleAr = imageAnalysis.title_ar;
                        if (!draftTitle && imageAnalysis.title) draftTitle = imageAnalysis.title;
                        if (!draftDescAr && imageAnalysis.description_ar) draftDescAr = imageAnalysis.description_ar;
                        if (!draftDesc && imageAnalysis.description) draftDesc = imageAnalysis.description;
                      }

                      // Translate if still missing one language
                      try {
                        if (draftTitle && !draftTitleAr) {
                          const [t] = await translateProductFields([{ title: draftTitle, description: draftDesc }], 'ar');
                          if (t) { draftTitleAr = t.title; draftDescAr = draftDescAr || t.description; }
                        } else if (draftTitleAr && !draftTitle) {
                          const [t] = await translateProductFields([{ title: draftTitleAr, description: draftDescAr }], 'en');
                          if (t) { draftTitle = t.title; draftDesc = draftDesc || t.description; }
                        }
                      } catch (e) {
                        console.error('Draft translation failed:', e);
                      }

                      const draftData = {
                        title: draftTitle,
                        title_ar: draftTitleAr,
                        description: draftDesc,
                        description_ar: draftDescAr,
                        price: listingArgs.price || 0,
                        category: listingArgs.category,
                        condition: listingArgs.condition || 'good',
                        image_urls: listingArgs.image_urls || [],
                        language,
                      };
                      controller.enqueue(encoder.encode(sseEvent('listing_draft', draftData)));
                      draftMetadata = { type: 'listing_draft', ...draftData };
                      toolResult = { success: true, message: 'A listing draft has been created and shown to the user for review. They can edit details, add photos, and publish when ready.' };
                      break;
                    }

                    case 'ask_clarification':
                      toolResult = {
                        clarification: (toolArgs as AskClarificationParams).question,
                      };
                      break;

                    case 'analyze_image_for_search':
                      if (resolvedImageUrl) {
                        let imageUrlForAI = resolvedImageUrl;
                        const s3Key = getKeyFromUrl(resolvedImageUrl);
                        if (s3Key) {
                          imageUrlForAI = await getPresignedReadUrl(s3Key);
                        }

                        const imageResult = await processImageForSearch(
                          imageUrlForAI,
                          countryCode,
                          language
                        );
                        toolResult = {
                          analysis: imageResult.analysis,
                          search_text:
                            language === 'ar'
                              ? imageResult.analysis.search_text_ar
                              : imageResult.analysis.search_text,
                        };
                      } else {
                        toolResult = { error: 'No image provided' };
                      }
                      break;

                    case 'analyze_image_for_listing':
                      if (resolvedImageUrl) {
                        let imageUrlForAI = resolvedImageUrl;
                        const s3Key = getKeyFromUrl(resolvedImageUrl);
                        if (s3Key) {
                          imageUrlForAI = await getPresignedReadUrl(s3Key);
                        }

                        const listingAnalysis = await analyzeImageForListing(
                          imageUrlForAI,
                          countryCode
                        );
                        imageAnalysis = listingAnalysis;
                        toolResult = listingAnalysis;

                        controller.enqueue(encoder.encode(sseEvent('analysis', {
                          image_analysis: imageAnalysis,
                        })));
                      } else {
                        toolResult = { error: 'No image provided' };
                      }
                      break;

                    default:
                      toolResult = { error: 'Unknown tool' };
                  }
                } catch (error) {
                  console.error(`Tool execution error for ${toolName}:`, error);
                  toolResult = {
                    error: 'Tool execution failed',
                    message: error instanceof Error ? error.message : 'Unknown error',
                  };
                }

                messages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify(toolResult),
                });
              }

              // ─── Ollama compatibility fix ────────────────────────────────────
              // qwen2.5 often streams text + ask_clarification tool in the SAME
              // response. We already have the AI's answer in `responseContent`.
              // Looping back for a second call with role:'tool' messages causes
              // Ollama to return 404. Break early when:
              //   1. All tools were ask_clarification (no DB side-effects needed)
              //   2. The AI already produced visible text in this iteration
              const allClarifications = toolCallsArray.every(
                (tc) => tc.name === 'ask_clarification'
              );
              if (allClarifications && responseContent) {
                assistantResponse = responseContent;
                break;
              }
              // ────────────────────────────────────────────────────────────────

            } else {
              // AI responded with pure text (no tools) — already streamed via deltas above
              assistantResponse = responseContent;
              break;
            }
          }

          // Safety check: if we hit max iterations without a response
          if (iterations >= maxIterations && !assistantResponse) {
            assistantResponse =
              language === 'ar'
                ? 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.'
                : 'Sorry, there was an error processing your request. Please try again.';
            controller.enqueue(encoder.encode(sseEvent('delta', { content: assistantResponse })));
          }

          const latencyMs = Date.now() - startTime;

          // ============================
          // SAVE MESSAGES TO DB
          // ============================
          await prisma.chatMessage.create({
            data: {
              sessionId,
              role: 'user',
              content: userQuery || '[Image search]',
              hasImage: !!image_url,
              imageUrl: image_url || null,
              hasVoice: !!voice_transcript,
              voiceTranscript: voice_transcript || null,
            },
          });

          const productIds = products.map((p) => p.id as string);
          // Ensure assistant message is never blank in the DB
          const contentToSave = assistantResponse ||
            (products.length > 0
              ? (language === 'ar' ? 'إليك النتائج.' : 'Here are the results.')
              : (language === 'ar' ? 'تم معالجة طلبك.' : 'Done.'));
          const assistantMessage = await prisma.chatMessage.create({
            data: {
              session: { connect: { id: sessionId } },
              role: 'assistant',
              content: contentToSave,
              productIds: productIds,
              ...(draftMetadata ? { metadata: draftMetadata as any } : {}),
            },
          });

          // Log search for analytics
          if (products.length > 0) {
            await prisma.searchLog.create({
              data: {
                sessionId,
                userId: user?.userId || null,
                queryText: searchQuery || userQuery,
                queryType: image_url ? 'image' : voice_transcript ? 'voice' : 'text',
                filters: { country_code: countryCode } as object,
                resultCount: products.length,
                latencyMs,
                countryCode,
              },
            }).catch(() => { });
          }

          // Send final done event with IDs
          controller.enqueue(encoder.encode(sseEvent('done', {
            session_id: sessionId,
            message_id: assistantMessage.id,
          })));

          controller.close();
        } catch (error) {
          console.error('Chat streaming error:', error);
          const errorMsg = language === 'ar'
            ? 'عذراً، حدث خطأ في معالجة طلبك.'
            : 'Sorry, an error occurred processing your request.';
          controller.enqueue(encoder.encode(sseEvent('delta', { content: errorMsg })));
          controller.enqueue(encoder.encode(sseEvent('done', { session_id: sessionId, error: true })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// ============================================
// TOOL EXECUTION HELPER FUNCTIONS
// ============================================

/**
 * Execute product search using Qdrant vector DB
 */
async function executeSearchProducts(
  args: SearchProductsParams,
  countryCode: string,
  regionId?: number
): Promise<{ products: Array<Record<string, unknown>>; count: number }> {
  console.log('=== [PIPELINE START] executeSearchProducts ===');
  console.log('[1/5] AI Arguments:', JSON.stringify(args));
  console.log('[1/5] Location Context:', { countryCode, regionId });

  // Generate dense embedding + sparse BM25 vector from search query
  console.log('[2/5] Fetching Ollama embedding...');
  const embedding = await getTextEmbedding(args.search_query);
  console.log(`[2/5] Embedding success. Vector length: ${embedding.length}`);
  
  const sparseVector = textToSparseVector(args.search_query);
  console.log(`[2/5] Generated sparse vector with ${sparseVector.indices.length} indices.`);

  // Build filters
  const filters: Record<string, unknown> = { country_code: countryCode };
  if (args.min_price) filters.min_price = args.min_price;
  if (args.max_price) filters.max_price = args.max_price;
  if (regionId || args.region_id) filters.region_id = args.region_id || regionId;
  
  console.log('[3/5] Constructed Qdrant Filters:', JSON.stringify(filters));

  // Hybrid search: dense (semantic) + sparse (BM25 keyword) via RRF fusion
  console.log(`[4/5] Hitting Qdrant DB for: "${args.search_query}"`);
  const searchResults = await searchProducts(
    embedding,
    sparseVector,
    filters as {
      country_code: string;
      min_price?: number;
      max_price?: number;
      region_id?: number;
    },
    10
  );

  console.log(`[4/5] Qdrant search finished. Found ${searchResults.length} points.`);

  // Get full product details from database
  const productIds = searchResults.map((r) => r.payload.product_id);

  if (productIds.length === 0) {
    console.log('[5/5] Pipeline halted. No product IDs returned from Qdrant. Check if the AI applied a filter that excluded all items.');
    return { products: [], count: 0 };
  }

  console.log(`[5/5] Fetching ${productIds.length} mapped products from Neon DB...`);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      category: { select: { slug: true, name: true, nameAr: true } },
      seller: { include: { user: { select: { name: true } } } },
      region: { select: { name: true, nameAr: true } },
    },
  });

  console.log(`[5/5] Neon DB returned ${dbProducts.length} full products associated with the Qdrant IDs.`);
  console.log('=== [PIPELINE END] ===');

  console.log(`[Search] Neon DB returned ${dbProducts.length} products.`);

  // Map products preserving RRF ranking order from Qdrant
  const allProducts = searchResults
    .map((sr) => {
      const p = dbProducts.find((db) => db.id === sr.payload.product_id);
      if (!p) return null;

      return {
        id: p.id,
        title: p.title,
        title_ar: p.titleAr,
        description: p.description || null,
        description_ar: p.descriptionAr || null,
        price: Number(p.price),
        currency: p.currency,
        condition: p.condition,
        is_negotiable: p.isNegotiable,
        image_url: p.images[0]?.url || null,
        category: p.category
          ? { slug: p.category.slug, name: p.category.name, name_ar: p.category.nameAr }
          : null,
        seller: {
          name: p.seller.businessName || p.seller.user.name,
          phone: p.seller.phonePublic,
          whatsapp: p.seller.whatsappNumber,
        },
        location: p.region ? { region: p.region.name, region_ar: p.region.nameAr } : null,
        similarity_score: sr.score,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Trust Qdrant's hybrid semantic + keyword search (RRF)
  // No need for a manual keyword-overlap filter, which breaks bilingual search
  const products = allProducts;

  return {
    products,
    count: products.length,
  };
}

/**
 * Execute listing creation (for sell mode)
 */
async function executeCreateListing(
  args: CreateListingParams,
  user: { userId: string } | null
): Promise<{ success: boolean; product_id?: string; error?: string; message?: string }> {
  // Check authentication
  if (!user) {
    return {
      success: false,
      error: 'Authentication required',
      message: 'Please log in to create listings',
    };
  }

  try {
    // 1. Get seller profile — no auto-create; sellers must complete profile first
    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
      include: { user: { select: { countryCode: true } } },
    });

    if (!seller || !seller.isProfileComplete) {
      return {
        success: false,
        error: 'seller_profile_incomplete',
        message: 'Please complete your seller profile before creating a listing.',
      };
    }

    const countryCode = seller.user.countryCode;

    // 2. Resolve category
    let categoryId: number | null = null;
    if (args.category) {
      const category = await prisma.category.findUnique({
        where: { slug: args.category },
      });
      if (category) categoryId = category.id;
    }

    // 3. Create product with images in transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          sellerId: user.userId,
          title: args.title,
          titleAr: args.title_ar || null,
          description: args.description || null,
          descriptionAr: args.description_ar || null,
          price: args.price,
          currency: countryCode === 'KW' ? 'KWD' : 'SAR',
          isNegotiable: true,
          condition: args.condition || 'good',
          categoryId,
          countryCode,
        },
      });

      // Create product images
      if (args.image_urls && args.image_urls.length > 0) {
        await tx.productImage.createMany({
          data: args.image_urls.map((url, index) => ({
            productId: newProduct.id,
            url,
            s3Key: url.split('/').slice(-2).join('/'),
            isPrimary: index === 0,
            sortOrder: index,
          })),
        });
      }

      return newProduct;
    });

    // 4. Index in Qdrant (async, don't block response)
    (async () => {
      try {
        const fullProduct = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            category: { select: { slug: true } },
          },
        });
        if (!fullProduct) return;

        const searchText = `${fullProduct.title} ${fullProduct.description || ''}`.trim();
        const embedding = await getTextEmbedding(searchText);
        const sparseVector = textToSparseVector(searchText);

        await indexProduct(product.id, embedding, sparseVector, {
          product_id: product.id,
          seller_id: fullProduct.sellerId,
          title: fullProduct.title,
          title_ar: fullProduct.titleAr || undefined,
          description: fullProduct.description || undefined,
          price: Number(fullProduct.price),
          currency: fullProduct.currency,
          category_slug: fullProduct.category?.slug || 'other',
          country_code: countryCode,
          region_id: fullProduct.regionId || undefined,
          status: fullProduct.status,
          created_at: fullProduct.createdAt.toISOString(),
        });

        await prisma.product.update({
          where: { id: product.id },
          data: { qdrantPointId: product.id },
        });
      } catch (err) {
        console.error('Failed to index product in Qdrant:', err);
      }
    })();

    return {
      success: true,
      product_id: product.id,
      message: `Listing created successfully! Product ID: ${product.id}`,
    };
  } catch (error) {
    console.error('Create listing error:', error);
    return {
      success: false,
      error: 'Failed to create listing',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
