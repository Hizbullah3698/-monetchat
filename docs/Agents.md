# PickPic — Agent Onboarding Guide

Welcome! This document gives AI coding agents the essential context to work effectively on the PickPic codebase.

---

## What is PickPic?

A mobile-first marketplace app (like OLX/Craigslist) targeting Kuwait.

**Unique:** The entire UX is driven by a chat interface — users type/speak/photograph what they want to buy or sell, and the AI handles the rest via OpenAI tool calling + streaming.

**Stack:** Next.js 14 App Router · OpenAI GPT-4o · Qdrant Vector DB · Prisma + PostgreSQL · AWS S3 · JWT auth

---

## Architecture Overview

```
Browser ──→ Next.js App Router (SSR + API routes)
               │
               ├── /api/chat          ← Core AI endpoint (SSE streaming + tool calling)
               ├── /api/auth/*        ← JWT auth (register, login, logout, me)
               ├── /api/products/*    ← Product CRUD
               ├── /api/upload/*      ← S3 presigned URL upload
               ├── /api/seller/*      ← Seller profile & listings
               └── /api/geo/*         ← Country/region data

AI Layer:
  OpenAI GPT-4o ──→ Tool calling: search_products, ask_clarification,
                                   create_listing, analyze_image_for_search,
                                   analyze_image_for_listing
  Qdrant ──→ Vector search for products (text-embedding-3-small)
  Whisper ──→ Voice transcription
```

---

## Critical Files to Know

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | **Core AI endpoint.** SSE streaming, tool calling loop, saves to DB |
| `src/components/chat/chat-interface.tsx` | **Main UI.** Everything: input, messages, product cards, draft card, overlay |
| `src/lib/ai/openai.ts` | OpenAI wrappers: embeddings, chat, vision, moderation |
| `src/lib/ai/tools.ts` | Tool definitions for OpenAI function calling |
| `src/lib/qdrant/client.ts` | Vector DB: index, search, delete |
| `src/lib/auth/jwt.ts` | JWT generate, verify, cookie helpers |
| `src/lib/s3/client.ts` | S3: presign, upload, CDN URL |
| `prisma/schema.prisma` | Full DB schema (15 models) |
| `src/middleware.ts` | JWT-based route protection |

---

## How the Chat API Works

**All messages** go through `POST /api/chat`. It streams a Server-Sent Events response.

### Request body
```json
{
  "session_id": "...",        // optional — created on first message
  "message": "...",           // text input
  "image_url": "...",         // S3 URL (optional)
  "voice_transcript": "...",  // from Whisper (optional)
  "location": { "country_code": "KW", "language": "ar" }
}
```

### SSE event types (server → client)
```
event: status   → { text: "Thinking..." }          // status during tool execution
event: delta    → { content: "word " }              // text token by token
event: products → { products: [...], count: N }     // search results
event: analysis → { image_analysis: {...} }         // sell flow: AI product analysis
event: done     → { session_id, message_id }        // final event
```

### Tool calling loop
1. OpenAI called with `stream: true` + all 5 tools defined
2. If AI responds with tool calls → execute tools, append results, loop
3. If AI responds with text → stream `delta` events, exit loop
4. Max 5 iterations; max 2 clarifications (enforced in both prompt + code via `clarificationCount`)

---

## Buy Flow (User searching for products)

```
User types "I want a car" →
  AI calls search_products({ search_query: "car", ... }) →
  Qdrant returns similar products →
  SSE sends "products" event with cards →
  AI streams text response ("Here are some cars I found...")
```

If image uploaded for search:
```
User uploads photo + clicks "Find similar" →
  AI calls analyze_image_for_search({ ... }) →
  AI calls search_products({ search_query: <image description> }) →
  Results returned
```

---

## Sell Flow (User creating a listing)

```
User uploads photo + clicks "Sell this item" →
  AI calls analyze_image_for_listing({ image_url, country_code }) →
  SSE sends "analysis" event with { title, description, category, suggested_price } →
  Client creates ListingDraftCard with price=0 (user must set price) →
  User sets price → clicks "Publish Listing" →
  POST /api/products creates DB record + indexes in Qdrant
```

Key: `draft.price` ALWAYS starts at `"0"`. Never pre-fill from AI's suggested price. User must explicitly enter price before publish is enabled.

---

## Database Schema (Key Models)

```prisma
User           → email, password_hash, role (buyer|seller), country_code
Seller         → userId, business_name, phone_public, whatsapp_number, rating
Product        → sellerId, title, title_ar, description, price, currency, condition,
                 status (active|sold|expired|rejected), country_code, region_id
ProductImage   → productId, url, s3_key, is_primary
ChatSession    → userId (nullable), session_token (for anon), country_code, language
ChatMessage    → sessionId, role (user|assistant), content, product_ids[]
Category       → slug, name, name_ar (vehicles, electronics, property, fashion, etc.)
Country        → code, name, currency_code (KW, SA)
Region         → country_code, name, name_ar
SearchLog      → query analytics
```

---

## Environment Variables Required

```
DATABASE_URL           PostgreSQL connection string
OPENAI_API_KEY         OpenAI API key (GPT-4o + Whisper + embeddings)
QDRANT_URL             Qdrant vector DB URL
QDRANT_API_KEY         Qdrant API key
AWS_REGION             eu-north-1
AWS_ACCESS_KEY_ID      AWS access key
AWS_SECRET_ACCESS_KEY  AWS secret key
S3_BUCKET_NAME         S3 bucket name
S3_CDN_URL             Public CDN URL for S3
JWT_SECRET             Min 32 chars — REQUIRED (no fallback in production)
NODE_ENV               development | production
```

---

## Auth System

- JWT stored in `httpOnly` cookie (`auth_token`)
- `getCurrentUser()` reads cookie, verifies JWT → returns `{ userId, email, role }`
- `requireAuth()` throws if not authenticated (used in protected routes)
- Anonymous users can: search, view products, record voice
- Auth required for: creating listings, seller dashboard, product edit/delete
- Anonymous chat sessions tracked via `sessionToken` in `ChatSession`

---

## Common Patterns

### Protected API route
```typescript
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Qdrant product indexing
```typescript
const embedding = await getTextEmbedding(`${title} ${description}`);
await indexProduct(product.id, embedding, {
  product_id: product.id,
  seller_id: ...,
  title: ...,
  price: ...,
  country_code: ...,
  category_slug: ...,
  status: ...,
});
```

### S3 upload flow
```
Client → POST /api/upload/presign → { upload_url, public_url }
Client → PUT upload_url (direct to S3, no server involved)
Client → uses public_url in subsequent requests
```

---

## Key Gotchas & Decisions

1. **Model names**: Use `"gpt-4o"` for all chat/vision calls. Never `"gpt-5.2"` (invalid).
2. **Clarification limit**: `clarificationCount` tracked in `route.ts`. After 2 clarifications, code forces a search regardless of what AI wants. Don't remove this safeguard.
3. **Sell flow draft**: `draft.price` always starts as `"0"`. Do not set it from AI's `suggested_price`.
4. **`skipNextReload` ref**: In `chat-interface.tsx`, prevents the `useEffect` that reloads messages from wiping the draft card when a new session is created.
5. **Qdrant IDs**: Products use their UUID `id` as the Qdrant point ID. The `qdrantPointId` column in `Product` stores this.
6. **SSE parser**: `parseSSEEvents` in `chat-interface.tsx` — splits on `\n\n`. Works for well-formed events; edge case if no trailing newline.
7. **Image search flow**: `processImageForSearch()` uses GPT-4o Vision to describe the image, then `getTextEmbedding()` on the description to search Qdrant.
8. **Location defaults to KW**: No country/region picker UI exists yet. All requests default to `countryCode: "KW"`.

---

## Sprint Status (as of February 2026)

| Sprint | Name | Status |
|--------|------|--------|
| 1 | Infrastructure Setup | ✅ 95% |
| 2 | Core Backend APIs | ✅ 100% |
| 3 | Chat Interface UI | ✅ 100% |
| 4 | Seller Flow & Product Details | ✅ 100% |
| 5 | AI Conversational Chat + Streaming | ✅ 100% |
| 6 | Localization & Polish | 🔄 60% |
| 7 | Testing & Deployment | ⏳ 0% |

### Known Gaps
- **Location Selector UI**: Backend geo filtering works; no React component for country/region picker
- **Favorites / Reviews**: API stubs exist but don't persist data
- **Arabic translations**: Incomplete for error messages and some UI strings
- **Dark mode**: Not implemented

---

## Security Notes

- JWT secret is validated at startup — `JWT_SECRET` env var must be set (≥32 chars)
- Rate limiting via `aiLimiter` (20 req/hr/IP) on login, register, and chat
- All Prisma queries parameterized — no SQL injection risk
- S3 presigned URLs expire after 1 hour
- File uploads limited to 5MB, restricted MIME types
- Anonymous session messages require `x-session-token` header for access

---

## Running Locally

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Health check: `GET /api/health` — tests DB, Qdrant, S3, OpenAI connectivity.
