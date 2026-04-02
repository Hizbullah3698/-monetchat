import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { formatPaginatedResponse, getPaginationParams, paginationSchema } from '@/lib/api/pagination';

export const GET = createApiHandler(async (_req, { query }) => {
  const { skip, take } = getPaginationParams(query);

  const where = { status: 'pending' as const };

  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            countryCode: true,
            regionId: true,
          },
        },
      },
    }),
    prisma.seller.count({ where }),
  ]);

  return formatPaginatedResponse(
    sellers.map((s) => ({
      userId: s.userId,
      businessName: s.businessName,
      phonePublic: s.phonePublic,
      whatsappNumber: s.whatsappNumber,
      isProfileComplete: s.isProfileComplete,
      createdAt: s.createdAt,
      user: s.user,
    })),
    total,
    query,
  );
}, { roles: ['admin'], querySchema: paginationSchema });
