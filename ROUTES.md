
# PickPic Frontend Architecture

## Directory Structure
- `src/app/(marketplace)`: Core marketplace (Home, Search, Product Details)
- `src/app/(auth)`: Authentication (Login, Register, Reset Password)
- `src/app/(account)`: User Account (Dashboard, Billing, Settings)
- `src/app/(seller)`: Seller Tools (Listings, Analytics) - *To be implemented in Step 4*
- `src/app/(support)`: Help Center & Tickets
- `src/app/(admin)`: Admin Dashboard
- `src/app/(public)`: Static pages (FAQ, Terms)
- `src/app/api`: Backend API Routes

## Routes Map

| Route | Description | Auth Required | Role |
|-------|-------------|---------------|------|
| `/` | Marketplace Home | No | Any |
| `/search` | Product Search (Text/Visual) | No | Any |
| `/p/[id]` | Product Detail | No | Any |
| `/login` | User Login | No | Any |
| `/register` | User Registration | No | Any |
| `/account` | User Dashboard | Yes | Buyer/Seller |
| `/sell` | Seller Dashboard (Redirects) | Yes | Seller |
| `/sell/new` | Create Listing | Yes | Seller |
| `/support` | Help Center | No | Any |
| `/admin` | Admin Dashboard | Yes | Admin |

## Tech Stack
- Next.js 15 (App Router)
- Tailwind CSS + shadcn/ui
- TypeScript
- Zod + React Hook Form
- Context API (Auth)
- `src/services/api.ts` (Typed Fetch Wrapper)

## Running the Frontend
1. `npm install`
2. `npm run dev`
3. Visit `http://localhost:9002`

