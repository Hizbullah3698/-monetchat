# PickPic Development Progress

## Project Overview
**Project:** PickPic - AI-Powered Chat-to-Buy/Sell Marketplace
**Version:** 1.0 (MVP)
**Target Market:** Kuwait
**Last Updated:** February 11, 2026

---

## Overall Progress

| Sprint | Name | Status | Progress |
|--------|------|--------|----------|
| 1 | Infrastructure Setup | ✅ Complete | 95% |
| 2 | Core Backend APIs | ✅ Complete | 100% |
| 3 | Chat Interface UI | ✅ Complete | 100% |
| 4 | Seller Flow & Product Details | ✅ Complete | 100% |
| 5 | AI Conversational Chat + Streaming | ✅ Complete | 100% |
| 6 | Localization & Polish | 🔄 In Progress | 60% |
| 7 | Testing & Deployment | ⏳ Pending | 0% |

**Legend:** ✅ Complete | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Sprint 1: Infrastructure Setup — 95%

### Completed Tasks ✅

| Task | File(s) | Notes |
|------|---------|-------|
| Prisma schema definition | `prisma/schema.prisma` | 15 models, enums, indexes |
| Prisma client singleton | `src/lib/db/prisma.ts` | Connection pooling, health check |
| Database seed script | `prisma/seed.ts` | Countries, regions, categories, prohibited keywords |
| Qdrant vector DB client | `src/lib/qdrant/client.ts` | Init, index, search, delete, health check |
| S3 storage client | `src/lib/s3/client.ts` | Presigned URLs, upload, move, delete, health check |
| OpenAI service layer | `src/lib/ai/openai.ts` | Chat, voice, vision, embeddings, moderation |
| JWT auth utilities | `src/lib/auth/jwt.ts` | Token gen/verify, cookies, role guards |
| Health check API | `src/app/api/health/route.ts` | Tests all 4 services (DB, Qdrant, S3, OpenAI) |
| Package.json | `package.json` | Prisma, OpenAI, S3, Qdrant, jose deps |
| Environment template | `env.example` | All required variables documented |

### Remaining Tasks ⏳

| Task | Blocker | Notes |
|------|---------|-------|
| Run `prisma db push` | DB connectivity | PostgreSQL not reachable from dev env |
| Run `prisma db seed` | Tables must exist | Depends on db push |
| Test all connections via /api/health | All services running | After DB is up |

---

## Sprint 2: Core Backend APIs — 100%

### Completed Tasks ✅

| Task | File(s) | Notes |
|------|---------|-------|
| Register API | `src/app/api/auth/register/route.ts` | Creates user + optional seller profile |
| Login API | `src/app/api/auth/login/route.ts` | Password verification, JWT token |
| Logout API | `src/app/api/auth/logout/route.ts` | Clears auth cookie |
| Get current user API | `src/app/api/auth/me/route.ts` | Returns user with seller info |
| Products list API | `src/app/api/products/route.ts` GET | Filters, pagination, sorting |
| Product create API | `src/app/api/products/route.ts` POST | AI moderation + Qdrant indexing |
| Product detail API | `src/app/api/products/[id]/route.ts` GET | Full product with images, seller |
| Product update API | `src/app/api/products/[id]/route.ts` PUT | Owner-only |
| Product delete API | `src/app/api/products/[id]/route.ts` DELETE | Owner-only |
| **AI Chat Search API** | `src/app/api/chat/route.ts` POST | **Core feature** - unified text/voice/image search |
| Voice Transcription API | `src/app/api/chat/voice/route.ts` POST | Whisper-based transcription |
| Chat Sessions API | `src/app/api/chat/sessions/route.ts` GET | List user's chat sessions |
| Chat Session Messages | `src/app/api/chat/sessions/[id]/route.ts` GET | Get messages for a session |
| S3 Presigned URL API | `src/app/api/upload/presign/route.ts` POST | Direct client-to-S3 uploads |
| Upload API (S3) | `src/app/api/upload/route.ts` POST | Server-side S3 upload |
| Geo Countries API | `src/app/api/geo/countries/route.ts` GET | Active countries |
| Geo Regions API | `src/app/api/geo/regions/route.ts` GET | Regions by country |
| AI Listing Analysis API | `src/app/api/ai/analyze-listing-image/route.ts` POST | GPT-4o Vision → listing suggestions |
| Content moderation | `src/lib/ai/openai.ts` | moderateContent() |

---

## Sprint 3: Chat Interface UI — 100%

### Completed Tasks ✅

| Task | File(s) | Notes |
|------|---------|-------|
| Full-page chat interface | `src/components/chat/chat-interface.tsx` | Replaced floating widget with full-page chat |
| Voice Button | `src/components/chat/voice-button.tsx` | Push-to-talk → Whisper → `/api/chat/voice` |
| Product cards in chat | In `chat-interface.tsx` | Shows image, title, price, seller, location |
| Call Seller button | In `ProductCard` component | `tel:` link with seller phone |
| WhatsApp button | In `ProductCard` component | Deep link with pre-filled message |
| Image search in chat | In `chat-interface.tsx` | File input → S3 upload → `/api/chat` |
| Session management | In `chat-interface.tsx` | Creates/resumes sessions via API |
| Chat sidebar (history) | In `app-mode-context.tsx` | Lists past conversations, click to reload |

---

## Sprint 4: Seller Flow & Product Details — 100%

### Completed Tasks ✅

| Task | File(s) | Notes |
|------|---------|-------|
| Seller Listing: Upload | `src/app/(seller)/sell/new/page.tsx` | 3-step: Upload → Form → Preview |
| S3 presigned upload | In sell/new page | Client → presigned URL → PUT to S3 |
| AI image analysis | `/api/ai/analyze-listing-image` | GPT-4o Vision → auto-fill title, description, category, price |
| Listing Preview | `src/components/seller/listing-preview.tsx` | Full preview before publish |
| Listing Form | `src/components/seller/listing-form.tsx` | React Hook Form + Zod validation |
| Content moderation | In `/api/products` POST | AI checks for prohibited items |
| Seller Dashboard | `src/app/(marketplace)/seller/dashboard/products/page.tsx` | Edit/delete/mark sold |
| Product Detail Page | `src/app/(marketplace)/p/[productId]/page.tsx` | Full product with images, seller |

---

## Sprint 5: AI Conversational Chat + Streaming — 100% ✅

### Completed February 9-11, 2026

| Task | File(s) | Notes |
|------|---------|-------|
| **OpenAI Tool Calling** | `src/lib/ai/tools.ts`, `src/app/api/chat/route.ts` | 5 tools: search_products, ask_clarification, create_listing, analyze_image_for_search, analyze_image_for_listing |
| **Conversational AI** | `src/lib/ai/openai.ts` | System prompt with clarification limits, language matching |
| **Clarification Enforcement** | `src/app/api/chat/route.ts` | Max 2 clarifications, then force search (prompt + code enforcement) |
| **Unified Mode** | `src/components/chat/chat-interface.tsx` | Removed buy/sell toggle; AI detects intent from image+text |
| **Intent Picker** | `chat-interface.tsx` | When image uploaded, shows "Find similar" / "Sell this item" buttons |
| **SSE Streaming Response** | `src/app/api/chat/route.ts` | Server-Sent Events with ReadableStream, token-by-token text |
| **Streaming Client** | `chat-interface.tsx` | SSE reader with progressive text rendering |
| **Status Events** | `route.ts` → `chat-interface.tsx` | "Thinking...", "Searching products...", "Analyzing image..." |
| **Inline Skeleton** | `chat-interface.tsx` | Spinner + status text inside assistant message bubble |
| **3-Card Limit + See More** | `chat-interface.tsx` | Max 3 product cards inline, "See all N results" button |
| **Products Overlay** | `chat-interface.tsx` | Full overlay covering chat area with all results, closeable |
| **executeCreateListing** | `route.ts` | Real product creation: seller profile, DB, images, Qdrant indexing |
| **Sell Flow Draft Card** | `chat-interface.tsx` `ListingDraftCard` | Image gallery, edit mode, inline price input, publish validation |
| **Quick Price Entry** | `chat-interface.tsx` | Inline price input with confirm/cancel buttons, no pre-fill |
| **Publish Validation** | `chat-interface.tsx` | Disabled until price is set, "Set price to publish" text |
| **Draft Persistence Fix** | `chat-interface.tsx` | `skipNextReload` ref prevents session reload from wiping draft |
| **Buy Flow Fix** | `route.ts` | `imageAnalysis` only set by `analyze_image_for_listing`, not search |

### SSE Event Protocol

```
Client → POST /api/chat (JSON body)
Server → SSE stream with events:

event: status    → { text: "Thinking..." }           // Tool execution feedback
event: delta     → { content: "word " }               // Streaming text tokens
event: products  → { products: [...], count: N }      // Search results (appear immediately)
event: analysis  → { image_analysis: {...} }           // Listing analysis (sell flow)
event: done      → { session_id, message_id }          // Final event, triggers draft creation
```

### Key Architecture Decisions

- **All OpenAI calls use `stream: true`** — text deltas forwarded to client in real-time
- **Tool calls accumulated from stream chunks** via `toolCallChunks` Map by index
- **Products sent via SSE event** before final text, so cards appear while AI writes response
- **Draft card price always starts at 0** — user must explicitly set price before publishing
- **Clarification limit**: prompt says "MAX 1-2" + code tracks `clarificationCount` and forces search at 2

---

## Sprint 6: Localization & Polish — 60%

### Completed Tasks ✅

| Task | Notes |
|------|-------|
| Arabic translations (basic) | Common UI strings in Arabic |
| RTL layout support | CSS direction support |
| Language context | `useLanguage()` hook for locale switching |
| AI language matching | AI responds in user's language (Arabic/English) |
| Chat sidebar with history | Past conversations listed and loadable |

### Remaining Tasks ⏳

| Task | Notes |
|------|-------|
| Complete Arabic translations | All strings including error messages |
| Location selector component | Country/region picker UI |
| UI polish and responsive fixes | Mobile optimization |
| Dark mode | Theme switching |

---

## Core Feature Flows (V1 — Current Implementation)

### Buyer: Chat → AI Search → Products → Contact Seller
```
1. User opens chat (full-page, homepage)
2. Types text / records voice / uploads image
3. If image uploaded: Intent picker shown ("Find similar" / "Sell this item")
4. "Find similar" → AI calls analyze_image_for_search → search_products
5. Text query → AI decides: search_products OR ask_clarification (max 2)
6. SSE stream: "Thinking..." → "Searching..." → product cards appear → AI text streams
7. Max 3 cards inline, "See all N results" opens overlay
8. Each card: image, title, price, seller, location
9. Click card → ProductDetailDialog with Call/WhatsApp buttons
```

### Seller: Chat → Upload → AI Analysis → Draft → Price → Publish
```
1. User uploads image in chat
2. Intent picker: clicks "Sell this item"
3. AI calls analyze_image_for_listing → SSE analysis event
4. Draft card appears: images, AI-generated title/description/category
5. Price shows inline input (empty, user must enter)
6. User enters price → confirms with tick button
7. "Publish Listing" button enables → POST /api/products
8. Product created in DB + indexed in Qdrant
9. User can also click "Edit" for full form editing
```

---

## API Route Map (Current State)

```
src/app/api/
├── auth/
│   ├── register/route.ts    ✅ POST - Register
│   ├── login/route.ts       ✅ POST - Login
│   ├── logout/route.ts      ✅ POST - Logout
│   └── me/route.ts          ✅ GET  - Current user
│
├── chat/
│   ├── route.ts             ✅ POST - AI chat with SSE streaming + tool calling
│   ├── voice/route.ts       ✅ POST - Voice transcription
│   ├── sessions/route.ts    ✅ GET  - Chat sessions list
│   └── sessions/[id]/route.ts ✅ GET - Session messages
│
├── products/
│   ├── route.ts             ✅ GET/POST - List/Create
│   └── [id]/route.ts        ✅ GET/PUT/DELETE - Detail/Update/Delete
│
├── upload/
│   ├── route.ts             ✅ POST - Upload file to S3
│   └── presign/route.ts     ✅ POST - Get presigned URL
│
├── geo/
│   ├── countries/route.ts   ✅ GET  - Active countries
│   └── regions/route.ts     ✅ GET  - Regions by country
│
├── ai/
│   ├── analyze-listing-image/route.ts ✅ POST - AI image analysis
│   └── find-similar-products/route.ts ✅ POST - Vector search
│
├── health/route.ts          ✅ GET  - Health check
└── seller/
    ├── profile/route.ts     ✅ Prisma CRUD
    └── listings/route.ts    ✅ Prisma query with images
```

---

## Infrastructure Files

```
src/lib/
├── ai/
│   ├── openai.ts            ✅ OpenAI service (chat, voice, vision, embeddings, moderation)
│   └── tools.ts             ✅ Tool definitions for OpenAI function calling (5 tools)
├── auth/jwt.ts              ✅ JWT utilities (generate, verify, cookies, guards)
├── db/prisma.ts             ✅ Prisma client singleton
├── qdrant/client.ts         ✅ Qdrant vector DB client
└── s3/client.ts             ✅ AWS S3 client (presign, upload, delete, CDN URL)

src/middleware.ts             ✅ JWT-based route protection

prisma/
├── schema.prisma            ✅ 15 models, enums, indexes
└── seed.ts                  ✅ Countries, regions, categories, keywords
```

---

## UI Components

```
src/components/
├── chat/
│   ├── chat-interface.tsx   ✅ Full-page AI chat with streaming, products, draft cards, overlay
│   └── voice-button.tsx     ✅ Push-to-talk recording → Whisper transcription
├── seller/
│   ├── listing-form.tsx     ✅ React Hook Form + Zod validation
│   └── listing-preview.tsx  ✅ Full listing preview before publish
├── product/
│   ├── product-gallery.tsx  ✅ Image gallery with thumbnails
│   └── message-seller-button.tsx ✅ Creates message thread
└── ui/                      ✅ shadcn/ui components (40+ components)
```

---

## Key Technical Decisions

| Decision | Choice | Status |
|----------|--------|--------|
| ORM | Prisma | ✅ Implemented |
| Database | PostgreSQL | ✅ Schema ready |
| Vector DB | Qdrant | ✅ Client ready |
| Storage | AWS S3 (eu-north-1) | ✅ CORS configured |
| AI Provider | OpenAI (GPT-4o, Whisper) | ✅ With tool calling |
| Auth | JWT (jose library) | ✅ Implemented |
| Image Search | Vision → JSON → Text Embedding | ✅ Implemented |
| Chat API | SSE Streaming + Tool Calling | ✅ Implemented |
| Messaging | Direct call to seller (no P2P chat) | Per V1 spec |

---

## Environment Variables Required

```
DATABASE_URL          - PostgreSQL connection string
OPENAI_API_KEY        - OpenAI API key
QDRANT_URL            - Qdrant vector DB URL
QDRANT_API_KEY        - Qdrant API key (optional)
AWS_REGION            - AWS region (eu-north-1)
AWS_ACCESS_KEY_ID     - AWS access key
AWS_SECRET_ACCESS_KEY - AWS secret key
S3_BUCKET_NAME        - S3 bucket name
S3_CDN_URL            - S3/CDN public URL
JWT_SECRET            - JWT signing secret (min 32 chars)
JWT_EXPIRES_IN        - Token expiry (default: 24h)
NODE_ENV              - Environment (development/production)
```

---

## Next Steps

1. **Complete Arabic translations** — all strings including error messages
2. **UI polish** — mobile responsiveness, dark mode
3. **E2E testing** — chat flow, seller flow, auth flow
4. **Production deployment** — PM2 + NGINX on Windows Server
5. **Post-V1** — Favorites, Reviews, P2P messaging

---

*Last Updated: February 11, 2026*
