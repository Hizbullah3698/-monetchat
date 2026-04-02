import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { listOrderQuerySchema } from '@/lib/validation/order';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

// GET /api/seller/orders - list seller orders
export const GET = createApiHandler(async (_req, { query, user }) => {
  const { status, page, limit } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = { sellerId: user!.userId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, title: true, price: true, currency: true } },
        buyer: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const data = orders.map((o) => ({
    id: o.id,
    status: o.status,
    price: o.price,
    currency: o.currency,
    quantity: o.quantity,
    createdAt: o.createdAt,
    product: o.product,
    buyer: o.buyer,
  }));

  return formatPaginatedResponse(data, total, { page, limit, order: 'desc' });
}, { requireAuth: true, querySchema: listOrderQuerySchema });
