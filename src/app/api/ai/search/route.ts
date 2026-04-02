import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/jwt';
import { EventLogger } from '@/lib/services/event-logger.service';
import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
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

export const POST = createApiHandler(async (req: NextRequest, { body }) => {
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
        filters: criteria as unknown as Prisma.InputJsonValue,
        resultCount: response.meta.pagination.total,
        countryCode: country,
      },
    }).catch(() => {});

    EventLogger.log('chat_search', { userId: user?.userId, metadata: { query, filters: criteria, total: response.meta.pagination.total } }).catch(() => {});

    return response;
}, {
  bodySchema: requestSchema,
  rateLimit: {
    name: 'ai-marketplace-search',
    points: 20,
    duration: 60,
  },
});
