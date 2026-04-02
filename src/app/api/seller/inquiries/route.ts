import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { sellerUpdateInquirySchema } from '@/lib/validation/inquiry';
import { ValidationError } from '@/lib/api/errors/AppError';
import { NotificationService } from '@/services/notification.service';
import { EventLogger } from '@/lib/services/event-logger.service';

// GET /api/seller/inquiries - list inquiries for seller's products
export const GET = createApiHandler(async (_req, { query, user }) => {
  const { skip, take } = getPaginationParams(query);

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where: { sellerId: user!.userId },
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
        buyer: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.inquiry.count({ where: { sellerId: user!.userId } }),
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
    buyer: i.buyer,
  }));

  return formatPaginatedResponse(data, total, query);
}, { requireAuth: true, querySchema: paginationSchema });

// PATCH /api/seller/inquiries/:id - update status
export const PATCH = createApiHandler(async (req, { params, body, user }) => {
  const { id } = params;
  const data = body;

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: { sellerId: true, status: true },
  });
  if (!inquiry || inquiry.sellerId !== user!.userId) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // simple transitions: allow any to responded/closed
  const parsed = sellerUpdateInquirySchema.parse(data);

  const updated = await prisma.inquiry.update({
    where: { id },
    data: { status: parsed.status },
  });

  NotificationService.createSystemAndAudit(
    inquiry.buyerId!,
    'Inquiry update',
    `Seller updated your inquiry to "${parsed.status}"`,
    'INFO',
    { inquiryId: id, status: parsed.status },
    user?.userId,
  ).catch(() => {});

  EventLogger.log('inquiry_created', {
    userId: user?.userId,
    entityType: 'inquiry',
    entityId: id,
    metadata: { status: parsed.status },
  }).catch(() => {});

  return { message: 'Inquiry updated', status: updated.status };
}, { requireAuth: true, bodySchema: sellerUpdateInquirySchema });
