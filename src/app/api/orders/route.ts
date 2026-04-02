import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { createOrderSchema, listOrderQuerySchema } from '@/lib/validation/order';
import { ValidationError } from '@/lib/api/errors/AppError';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { EventLogger } from '@/lib/services/event-logger.service';

// POST /api/orders - create order intent (buyer)
export const POST = createApiHandler(async (_req, { body, user }) => {
  const { productId, quantity } = body;

  const product = await prisma.product.findFirst({
    where: { id: productId, status: 'active', deletedAt: null },
    select: {
      id: true,
      sellerId: true,
      price: true,
      currency: true,
      title: true,
    },
  });
  if (!product) throw new ValidationError('Product not available');
  if (product.sellerId === user!.userId) throw new ValidationError('Cannot order your own product');

  const order = await prisma.order.create({
    data: {
      buyerId: user!.userId,
      sellerId: product.sellerId,
      productId: product.id,
      status: 'pending_payment',
      price: product.price,
      currency: product.currency,
      quantity,
    },
  });

  EventLogger.log('product_created', {
    userId: user!.userId,
    entityType: 'order',
    entityId: order.id,
    metadata: { productId, quantity },
  }).catch(() => {});

  return {
    message: 'Order intent created',
    order: {
      id: order.id,
      status: order.status,
      price: order.price,
      currency: order.currency,
      quantity: order.quantity,
      productId: order.productId,
    },
  };
}, { requireAuth: true, bodySchema: createOrderSchema });

// GET /api/orders - list buyer orders
export const GET = createApiHandler(async (_req, { query, user }) => {
  const { status, page, limit } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = { buyerId: user!.userId };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, title: true, price: true, currency: true },
        },
        seller: {
          select: { id: true, name: true },
        },
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
    seller: o.seller,
  }));

  return formatPaginatedResponse(data, total, { page, limit, order: 'desc' });
}, { requireAuth: true, querySchema: listOrderQuerySchema });
