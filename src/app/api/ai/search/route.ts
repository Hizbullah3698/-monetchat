import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/jwt';
import { EventLogger } from '@/lib/services/event-logger.service';
import {
  callOllamaFilters,
  parseFiltersFromText,
  searchProductsWithCriteria,
} from '@/lib/ai/marketplace-search';

const requestSchema = z.object({
  query: z.string().trim().min(1),
  country: z.string().length(2).default('KW'),
  language: z.enum(['ar', 'en']).default('ar'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, country, language, page, limit } = requestSchema.parse(body);
    const user = await getCurrentUser(req).catch(() => null);

    // Call Ollama to extract structured filters
    let criteria;
    try {
      const content = await callOllamaFilters(query);
      criteria = parseFiltersFromText(content, query);
    } catch (err) {
      console.warn('Ollama parse failed, using fallback:', err);
      criteria = parseFiltersFromText('', query);
    }

    const response = await searchProductsWithCriteria(criteria, { page, limit, countryCode: country });

    // Log search
    await prisma.searchLog.create({
      data: {
        userId: user?.userId,
        queryText: query,
        queryType: 'text',
        filters: criteria,
        resultCount: response.meta.pagination.total,
        countryCode: country,
      },
    }).catch(() => {});

    EventLogger.log('chat_search', { userId: user?.userId, metadata: { query, filters: criteria, total: response.meta.pagination.total } }).catch(() => {});

    return NextResponse.json(response);
  } catch (error) {
    EventLogger.log('ai_error', { metadata: { route: '/api/ai/search', error: String(error) } }).catch(() => {});
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('AI search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
