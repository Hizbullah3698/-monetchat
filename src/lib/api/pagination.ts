import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

type PaginationInput = Partial<PaginationQuery>;

export function getPaginationParams(query: PaginationInput) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
}

export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  query: PaginationInput
): PaginatedResult<T> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  return {
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

/**
 * Generic filter parser for Prisma
 * Supports filter[field]=value
 */
export function parseFilters(query: Record<string, any>, allowedFields: string[]) {
  const filters: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^filter\[(.+)\]$/);
    if (match) {
      const field = match[1];
      if (allowedFields.includes(field)) {
        filters[field] = value;
      }
    }
  }
  
  return filters;
}
