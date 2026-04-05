# Technical Implementation Plan - PickPic V1
## AI-Powered Chat-to-Buy/Sell Marketplace

**Version:** 1.3
**Date:** February 11, 2026
**Target:** Kuwait Launch
**ORM:** Prisma (type-safe database access)

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | PostgreSQL + Qdrant | Relational + Vector in separate optimized systems |
| **ORM** | Prisma | Type-safe queries, migrations, excellent DX |
| **Image Search** | Vision → JSON → Text Embedding | Single vector space for all query types |
| **Embeddings** | text-embedding-3-small (1536 dim) | Unified embedding model for text/voice/image |
| **Vector DB** | Single `products` collection | Simpler architecture, consistent results |
| **Storage** | AWS S3 (Bahrain me-south-1) | Lowest latency to Kuwait |
| **Auth** | Email + Password + JWT | Simple, no phone OTP in V1 |
| **Messaging** | None (Direct call to seller) | Per business requirement |

### Image Search Architecture (Key Feature)
```
📷 Image Upload
    ↓
GPT-4o Vision → Extract JSON
    ↓
{category, brand, model, color, ...} → search_text
    ↓
text-embedding-3-small → 1536-dim vector
    ↓
Qdrant search (same collection as text queries)
    ↓
Product cards
```

This approach ensures text queries like "Mercedes GLE" and image uploads of a Mercedes GLE search the **same vector space** for consistent results.

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Infrastructure Setup](#3-infrastructure-setup)
4. [Database Design](#4-database-design)
5. [API Specifications](#5-api-specifications)
6. [Frontend Components](#6-frontend-components)
7. [AI Integration](#7-ai-integration)
8. [File Structure](#8-file-structure)
9. [Sprint Breakdown](#9-sprint-breakdown)
10. [Deployment Guide](#10-deployment-guide)
11. [Testing Checklist](#11-testing-checklist)

---

## 1. Tech Stack Overview

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 15.x | Full-stack React framework |
| **Language** | TypeScript | 5.x | Type safety |
| **UI Library** | shadcn/ui + Tailwind | 3.4.x | Component library + styling |
| **ORM** | Prisma | 5.x | Type-safe database access |
| **Main Database** | PostgreSQL | 16.x | Users, products, sellers, transactions |
| **Vector Database** | Qdrant | 1.7.x | AI embeddings, semantic search |
| **Object Storage** | AWS S3 | - | Images, videos, documents |
| **AI - Chat** | OpenAI GPT-4o | - | Conversational AI, intent parsing |
| **AI - Voice** | OpenAI Whisper | - | Arabic/English speech-to-text |
| **AI - Embeddings** | OpenAI text-embedding-3-small | - | Vector embeddings |
| **AI - Vision** | OpenAI GPT-4o Vision | - | Image → JSON extraction for search |
| **Runtime** | Node.js | 20.x LTS | Server runtime |
| **Process Manager** | PM2 | 5.x | Windows service management |
| **Deployment** | Windows Server | 2022 | Production hosting |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WINDOWS SERVER                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         NGINX (Reverse Proxy)                        │   │
│  │                    SSL Termination + Load Balancing                  │   │
│  │                         Port 80/443 → 3000                           │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │                      NEXT.JS APPLICATION                             │   │
│  │                         (PM2 Managed)                                │   │
│  │                          Port 3000                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │   Pages/SSR     │  │   API Routes    │  │   AI Services   │     │   │
│  │  │   (Chat UI)     │  │   (/api/*)      │  │   (OpenAI SDK)  │     │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                │
│         │                        │                        │                │
│         ▼                        ▼                        ▼                │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│  │ PostgreSQL  │         │   Qdrant    │         │  AWS S3     │          │
│  │  Port 5432  │         │ Port 6333   │         │  (Cloud)    │          │
│  │             │         │             │         │             │          │
│  │ - Users     │         │ - Product   │         │ - Images    │          │
│  │ - Products  │         │   Vectors   │         │ - Videos    │          │
│  │ - Sellers   │         │ - Image     │         │ - Documents │          │
│  │ - Sessions  │         │   Vectors   │         │             │          │
│  └─────────────┘         └─────────────┘         └─────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
                    ┌───────────────────────────────┐
                    │        EXTERNAL APIs          │
                    │  ┌─────────────────────────┐  │
                    │  │  OpenAI API             │  │
                    │  │  - GPT-4o (Chat)        │  │
                    │  │  - Whisper (Voice)      │  │
                    │  │  - Embeddings           │  │
                    │  │  - Vision               │  │
                    │  └─────────────────────────┘  │
                    └───────────────────────────────┘
```

---

## 3. Infrastructure Setup

### 3.1 PostgreSQL Installation (Windows)

```powershell
# Download PostgreSQL 16 from https://www.postgresql.org/download/windows/
# Run installer with default settings

# Post-installation setup
psql -U postgres

# Create database and user
CREATE DATABASE pickpic;
CREATE USER pickpic_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE pickpic TO pickpic_user;

# Enable required extensions
\c pickpic
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
```

**PostgreSQL Windows Service:**
- Service Name: `postgresql-x64-16`
- Auto-start: Enabled
- Port: 5432

### 3.2 Prisma ORM Setup

Prisma is used as the ORM for type-safe database access.

```bash
# Install Prisma CLI and client
npm install prisma @prisma/client

# Initialize Prisma (already done, schema at prisma/schema.prisma)
npx prisma init

# Generate Prisma client after schema changes
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Run migrations (production)
npx prisma migrate dev --name init
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Open Prisma Studio (GUI)
npx prisma studio
```

**Key Prisma Files:**
- `prisma/schema.prisma` - Database schema definition
- `prisma/seed.ts` - Seed data script
- `src/lib/db/prisma.ts` - Prisma client singleton

**Prisma Client Usage:**
```typescript
import { prisma } from '@/lib/db/prisma';

// Type-safe queries
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { seller: true }
});

// Transactions
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: {...} });
  await tx.seller.create({ data: { userId: user.id, ...} });
});
```

### 3.3 Qdrant Installation (Windows)

**Option A: Docker (Recommended)**
```powershell
# Install Docker Desktop for Windows first
docker run -d --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v C:/qdrant/storage:/qdrant/storage \
  qdrant/qdrant:latest
```

**Option B: Native Binary**
```powershell
# Download from https://github.com/qdrant/qdrant/releases
# Extract to C:\qdrant\

# Create config file: C:\qdrant\config\config.yaml
storage:
  storage_path: C:/qdrant/storage

service:
  host: 0.0.0.0
  http_port: 6333
  grpc_port: 6334

# Run as Windows Service using NSSM
nssm install Qdrant "C:\qdrant\qdrant.exe"
nssm set Qdrant AppDirectory "C:\qdrant"
nssm start Qdrant
```

### 3.4 AWS S3 Configuration

```typescript
// Environment variables required
AWS_REGION=me-south-1  // Bahrain (closest to Kuwait)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=pickpic-media

// Bucket structure
pickpic-media/
├── products/
│   └── {product_id}/
│       ├── primary.jpg
│       ├── image_1.jpg
│       └── image_2.jpg
├── profiles/
│   └── {user_id}/
│       └── avatar.jpg
└── temp/
    └── {upload_id}/
```

**S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pickpic-media/products/*"
    }
  ]
}
```

**CORS Configuration:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3.5 Environment Variables

```env
# .env.production

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://pickpic.com
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://pickpic_user:password@localhost:5432/pickpic
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pickpic
DB_USER=pickpic_user
DB_PASSWORD=your_secure_password

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=optional_api_key

# AWS S3
AWS_REGION=me-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=pickpic-media
S3_CDN_URL=https://pickpic-media.s3.me-south-1.amazonaws.com

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# Regional Settings
DEFAULT_COUNTRY=KW
DEFAULT_CURRENCY=KWD
DEFAULT_LANGUAGE=ar
```

---

## 4. Database Design

### 4.1 PostgreSQL Schema (Prisma)

> **Note:** We use Prisma ORM for database management. The schema is defined in `prisma/schema.prisma`.
> Run `npx prisma generate` after changes and `npx prisma db push` to sync with database.

```sql
-- Reference SQL (generated by Prisma) - File: prisma/schema.prisma

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. COUNTRIES & REGIONS
-- ============================================
CREATE TABLE countries (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    currency_symbol VARCHAR(5),
    phone_code VARCHAR(5) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO countries (code, name, name_ar, currency_code, currency_symbol, phone_code) VALUES
('KW', 'Kuwait', 'الكويت', 'KWD', 'د.ك', '+965'),
('SA', 'Saudi Arabia', 'السعودية', 'SAR', 'ر.س', '+966');

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    country_code CHAR(2) REFERENCES countries(code),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Kuwait regions
INSERT INTO regions (country_code, name, name_ar) VALUES
('KW', 'Kuwait City', 'مدينة الكويت'),
('KW', 'Hawally', 'حولي'),
('KW', 'Farwaniya', 'الفروانية'),
('KW', 'Ahmadi', 'الأحمدي'),
('KW', 'Jahra', 'الجهراء'),
('KW', 'Mubarak Al-Kabeer', 'مبارك الكبير');

-- ============================================
-- 2. USERS & AUTHENTICATION
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    full_name_ar VARCHAR(100),
    phone VARCHAR(20),                    -- Optional, for seller contact
    avatar_url VARCHAR(512),
    country_code CHAR(2) DEFAULT 'KW' REFERENCES countries(code),
    region_id INT REFERENCES regions(id),
    preferred_language CHAR(2) DEFAULT 'ar',
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_country ON users(country_code);

-- ============================================
-- 3. USER ROLES (Simplified for V1)
-- ============================================
CREATE TYPE user_role AS ENUM ('buyer', 'seller');

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);

-- ============================================
-- 4. SELLERS
-- ============================================
CREATE TABLE sellers (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    business_name_ar VARCHAR(255),
    bio TEXT,
    bio_ar TEXT,
    phone_public VARCHAR(20) NOT NULL,  -- Displayed to buyers
    whatsapp_number VARCHAR(20),
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    total_sales INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. CATEGORIES (Backend managed, AI-assigned)
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    parent_id INT REFERENCES categories(id),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- Main categories
INSERT INTO categories (slug, name, name_ar, icon, sort_order) VALUES
('vehicles', 'Vehicles', 'مركبات', 'car', 1),
('electronics', 'Electronics', 'إلكترونيات', 'smartphone', 2),
('property', 'Property', 'عقارات', 'home', 3),
('fashion', 'Fashion', 'أزياء', 'shirt', 4),
('furniture', 'Furniture', 'أثاث', 'sofa', 5),
('services', 'Services', 'خدمات', 'wrench', 6),
('jobs', 'Jobs', 'وظائف', 'briefcase', 7),
('other', 'Other', 'أخرى', 'package', 99);

-- ============================================
-- 6. PRODUCTS
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES sellers(user_id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,

    -- Pricing
    price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'KWD',
    is_negotiable BOOLEAN DEFAULT true,

    -- Category (AI-assigned)
    category_id INT REFERENCES categories(id),

    -- Location
    country_code CHAR(2) DEFAULT 'KW' REFERENCES countries(code),
    region_id INT REFERENCES regions(id),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Status
    status VARCHAR(20) DEFAULT 'active',  -- active, sold, expired, rejected
    rejection_reason TEXT,

    -- Metadata
    view_count INT DEFAULT 0,
    contact_count INT DEFAULT 0,  -- How many times "Call Seller" clicked

    -- Vector reference (stored in Qdrant)
    qdrant_point_id UUID,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_country ON products(country_code);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_created ON products(created_at DESC);

-- Full text search index
CREATE INDEX idx_products_title_search ON products USING gin(to_tsvector('english', title));

-- ============================================
-- 7. PRODUCT IMAGES
-- ============================================
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(512) NOT NULL,
    s3_key VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ============================================
-- 8. CHAT SESSIONS (AI Conversations)
-- ============================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_token VARCHAR(255) UNIQUE,  -- For anonymous users
    country_code CHAR(2) DEFAULT 'KW',
    language CHAR(2) DEFAULT 'ar',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user', 'assistant'
    content TEXT NOT NULL,

    -- For user messages
    has_image BOOLEAN DEFAULT false,
    image_url VARCHAR(512),
    has_voice BOOLEAN DEFAULT false,
    voice_transcript TEXT,

    -- For assistant messages
    product_ids UUID[],  -- Products shown in response

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- ============================================
-- 9. CONTENT MODERATION
-- ============================================
CREATE TABLE prohibited_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(100) NOT NULL,
    keyword_ar VARCHAR(100),
    country_codes CHAR(2)[] DEFAULT ARRAY['KW', 'SA'],
    category VARCHAR(50),  -- 'alcohol', 'weapons', 'drugs', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kuwait/Saudi prohibited items
INSERT INTO prohibited_keywords (keyword, keyword_ar, category) VALUES
('alcohol', 'كحول', 'alcohol'),
('beer', 'بيرة', 'alcohol'),
('wine', 'نبيذ', 'alcohol'),
('whiskey', 'ويسكي', 'alcohol'),
('vodka', 'فودكا', 'alcohol'),
('gun', 'مسدس', 'weapons'),
('rifle', 'بندقية', 'weapons'),
('ammunition', 'ذخيرة', 'weapons'),
('drugs', 'مخدرات', 'drugs'),
('marijuana', 'ماريجوانا', 'drugs'),
('pork', 'لحم خنزير', 'pork'),
('bacon', 'لحم مقدد', 'pork');

-- ============================================
-- 10. ANALYTICS & LOGS
-- ============================================
CREATE TABLE search_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    user_id UUID REFERENCES users(id),
    query_text TEXT,
    query_type VARCHAR(20),  -- 'text', 'voice', 'image'
    filters JSONB,
    result_count INT,
    latency_ms INT,
    country_code CHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_logs (
    id BIGSERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES chat_sessions(id),
    contact_type VARCHAR(20),  -- 'call', 'whatsapp'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sellers_updated_at BEFORE UPDATE ON sellers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.2 Qdrant Collections

```typescript
// File: src/lib/qdrant/schema.ts

// Single collection for all product searches (text, voice, and image)
// Image search works by: Image → GPT-4o Vision → JSON → Text → Embedding
// This keeps everything in the same vector space for consistent results

{
  name: "products",
  vectors: {
    size: 1536,  // OpenAI text-embedding-3-small
    distance: "Cosine"
  },
  payload_schema: {
    product_id: "uuid",
    seller_id: "uuid",
    title: "text",
    title_ar: "text",
    description: "text",
    price: "float",
    currency: "keyword",
    category_slug: "keyword",
    country_code: "keyword",
    region_id: "integer",
    status: "keyword",
    created_at: "datetime"
  },
  // Payload indexes for filtered search
  indexes: [
    { field: "country_code", type: "keyword" },
    { field: "category_slug", type: "keyword" },
    { field: "price", type: "float" },
    { field: "status", type: "keyword" },
    { field: "region_id", type: "integer" }
  ]
}

// NOTE: No separate image collection needed!
// Image search flow:
// 1. User uploads image
// 2. GPT-4o Vision extracts: category, brand, model, color, etc.
// 3. Extracted details → search_text string
// 4. search_text → text-embedding-3-small → 1536-dim vector
// 5. Vector search in same "products" collection
// This ensures text/voice/image queries all search the same space
```

---

## 5. API Specifications

### 5.1 API Route Structure

```
src/app/api/
├── auth/
│   ├── register/route.ts      POST - Register with email/password
│   ├── login/route.ts         POST - Login with email/password
│   ├── logout/route.ts        POST - Logout user
│   ├── me/route.ts            GET  - Get current user
│   └── refresh/route.ts       POST - Refresh JWT token
│
├── chat/
│   ├── route.ts               POST - Send message to AI
│   ├── sessions/route.ts      GET  - Get user's chat sessions
│   ├── sessions/[id]/route.ts GET  - Get session messages
│   └── voice/route.ts         POST - Transcribe voice message
│
├── products/
│   ├── route.ts               GET  - List products (filtered)
│   │                          POST - Create product (seller)
│   ├── [id]/route.ts          GET  - Get product details
│   │                          PUT  - Update product
│   │                          DELETE - Delete product
│   ├── [id]/contact/route.ts  POST - Log contact click
│   └── search/route.ts        POST - AI-powered search
│
├── sellers/
│   ├── route.ts               POST - Become a seller
│   ├── [id]/route.ts          GET  - Get seller profile
│   └── me/route.ts            GET  - Get own seller profile
│                              PUT  - Update seller profile
│
├── upload/
│   ├── presign/route.ts       POST - Get S3 presigned URL
│   └── complete/route.ts      POST - Confirm upload complete
│
├── geo/
│   ├── countries/route.ts     GET  - List active countries
│   └── regions/route.ts       GET  - List regions by country
│
└── health/route.ts            GET  - Health check
```

### 5.2 Key API Contracts

#### Chat API (Core Feature — SSE Streaming + Tool Calling)

```typescript
// POST /api/chat
// Unified endpoint for text, voice, and image search
// Returns Server-Sent Events (SSE) stream, NOT JSON

// Request (JSON body)
{
  session_id?: string,        // Existing session or null for new
  message?: string,           // User's text message
  image_url?: string,         // If user uploaded an image
  voice_transcript?: string,  // If voice was transcribed client-side
  location: {
    country_code: "KW",
    region_id?: 1,
    language: "ar"            // For AI response language
  }
}

// Response: SSE stream (Content-Type: text/event-stream)
// Events sent progressively:

event: status
data: { "text": "Thinking..." }

event: status
data: { "text": "Searching products..." }

event: products
data: { "products": [...], "count": 5 }

event: delta
data: { "content": "I found " }

event: delta
data: { "content": "5 listings " }

event: delta
data: { "content": "for you:" }

event: done
data: { "session_id": "uuid", "message_id": "uuid" }
```

**Key Implementation Details:**
- Uses OpenAI function calling with 5 tools (search_products, ask_clarification, create_listing, analyze_image_for_search, analyze_image_for_listing)
- ALL OpenAI calls use `stream: true` — text deltas forwarded to client token-by-token
- Tool call arguments accumulated from stream chunks via `toolCallChunks` Map
- Products/analysis sent as separate SSE events before final text streams
- Clarification limit: max 2 before forcing search (prompt + code enforcement)
- Messages saved to DB after stream completes

```typescript
// File: src/app/api/chat/route.ts (simplified)

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send "Thinking..." status
      controller.enqueue(encoder.encode(sseEvent('status', { text: 'Thinking...' })));

      // Tool calling loop (max 5 iterations)
      while (iterations < maxIterations) {
        const streamCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          tools: getToolDefinitions(),
          stream: true,
        });

        // Accumulate tool calls from chunks, forward text deltas
        for await (const chunk of streamCompletion) {
          if (chunk.choices[0]?.delta?.content) {
            controller.enqueue(encoder.encode(sseEvent('delta', {
              content: chunk.choices[0].delta.content
            })));
          }
          // ... accumulate tool_calls chunks
        }

        // If tool calls: execute tools, send status/products/analysis events
        // If text only: break (already streamed)
      }

      // Save to DB, send done event
      controller.enqueue(encoder.encode(sseEvent('done', { session_id, message_id })));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

#### Voice Transcription API

```typescript
// POST /api/chat/voice
// Transcribe voice recording to text

// Request (multipart/form-data)
{
  audio: File,           // Audio blob (webm/mp4)
  language: "ar" | "en"  // Hint for transcription
}

// Response
{
  transcript: "أبي مرسيدس جي إل إي",
  language_detected: "ar",
  confidence: 0.95
}
```

#### Product Creation API

```typescript
// POST /api/products
// Create new product listing (AI-assisted)

// Request
{
  title: "2023 Mercedes GLE 350",
  title_ar?: "مرسيدس GLE 350 2023",
  description: "Excellent condition, full service history",
  description_ar?: "حالة ممتازة، سجل صيانة كامل",
  price: 18500,
  currency: "KWD",
  is_negotiable: true,
  images: [
    { url: "https://s3.../xxx.jpg", is_primary: true },
    { url: "https://s3.../yyy.jpg", is_primary: false }
  ],
  location: {
    country_code: "KW",
    region_id: 1,
    latitude?: 29.3759,
    longitude?: 47.9774
  }
}

// Response
{
  id: "uuid",
  status: "active",  // or "rejected"
  rejection_reason?: "Prohibited item detected",
  category: {
    id: 1,
    slug: "vehicles",
    name: "Vehicles"
  },
  // ... full product object
}
```

---

## 6. Frontend Components

### 6.1 Component Tree

```
src/components/
├── chat/
│   ├── chat-interface.tsx       # Full-page chat with SSE streaming, product cards,
│   │                            # draft cards, products overlay, intent picker
│   │                            # Sub-components defined inline:
│   │                            #   - ProductCard (buy flow results)
│   │                            #   - ProductDetailDialog (full product view)
│   │                            #   - ListingDraftCard (sell flow: preview, edit, price, publish)
│   │                            #   - Products overlay (all results grid)
│   └── voice-button.tsx         # Push-to-talk voice recording → Whisper
│
├── product/
│   ├── product-gallery.tsx      # Image carousel with thumbnails
│   └── message-seller-button.tsx # Creates message thread
│
├── seller/
│   ├── listing-form.tsx         # React Hook Form + Zod validation
│   └── listing-preview.tsx      # Full listing preview before publish
│
├── ui/                          # shadcn/ui components (40+)
│   ├── button.tsx, input.tsx, dialog.tsx, select.tsx,
│   ├── scroll-area.tsx, textarea.tsx, skeleton.tsx, etc.
│   └── ...
│
└── context/
    ├── language-context.tsx      # AR/EN locale switching
    └── app-mode-context.tsx      # Chat sidebar, session management
```

### 6.2 Key Component Specifications

#### ChatInterface.tsx (Main Component)

```tsx
// Full-screen chat interface
interface ChatInterfaceProps {
  initialSessionId?: string;
}

// Features:
// - Full viewport height
// - Messages scroll area
// - Fixed input at bottom
// - Voice button
// - Image upload button
// - Location indicator in header

// State:
// - messages: ChatMessage[]
// - isLoading: boolean
// - sessionId: string
// - location: { country_code, region_id }
```

#### ProductCard.tsx (In Chat)

```tsx
interface ProductCardProps {
  product: {
    id: string;
    title: string;
    title_ar?: string;
    price: number;
    currency: string;
    image_url: string;
    seller: {
      name: string;
      phone: string;
      whatsapp?: string;
    };
    location: {
      region: string;
      region_ar: string;
    };
  };
  language: 'ar' | 'en';
}

// Features:
// - Thumbnail image
// - Title (localized)
// - Price with currency
// - Seller name
// - Location
// - "Call Seller" button (tel: link)
// - "WhatsApp" button (optional)
// - Click to view full details
```

#### VoiceButton.tsx

```tsx
interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  language: 'ar' | 'en';
}

// Features:
// - Push-to-talk (hold to record)
// - Visual feedback (pulsing animation)
// - Real-time audio levels
// - Auto-send on release
// - Error handling for permissions

// Uses: Web Audio API + OpenAI Whisper
```

### 6.3 Page Structure

```
src/app/
├── (chat)/
│   └── page.tsx                # Main chat page (homepage)
│
├── (auth)/
│   ├── login/page.tsx          # Login page
│   └── register/page.tsx       # Registration page
│
├── (seller)/
│   ├── sell/page.tsx           # Create listing page
│   └── my-listings/page.tsx    # Seller's listings
│
├── product/
│   └── [id]/page.tsx           # Product detail page
│
├── settings/
│   ├── page.tsx                # User settings
│   ├── language/page.tsx       # Language preference
│   └── location/page.tsx       # Location preference
│
├── api/                        # API routes (see section 5)
│
├── layout.tsx                  # Root layout with providers
├── globals.css                 # Global styles + RTL
└── not-found.tsx               # 404 page
```

---

## 6.5 Database Client (Prisma)

```typescript
// File: src/lib/db/prisma.ts

import { PrismaClient } from '@prisma/client';

// Singleton pattern for Next.js hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;

// Usage Examples:

// Simple query
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});

// Query with relations
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    seller: true,
    images: true,
    category: true,
  },
});

// Transaction
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: {...} });
  const seller = await tx.seller.create({ data: { userId: user.id, ...} });
  return { user, seller };
});
```

---

## 7. AI Integration

### 7.0 Unified Search Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    UNIFIED EMBEDDING PIPELINE                             │
│                    (All queries use same vector space)                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   TEXT INPUT ───────────────────────┐                                    │
│   "I want a Mercedes GLE"           │                                    │
│                                     │                                    │
│   VOICE INPUT ──────────────────────┼───→ text-embedding-3-small (1536)  │
│   🎤 → Whisper → "أبي مرسيدس"        │              │                     │
│                                     │              │                     │
│   IMAGE INPUT ──────────────────────┘              │                     │
│   📷 → GPT-4o Vision → JSON → search_text ─────────┘                     │
│                                                    │                     │
│                                                    ▼                     │
│                                          ┌─────────────────┐             │
│                                          │  Qdrant Search  │             │
│                                          │  (products)     │             │
│                                          └─────────────────┘             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.1 OpenAI Service Layer

```typescript
// File: src/lib/ai/openai.ts

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry wrapper for rate limiting
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.status === 429;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isRateLimit && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Text embedding for search
export async function getTextEmbedding(text: string): Promise<number[]> {
  return withRetry(async () => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  });
}

// Voice transcription
export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<{ text: string; language: string }> {
  return withRetry(async () => {
    const response = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], 'audio.webm', { type: 'audio/webm' }),
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json',
    });
    return {
      text: response.text,
      language: response.language,
    };
  });
}

// Chat completion with product search
export async function chatWithProducts(
  messages: Array<{ role: string; content: string }>,
  context: {
    country_code: string;
    language: string;
    available_categories: string[];
  }
): Promise<{
  response: string;
  search_query?: string;
  filters?: Record<string, any>;
}> {
  const systemPrompt = `You are a helpful shopping assistant for PickPic marketplace in ${context.country_code === 'KW' ? 'Kuwait' : 'Saudi Arabia'}.

Your role:
1. Understand what the user wants to buy
2. Extract search intent and filters
3. Respond naturally in ${context.language === 'ar' ? 'Arabic' : 'English'}

Available categories: ${context.available_categories.join(', ')}

When user describes a product, respond with JSON:
{
  "response": "Your friendly response",
  "search_query": "extracted search terms",
  "filters": {
    "category": "category_slug",
    "min_price": number,
    "max_price": number,
    "region_id": number
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content);
}

// ============================================
// IMAGE ANALYSIS (Core feature for image search)
// ============================================

interface ImageAnalysis {
  // Extracted product details
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  year?: string;
  color?: string;
  condition?: string;
  material?: string;
  size?: string;

  // Price estimation
  estimated_price_range?: {
    min: number;
    max: number;
    currency: string;
  };

  // For embedding generation (KEY FIELD)
  search_text: string;      // English: "2023 Mercedes GLE 350 white SUV"
  search_text_ar: string;   // Arabic: "مرسيدس GLE 350 أبيض 2023"

  // For AI chat response
  description: string;
  description_ar: string;
}

// Analyze image and extract structured JSON for search
export async function analyzeImageForSearch(
  imageUrl: string,
  country_code: string = 'KW'
): Promise<ImageAnalysis> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a product analyzer for a marketplace in ${country_code === 'KW' ? 'Kuwait' : 'Saudi Arabia'}.

Analyze images and extract structured information for search.
The search_text field is CRITICAL - it should combine all key attributes
into a natural sentence that will be converted to a vector embedding.

Categories: vehicles, electronics, property, fashion, furniture, services, jobs, other

Always respond with valid JSON.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            {
              type: 'text',
              text: `Analyze this product image and return JSON:
{
  "category": "category_slug",
  "subcategory": "optional",
  "brand": "if visible",
  "model": "if visible",
  "year": "if applicable",
  "color": "primary color",
  "condition": "new/like_new/good/fair/poor",
  "material": "if relevant",
  "size": "if relevant",
  "estimated_price_range": { "min": number, "max": number, "currency": "KWD" },
  "search_text": "Combine all attributes into English search phrase",
  "search_text_ar": "Arabic version of search_text",
  "description": "Brief English description",
  "description_ar": "Brief Arabic description"
}`,
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content!);
  });
}

// Combined function: Image → JSON → Embedding → Filters
export async function processImageForSearch(
  imageUrl: string,
  country_code: string,
  language: string = 'ar'
): Promise<{
  analysis: ImageAnalysis;
  embedding: number[];
  filters: Record<string, any>;
  chatResponse: string;
}> {
  // Step 1: Analyze image → structured JSON
  const analysis = await analyzeImageForSearch(imageUrl, country_code);

  // Step 2: Generate embedding from search_text
  const searchText = language === 'ar'
    ? analysis.search_text_ar
    : analysis.search_text;
  const embedding = await getTextEmbedding(searchText);

  // Step 3: Extract filters from analysis
  const filters: Record<string, any> = {};
  if (analysis.category) {
    filters.category_slug = analysis.category;
  }
  if (analysis.estimated_price_range?.max) {
    // Allow 20% above estimated max for better results
    filters.max_price = Math.round(analysis.estimated_price_range.max * 1.2);
  }

  // Step 4: Generate chat response
  const chatResponse = language === 'ar'
    ? analysis.description_ar
    : analysis.description;

  return { analysis, embedding, filters, chatResponse };
}

// Image analysis for SELLER listing creation (different from search)
export async function analyzeImageForListing(
  imageUrl: string,
  language: string,
  country_code: string = 'KW'
): Promise<{
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  category: string;
  suggested_price?: { min: number; max: number; currency: string };
}> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are helping a seller create a listing in ${country_code === 'KW' ? 'Kuwait' : 'Saudi Arabia'}.

Analyze this product image and provide:
1. A compelling title (both English and Arabic)
2. A detailed description (both English and Arabic)
3. The most appropriate category
4. Suggested price range in KWD

Categories: vehicles, electronics, property, fashion, furniture, services, other

Respond as JSON:
{
  "title": "English title",
  "title_ar": "Arabic title",
  "description": "English description",
  "description_ar": "Arabic description",
  "category": "category_slug",
  "suggested_price": { "min": number, "max": number, "currency": "KWD" }
}`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content!);
  });
}

// Content moderation
export async function moderateContent(
  title: string,
  description: string,
  imageUrls: string[],
  country_code: string
): Promise<{
  approved: boolean;
  reason?: string;
  flags: string[];
}> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a content moderator for a marketplace in ${country_code === 'KW' ? 'Kuwait' : 'Saudi Arabia'}.

Prohibited items:
- Alcohol and alcoholic beverages
- Pork and pork products
- Weapons and ammunition
- Drugs and narcotics
- Adult content
- Counterfeit goods
- Stolen items

Review the listing and respond with JSON:
{
  "approved": boolean,
  "reason": "reason if rejected",
  "flags": ["list", "of", "concerns"]
}`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Title: ${title}\nDescription: ${description}` },
          ...imageUrls.map(url => ({
            type: 'image_url' as const,
            image_url: { url },
          })),
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### 7.2 Qdrant Service Layer

```typescript
// File: src/lib/qdrant/client.ts

import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Helper: Check if collection exists (getCollection throws if not found)
async function collectionExists(name: string): Promise<boolean> {
  try {
    await qdrant.getCollection(name);
    return true;
  } catch (error: any) {
    if (error?.status === 404) return false;
    throw error;
  }
}

// Initialize collections on startup
export async function initializeCollections() {
  // Products collection (single collection for text/voice/image search)
  const exists = await collectionExists('products');

  if (!exists) {
    await qdrant.createCollection('products', {
      vectors: {
        size: 1536,  // OpenAI text-embedding-3-small
        distance: 'Cosine',
      },
      // Optimized for filtered search
      optimizers_config: {
        indexing_threshold: 10000,
      },
      // Enable on-disk storage for larger datasets
      on_disk_payload: true,
    });

    // Create payload indexes for filtered search
    const indexes = [
      { field_name: 'country_code', field_schema: 'keyword' as const },
      { field_name: 'category_slug', field_schema: 'keyword' as const },
      { field_name: 'price', field_schema: 'float' as const },
      { field_name: 'status', field_schema: 'keyword' as const },
      { field_name: 'region_id', field_schema: 'integer' as const },
    ];

    for (const index of indexes) {
      await qdrant.createPayloadIndex('products', index);
    }

    console.log('✅ Qdrant "products" collection initialized');
  }
}

// Add product to vector index
export async function indexProduct(
  productId: string,
  embedding: number[],
  payload: {
    product_id: string;
    seller_id: string;
    title: string;
    title_ar?: string;
    description?: string;
    price: number;
    currency: string;
    category_slug: string;
    country_code: string;
    region_id?: number;
    status: string;
    created_at: string;
  }
) {
  await qdrant.upsert('products', {
    wait: true,
    points: [
      {
        id: productId,
        vector: embedding,
        payload,
      },
    ],
  });
}

// Search products with filters
export async function searchProducts(
  queryEmbedding: number[],
  filters: {
    country_code: string;
    category_slug?: string;
    min_price?: number;
    max_price?: number;
    region_id?: number;
  },
  limit: number = 10
): Promise<Array<{ id: string; score: number; payload: any }>> {
  const must: any[] = [
    { key: 'country_code', match: { value: filters.country_code } },
    { key: 'status', match: { value: 'active' } },
  ];

  if (filters.category_slug) {
    must.push({ key: 'category_slug', match: { value: filters.category_slug } });
  }

  if (filters.region_id) {
    must.push({ key: 'region_id', match: { value: filters.region_id } });
  }

  const priceRange: any = {};
  if (filters.min_price !== undefined) priceRange.gte = filters.min_price;
  if (filters.max_price !== undefined) priceRange.lte = filters.max_price;
  if (Object.keys(priceRange).length > 0) {
    must.push({ key: 'price', range: priceRange });
  }

  const results = await qdrant.search('products', {
    vector: queryEmbedding,
    filter: { must },
    limit,
    with_payload: true,
  });

  return results.map(r => ({
    id: r.id as string,
    score: r.score,
    payload: r.payload,
  }));
}

// Delete product from index
export async function deleteProduct(productId: string) {
  await qdrant.delete('products', {
    wait: true,
    points: [productId],
  });
}
```

### 7.3 S3 Service Layer

```typescript
// File: src/lib/s3/client.ts

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,      // Required for moveFile function
  HeadObjectCommand,      // For checking if file exists
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

// Initialize S3 client (Bahrain region - closest to Kuwait)
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'me-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const CDN_URL = process.env.S3_CDN_URL!;

// Validate environment on startup
if (!BUCKET || !CDN_URL) {
  console.warn('⚠️ S3 environment variables not configured');
}

// Generate presigned URL for direct upload
export async function getPresignedUploadUrl(
  folder: 'products' | 'profiles' | 'temp',
  fileExtension: string,
  contentType: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const key = `${folder}/${uuid()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return {
    uploadUrl,
    key,
    publicUrl: `${CDN_URL}/${key}`,
  };
}

// Delete file from S3
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3.send(command);
}

// Move file from temp to permanent location
export async function moveFile(
  tempKey: string,
  permanentFolder: string,
  newFilename?: string
): Promise<string> {
  const filename = newFilename || tempKey.split('/').pop()!;
  const newKey = `${permanentFolder}/${filename}`;

  // Copy to new location
  const copyCommand = new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: encodeURIComponent(`${BUCKET}/${tempKey}`),
    Key: newKey,
  });
  await s3.send(copyCommand);

  // Delete from temp
  await deleteFile(tempKey);

  return `${CDN_URL}/${newKey}`;
}

// Check if file exists
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Generate public URL for a key
export function getPublicUrl(key: string): string {
  return `${CDN_URL}/${key}`;
}
```

---

## 8. File Structure

```
c:\Users\aliha\Kryptonn projects\dotit_devolx\
│
├── .env.example                    # Environment template
├── .env.local                      # Local development env
├── .env.production                 # Production env
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── ecosystem.config.js             # PM2 configuration
│
├── docs/
│   ├── TECHNICAL_IMPLEMENTATION_PLAN.md    # This file
│   ├── CLIENT_PROJECT_OVERVIEW.md          # Client-facing doc
│   ├── API_DOCUMENTATION.md                # API specs
│   └── PROGRESS.md                         # Development progress tracker
│
├── prisma/
│   ├── schema.prisma               # Prisma database schema
│   ├── seed.ts                     # Database seed script
│   └── migrations/                 # Prisma migrations (auto-generated)
│
├── scripts/
│   ├── setup-db.ts                 # Database setup script
│   ├── setup-qdrant.ts             # Qdrant collections setup
│   ├── seed-categories.ts          # Seed categories
│   └── test-ai.ts                  # Test AI integrations
│
├── public/
│   ├── locales/
│   │   ├── ar/
│   │   │   └── common.json         # Arabic translations
│   │   └── en/
│   │       └── common.json         # English translations
│   ├── icons/
│   └── images/
│
├── src/
│   ├── app/
│   │   ├── (chat)/
│   │   │   └── page.tsx            # Main chat page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (seller)/
│   │   │   ├── sell/page.tsx
│   │   │   └── my-listings/page.tsx
│   │   ├── product/
│   │   │   └── [id]/page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── api/                    # See section 5
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── providers.tsx
│   │
│   ├── components/
│   │   ├── ai-chat/                # See section 6.1
│   │   ├── product/
│   │   ├── seller/
│   │   ├── auth/
│   │   ├── location/
│   │   ├── ui/                     # shadcn components
│   │   └── layout/
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   └── openai.ts           # OpenAI service (chat, voice, vision, embeddings)
│   │   ├── db/
│   │   │   └── prisma.ts           # Prisma client singleton
│   │   ├── qdrant/
│   │   │   ├── client.ts           # Qdrant client
│   │   │   └── schema.ts           # Collection schemas
│   │   ├── s3/
│   │   │   └── client.ts           # S3 operations
│   │   ├── auth/
│   │   │   ├── jwt.ts              # JWT utilities
│   │   │   └── session.ts          # Session management
│   │   ├── i18n/
│   │   │   ├── config.ts           # i18n configuration
│   │   │   └── dictionaries.ts     # Translation loaders
│   │   ├── validation/
│   │   │   └── schemas.ts          # Zod schemas
│   │   └── utils.ts                # General utilities
│   │
│   ├── hooks/
│   │   ├── useChat.ts              # Chat state management
│   │   ├── useVoice.ts             # Voice recording
│   │   ├── useLocation.ts          # Geo-location
│   │   ├── useAuth.ts              # Auth state
│   │   └── useTranslation.ts       # i18n hook
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── LocationContext.tsx
│   │   └── LanguageContext.tsx
│   │
│   ├── types/
│   │   ├── api.ts                  # API types
│   │   ├── database.ts             # DB entity types
│   │   └── chat.ts                 # Chat types
│   │
│   └── middleware.ts               # Next.js middleware
│
└── tests/
    ├── e2e/
    │   ├── chat.spec.ts            # Chat flow tests
    │   ├── seller.spec.ts          # Seller flow tests
    │   └── auth.spec.ts            # Auth flow tests
    └── unit/
        ├── ai.test.ts              # AI service tests
        └── qdrant.test.ts          # Qdrant tests
```

---

## 9. Sprint Breakdown

### Sprint 1: Infrastructure Setup (Days 1-2)

| Task | Description | Owner | Hours | Status |
|------|-------------|-------|-------|--------|
| 1.1 | Install PostgreSQL on Windows Server | DevOps | 2 | ⏳ |
| 1.2 | Set up Prisma schema (`prisma/schema.prisma`) | Backend | 2 | ✅ |
| 1.3 | Create Prisma client (`src/lib/db/prisma.ts`) | Backend | 1 | ✅ |
| 1.4 | Install Qdrant (Docker or native) | DevOps | 2 | ⏳ |
| 1.5 | Create Qdrant client (`src/lib/qdrant/client.ts`) | Backend | 2 | ✅ |
| 1.6 | Configure S3 bucket + CORS | DevOps | 1 | ⏳ |
| 1.7 | Create S3 client (`src/lib/s3/client.ts`) | Backend | 2 | ✅ |
| 1.8 | Create OpenAI service (`src/lib/ai/openai.ts`) | Backend | 2 | ✅ |
| 1.9 | Set up environment variables (`.env.example`) | Backend | 1 | ✅ |
| 1.10 | Create seed script (`prisma/seed.ts`) | Backend | 1 | ✅ |
| 1.11 | Update health check endpoint | Backend | 1 | ✅ |
| 1.12 | Test all connections | All | 1 | ⏳ |

**Deliverable:** Working infrastructure with all services connected

---

### Sprint 2: Core Backend APIs (Days 3-5)

| Task | Description | Owner | Hours | Status |
|------|-------------|-------|-------|--------|
| 2.1 | Auth APIs (register, login, logout, me) | Backend | 4 | ✅ |
| 2.2 | JWT auth utilities (`src/lib/auth/jwt.ts`) | Backend | 2 | ✅ |
| 2.3 | Products CRUD API (GET, POST, PUT, DELETE) | Backend | 4 | ✅ |
| 2.4 | S3 presigned URL API | Backend | 2 | ⏳ |
| 2.5 | OpenAI integration (embeddings, chat, vision) | AI Dev | 4 | ✅ |
| 2.6 | Whisper integration (voice transcription) | AI Dev | 3 | ✅ |
| 2.7 | Qdrant indexing on product create | Backend | 3 | ✅ |
| 2.8 | AI search API (`/api/chat`) | Backend | 4 | 🔄 |
| 2.9 | Content moderation flow | AI Dev | 3 | ✅ |
| 2.10 | Geo/location APIs | Backend | 2 | ⏳ |

**Status Legend:** ✅ Done | 🔄 In Progress | ⏳ Pending

**Deliverable:** All backend APIs functional

---

### Sprint 3: Chat Interface UI (Days 6-8)

| Task | Description | Owner | Hours |
|------|-------------|-------|-------|
| 3.1 | ChatInterface container component | Frontend | 3 |
| 3.2 | MessageBubble component | Frontend | 2 |
| 3.3 | ChatInput with text input | Frontend | 2 |
| 3.4 | VoiceButton component | Frontend | 4 |
| 3.5 | ProductCard component | Frontend | 3 |
| 3.6 | ProductCarousel in messages | Frontend | 2 |
| 3.7 | WelcomeScreen with prompts | Frontend | 2 |
| 3.8 | Connect to chat API | Frontend | 3 |
| 3.9 | Voice recording + transcription | Frontend | 4 |
| 3.10 | Image upload in chat | Frontend | 3 |

**Deliverable:** Functional chat interface with AI responses

---

### Sprint 4: Seller Flow & Product Details (Days 9-10)

| Task | Description | Owner | Hours |
|------|-------------|-------|-------|
| 4.1 | Seller registration flow | Frontend | 3 |
| 4.2 | Product listing form | Frontend | 4 |
| 4.3 | Multi-image upload to S3 | Frontend | 3 |
| 4.4 | AI-assisted field suggestions | Frontend | 3 |
| 4.5 | Product detail page | Frontend | 3 |
| 4.6 | Call Seller button (tel: link) | Frontend | 1 |
| 4.7 | WhatsApp button | Frontend | 1 |
| 4.8 | My Listings page | Frontend | 2 |
| 4.9 | Edit/Delete listing | Frontend | 2 |

**Deliverable:** Complete seller flow

---

### Sprint 5: Localization & Polish (Days 11-12)

| Task | Description | Owner | Hours |
|------|-------------|-------|-------|
| 5.1 | Arabic translations (all strings) | Frontend | 4 |
| 5.2 | RTL layout support | Frontend | 3 |
| 5.3 | Language switcher | Frontend | 2 |
| 5.4 | Location selector component | Frontend | 2 |
| 5.5 | Auto-detect location | Frontend | 2 |
| 5.6 | Kuwait-specific content rules | Backend | 2 |
| 5.7 | Error messages in Arabic | Frontend | 2 |
| 5.8 | UI polish and responsive fixes | Frontend | 4 |

**Deliverable:** Fully localized app (AR/EN)

---

### Sprint 6: Testing & Deployment (Days 13-14)

| Task | Description | Owner | Hours |
|------|-------------|-------|-------|
| 6.1 | E2E tests for chat flow | QA | 3 |
| 6.2 | E2E tests for seller flow | QA | 3 |
| 6.3 | API integration tests | QA | 2 |
| 6.4 | Load testing | QA | 2 |
| 6.5 | Security review | DevOps | 2 |
| 6.6 | PM2 configuration | DevOps | 1 |
| 6.7 | NGINX configuration | DevOps | 2 |
| 6.8 | SSL certificate setup | DevOps | 1 |
| 6.9 | Production deployment | DevOps | 2 |
| 6.10 | Smoke testing on production | All | 2 |

**Deliverable:** App live on production

---

## 10. Deployment Guide

### 10.1 Windows Server Setup

```powershell
# 1. Install Node.js 20 LTS
# Download from https://nodejs.org/

# 2. Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

# 3. Clone and build application
cd C:\inetpub\wwwroot
git clone <repo-url> pickpic
cd pickpic
npm install
npm run build

# 4. Create PM2 ecosystem file
# ecosystem.config.js already exists

# 5. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 6. Verify
pm2 status
pm2 logs pickpic
```

### 10.2 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'pickpic',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: 'C:\\inetpub\\wwwroot\\pickpic',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '1G',
      error_file: 'C:\\inetpub\\wwwroot\\pickpic\\logs\\error.log',
      out_file: 'C:\\inetpub\\wwwroot\\pickpic\\logs\\out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

### 10.3 NGINX Configuration (Windows)

```nginx
# nginx.conf

worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    upstream nextjs {
        server 127.0.0.1:3000;
    }

    server {
        listen 80;
        server_name pickpic.com www.pickpic.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name pickpic.com www.pickpic.com;

        ssl_certificate      C:/nginx/ssl/pickpic.crt;
        ssl_certificate_key  C:/nginx/ssl/pickpic.key;

        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files caching
        location /_next/static/ {
            proxy_pass http://nextjs;
            proxy_cache_valid 60m;
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }
}
```

---

## 11. Testing Checklist

### 11.1 Buyer Flow

- [ ] Open app → See chat interface
- [ ] Type "I want to buy a car" → Get AI response with product cards
- [ ] Use voice input in Arabic → Transcript appears, AI responds
- [ ] Use voice input in English → Works correctly
- [ ] Upload car image → AI finds similar products
- [ ] Click product card → See full details
- [ ] Click "Call Seller" → Phone app opens with number
- [ ] Click "WhatsApp" → WhatsApp opens with number
- [ ] Switch language AR ↔ EN → UI updates correctly
- [ ] Switch location → Products filter by country

### 11.2 Seller Flow

- [ ] Register as new user
- [ ] Upgrade to seller (add phone number)
- [ ] Create new listing with images
- [ ] AI suggests title/description from images
- [ ] Submit listing → Passes moderation
- [ ] View listing in "My Listings"
- [ ] Edit listing
- [ ] Delete listing
- [ ] Try uploading prohibited item → Rejected with reason

### 11.3 AI & Search

- [ ] Text search returns relevant results
- [ ] Voice search works in Arabic
- [ ] Voice search works in English
- [ ] Image search finds similar products
- [ ] Filters (price, location) work correctly
- [ ] Prohibited content is rejected
- [ ] AI responds in user's language

### 11.4 Performance

- [ ] Chat response < 3 seconds
- [ ] Voice transcription < 2 seconds
- [ ] Image upload < 5 seconds
- [ ] Product search < 1 second
- [ ] Page load < 2 seconds

---

## Appendix A: Package Dependencies

```json
{
  "name": "pickpic",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev --turbopack -p 9002",
    "build": "cross-env NODE_ENV=production next build",
    "start": "cross-env NODE_ENV=production next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",

    // Database (Prisma ORM)
    "@prisma/client": "^5.10.0",
    "@qdrant/js-client-rest": "^1.7.0",

    // AWS S3
    "@aws-sdk/client-s3": "^3.500.0",
    "@aws-sdk/s3-request-presigner": "^3.500.0",

    // AI (OpenAI for all: chat, voice, vision, embeddings)
    "openai": "^4.28.0",

    // UI Components (shadcn/ui)
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    "@radix-ui/react-scroll-area": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "tailwindcss-animate": "^1.0.7",
    "lucide-react": "^0.300.0",
    "embla-carousel-react": "^8.0.0",

    // Auth & Security
    "jose": "^5.2.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.0",

    // Utilities
    "uuid": "^9.0.0",
    "date-fns": "^3.0.0",
    "sanitize-html": "^2.11.0"
  },
  "devDependencies": {
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/uuid": "^9.0.0",
    "@types/sanitize-html": "^2.9.0",
    "@playwright/test": "^1.40.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.0.0"
  }
}
```

---

## Appendix B: Environment Variables Template

```env
# .env.example

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:9002
PORT=3000

# ============================================
# POSTGRESQL
# ============================================
DATABASE_URL=postgresql://pickpic_user:password@localhost:5432/pickpic
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pickpic
DB_USER=pickpic_user
DB_PASSWORD=your_secure_password

# ============================================
# QDRANT (Vector Database)
# ============================================
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# ============================================
# AWS S3
# ============================================
AWS_REGION=me-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=pickpic-media
S3_CDN_URL=https://pickpic-media.s3.me-south-1.amazonaws.com

# ============================================
# OPENAI (All AI features)
# ============================================
OPENAI_API_KEY=sk-your-openai-key

# ============================================
# JWT AUTH
# ============================================
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# ============================================
# REGIONAL DEFAULTS
# ============================================
DEFAULT_COUNTRY=KW
DEFAULT_CURRENCY=KWD
DEFAULT_LANGUAGE=ar
```

---

## Appendix C: Critical Bug Fixes Applied

| Issue | Location | Fix Applied |
|-------|----------|-------------|
| Missing `CopyObjectCommand` import | S3 client | Added to imports |
| `qdrant.collectionExists()` doesn't exist | Qdrant client | Replaced with `getCollection()` + try-catch |
| No retry logic for OpenAI | OpenAI service | Added `withRetry()` wrapper |
| No error handling in AI calls | OpenAI service | Added retry with exponential backoff |
| Switched from raw `pg` to Prisma ORM | DB client | Type-safe queries, auto connection pooling |
| Removed MSSQL and Genkit dependencies | package.json | Clean slate for PostgreSQL + OpenAI |
| **`gpt-5.2` invalid model** | `src/lib/ai/openai.ts` analyzeImageForListing() | Changed to `"gpt-4o"` — sell flow was broken |
| **JWT fallback secret** | `src/lib/auth/jwt.ts` | Removed fallback; throws if JWT_SECRET not set (≥32 chars) |
| **Empty assistant message saved** | `src/app/api/chat/route.ts` | Added fallback content when assistantResponse is empty |
| **SSE reader not cancelled on unmount** | `chat-interface.tsx` | Added AbortController + cleanup useEffect |
| **Anonymous session open access** | `src/app/api/chat/sessions/[id]/route.ts` | Added sessionToken header check for anonymous sessions |
| **Product update missing Qdrant reindex** | `src/app/api/products/[id]/route.ts` | Added async reindex after DB update |
| **No rate limiting on auth endpoints** | login/register routes | Wired existing `aiLimiter` (20 req/hr/IP) |
| **No input validation on seller profile PUT** | `src/app/api/seller/profile/route.ts` | Added Zod schema `updateSellerSchema` |

---

## Appendix D: Technology Migration Summary

| Old Stack | New Stack | Reason |
|-----------|-----------|--------|
| MSSQL | PostgreSQL | Open source, better JSON/Array support |
| Genkit + Firebase | OpenAI SDK | Simpler, direct API access |
| Raw SQL queries | Prisma ORM | Type safety, migrations, excellent DX |
| Multiple embedding models | text-embedding-3-small | Unified vector space |
| Separate image collection | Single products collection | Consistent search results |

---

*Document Version: 1.4*
*Last Updated: February 21, 2026*
