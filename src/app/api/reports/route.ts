import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { createReportSchema } from '@/lib/validation/report';
import { ValidationError } from '@/lib/api/errors/AppError';

const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 5;

export const POST = createApiHandler(async (req, { body, user }) => {
  const { targetType, targetId, reason, notes } = body;

  // Validate target exists and is reportable
  if (targetType === 'product') {
    const product = await prisma.product.findFirst({
      where: { id: targetId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new ValidationError('Product not found');
  } else if (targetType === 'seller') {
    const seller = await prisma.seller.findUnique({ where: { userId: targetId } });
    if (!seller) throw new ValidationError('Seller not found');
  }

  // Rate limit: max 5 reports per user per window
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000);
  const recentCount = await prisma.report.count({
    where: {
      reporterId: user!.userId,
      createdAt: { gte: since },
    },
  });
  if (recentCount >= RATE_LIMIT_MAX) {
    throw new ValidationError('Too many reports, please wait a bit.');
  }

  // Prevent duplicate active report on same target by same user
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: user!.userId,
      targetType,
      targetId,
      status: 'pending',
    },
  });
  if (existing) {
    return {
      message: 'Report already submitted',
      reportId: existing.id,
    };
  }

  const report = await prisma.report.create({
    data: {
      reporterId: user!.userId,
      targetType,
      targetId,
      reason,
      notes,
      status: 'pending',
    },
  });

  return { message: 'Report submitted', reportId: report.id };
}, { requireAuth: true, bodySchema: createReportSchema });
