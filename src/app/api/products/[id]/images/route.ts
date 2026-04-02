import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getKeyFromUrl, moveFile } from '@/lib/s3/client';

const MAX_IMAGES_PER_PRODUCT = 10;
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const imageSchema = z.object({
  url: z.string().url(),
  key: z.string().min(3),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const requestSchema = z.object({
  images: z.array(imageSchema).min(1).max(5),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await ctx.params;
    const body = await req.json();
    const { images } = requestSchema.parse(body);

    // Check product ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (product.sellerId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Enforce max images
    const existingCount = await prisma.productImage.count({ where: { productId } });
    if (existingCount + images.length > MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Too many images. Max ${MAX_IMAGES_PER_PRODUCT} per product.` },
        { status: 400 }
      );
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
        return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
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

    return NextResponse.json({
      message: 'Images added',
      images: updatedImages.map((img) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Add product images error:', error);
    return NextResponse.json({ error: 'Failed to add images' }, { status: 500 });
  }
}
