import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/api/errors/AppError';
import { getKeyFromUrl, moveFile } from '@/lib/s3/client';
import { AuditLogService } from '@/lib/services/audit-service';
import { CacheService } from '@/lib/cache';

const MAX_IMAGES_PER_PRODUCT = 10;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const paramsSchema = z.object({
  id: z.string().uuid(),
});

const imageSchema = z.object({
  url: z.string().url(),
  key: z.string().min(3),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const requestSchema = z.object({
  images: z.array(imageSchema).min(1).max(5),
});

export const POST = createApiHandler(async (req, { params, body, user }) => {
    const { id: productId } = paramsSchema.parse(params ?? {});
    const { images } = requestSchema.parse(body);

    // Check product ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true, deletedAt: true },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundError('Product not found');
    }
    if (product.sellerId !== user!.userId) {
      throw new ForbiddenError('Forbidden');
    }

    // Enforce max images
    const existingCount = await prisma.productImage.count({ where: { productId } });
    if (existingCount + images.length > MAX_IMAGES_PER_PRODUCT) {
      throw new ValidationError(`Too many images. Max ${MAX_IMAGES_PER_PRODUCT} per product.`);
    }

    // Process and move images to products folder if needed
    const records: {
      productId: string;
      url: string;
      s3Key: string;
      isPrimary: boolean;
      sortOrder: number;
    }[] = [];

    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      const keyFromInput = img.key || getKeyFromUrl(img.url);
      const key = keyFromInput ?? '';
      const ext = key.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXT.includes(ext)) {
        throw new ValidationError('Invalid image type');
      }

      let finalKey = key;
      // If uploaded to temp/, move to products/
      if (key.startsWith('temp/')) {
        const filename = key.split('/').pop()!;
        const movedUrl = await moveFile(key, 'products', filename);
        finalKey = getKeyFromUrl(movedUrl) || key.replace(/^temp\//, 'products/');
      }

      const finalUrl = img.url.startsWith('http')
        ? img.url
        : `https://${process.env.S3_CDN_URL ?? ''}/${finalKey}`;

      records.push({
        productId,
        url: finalUrl,
        s3Key: finalKey,
        isPrimary: !!img.isPrimary,
        sortOrder: img.sortOrder ?? existingCount + idx,
      });
    }

    // If any image marked as primary, clear existing primaries first
    const hasPrimary = records.some((r) => r.isPrimary);
    if (hasPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    await prisma.productImage.createMany({ data: records });

    // Ensure one primary exists
    if (!hasPrimary) {
      const primary = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: [
          { isPrimary: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      });
      if (primary && !primary.isPrimary) {
        await prisma.productImage.update({
          where: { id: primary.id },
          data: { isPrimary: true },
        });
      }
    }

    const updatedImages = await prisma.productImage.findMany({
      where: { productId },
      orderBy: [
        { isPrimary: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    await CacheService.del(`products:detail:${productId}`);
    await CacheService.invalidatePattern('products:list:*');

    await AuditLogService.logAction({
      userId: user!.userId,
      action: 'UPDATE',
      entityName: 'Product',
      entityId: productId,
      changes: {
        imageCountAdded: records.length,
        setPrimary: hasPrimary,
      },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return {
      message: 'Images added',
      images: updatedImages.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
    };
}, {
  requireAuth: true,
  bodySchema: requestSchema,
  rateLimit: {
    name: 'product-image-upload',
    points: 20,
    duration: 60 * 15,
  },
});
