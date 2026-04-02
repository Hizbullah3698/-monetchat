import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { createInquirySchema } from '@/lib/validation/inquiry';
import { ValidationError } from '@/lib/api/errors/AppError';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { EventLogger } from '@/lib/services/event-logger.service';
import { NotificationService } from '@/services/notification.service';

// POST /api/inquiries - buyer creates inquiry
export const POST = createApiHandler(async (_req, { body, user }) => {
  const { productId, message } = body;

  const product = await prisma.product.findFirst({
    where: { id: productId, status: 'active', deletedAt: null },
    select: { id: true, sellerId: true, title: true },
  });
  if (!product) {
    throw new ValidationError('Product is not available for inquiries');
  }

  // Prevent seller from inquiring own product
  if (product.sellerId === user!.userId) {
    throw new ValidationError('Cannot inquire on your own product');
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      productId,
      buyerId: user!.userId,
      sellerId: product.sellerId,
      message,
      status: 'open',
    },
    include: {
      product: { select: { title: true } },
    },
  });

  // fire-and-forget logging
  EventLogger.log('inquiry_created', {
    userId: user!.userId,
    entityType: 'product',
    entityId: productId,
    metadata: { inquiryId: inquiry.id },
  }).catch(() => {});

  // notify seller (system notification)
  NotificationService.createSystemAndAudit(
    product.sellerId,
    'New inquiry received',
    `A buyer has inquired about your product "${product.title}"`,
    'INFO',
    { productId, inquiryId: inquiry.id },
    user!.userId,
  ).catch(() => {});

  return {
    message: 'Inquiry submitted',
    inquiryId: inquiry.id,
  };
}, { requireAuth: true, bodySchema: createInquirySchema });

// GET /api/inquiries - buyer list their inquiries
export const GET = createApiHandler(async (_req, { query, user }) => {
  const { skip, take } = getPaginationParams(query);

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where: { buyerId: user!.userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            status: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        seller: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.inquiry.count({ where: { buyerId: user!.userId } }),
  ]);

  const data = items.map((i) => ({
    id: i.id,
    status: i.status,
    message: i.message,
    createdAt: i.createdAt,
    product: {
      id: i.product.id,
      title: i.product.title,
      price: i.product.price,
      currency: i.product.currency,
      status: i.product.status,
      imageUrl: i.product.images[0]?.url ?? null,
    },
    seller: i.seller,
  }));

  return formatPaginatedResponse(data, total, query);
}, { requireAuth: true, querySchema: paginationSchema });
