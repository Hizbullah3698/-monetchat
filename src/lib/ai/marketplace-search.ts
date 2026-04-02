import { prisma } from '@/lib/db/prisma';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

const ALLOWED_SORT = ['newest', 'oldest', 'price_asc', 'price_desc', 'popular'] as const;
type SortOption = (typeof ALLOWED_SORT)[number];

export interface SearchCriteria {
  keywords: string[];
  categorySlug: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  condition: string | null;
  regionId: number | null;
  sort: SortOption | null;
}

export const MARKET_SEARCH_SYSTEM_PROMPT = `
You are a marketplace query parser.
Given a free-text search, output a compact JSON object ONLY, no prose.
Shape:
{
 "keywords": ["..."],           // important tokens
 "categorySlug": "vehicles|electronics|property|fashion|furniture|services|jobs|other" | null,
 "minPrice": number|null,
 "maxPrice": number|null,
 "condition": "new|like_new|good|fair|poor"|null,
 "regionId": number|null,
 "sort": "newest|price_asc|price_desc|popular"|null
}
If a field is unknown, set it to null. Do not invent categories if uncertain.
`;

export async function callOllamaFilters(query: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.OLLAMA_API_KEY || '',
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_CHAT_MODEL,
        messages: [
          { role: 'system', content: MARKET_SEARCH_SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

export function parseFiltersFromText(text: string, fallbackQuery: string): SearchCriteria {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const slice = jsonStart >= 0 && jsonEnd >= jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;
    const parsed = JSON.parse(slice);
    return {
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length ? parsed.keywords : [fallbackQuery],
      categorySlug: parsed.categorySlug ?? null,
      minPrice: parsed.minPrice ?? null,
      maxPrice: parsed.maxPrice ?? null,
      condition: parsed.condition ?? null,
      regionId: parsed.regionId ?? null,
      sort: parsed.sort ?? 'newest',
    };
  } catch {
    return {
      keywords: [fallbackQuery],
      categorySlug: null,
      minPrice: null,
      maxPrice: null,
      condition: null,
      regionId: null,
      sort: 'newest',
    };
  }
}

export async function searchProductsWithCriteria(
  criteria: SearchCriteria,
  opts: { page: number; limit: number; countryCode?: string },
) {
  const { page, limit, countryCode = 'KW' } = opts;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = {
    status: 'active',
    deletedAt: null,
    countryCode,
  };

  if (criteria.categorySlug) where.category = { slug: criteria.categorySlug };
  if (criteria.regionId) where.regionId = criteria.regionId;
  if (criteria.condition) where.condition = criteria.condition;
  if (criteria.minPrice || criteria.maxPrice) {
    where.price = {};
    if (criteria.minPrice) where.price.gte = Number(criteria.minPrice);
    if (criteria.maxPrice) where.price.lte = Number(criteria.maxPrice);
  }
  if (criteria.keywords?.length) {
    where.OR = criteria.keywords.map((k: string) => ({
      OR: [
        { title: { contains: k, mode: 'insensitive' } },
        { description: { contains: k, mode: 'insensitive' } },
      ],
    }));
  }

  let orderBy: any = { createdAt: 'desc' };
  switch (criteria.sort) {
    case 'price_asc':
      orderBy = { price: 'asc' };
      break;
    case 'price_desc':
      orderBy = { price: 'desc' };
      break;
    case 'popular':
      orderBy = { viewCount: 'desc' };
      break;
    case 'oldest':
      orderBy = { createdAt: 'asc' };
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        category: { select: { slug: true, name: true, nameAr: true } },
        seller: {
          select: {
            businessName: true,
            isVerified: true,
            rating: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
        region: { select: { name: true, nameAr: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    condition: p.condition,
    imageUrl: p.images[0]?.url || null,
    category: p.category,
    region: p.region,
    seller: {
      name: p.seller.businessName || p.seller.user.name,
      avatarUrl: p.seller.user.avatarUrl,
      rating: p.seller.rating,
      isVerified: p.seller.isVerified,
    },
    createdAt: p.createdAt,
  }));

  return formatPaginatedResponse(data, total, { page, limit, order: 'desc' });
}
