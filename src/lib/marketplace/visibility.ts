import { Prisma } from '@prisma/client';

export function buildPublicProductWhere(
  overrides: Prisma.ProductWhereInput = {}
): Prisma.ProductWhereInput {
  return {
    status: 'active',
    deletedAt: null,
    seller: {
      deletedAt: null,
    },
    ...overrides,
  };
}
