// GET /api/chats/[id]/messages - Load messages for a chat session
// POST /api/chats/[id]/messages - Persist publish action (clear draft + save published)

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: user.userId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Load all messages for this session
    const dbMessages = await prisma.chatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    });

    // Collect all product IDs from assistant messages
    const allProductIds = dbMessages
      .filter((m) => m.productIds.length > 0)
      .flatMap((m) => m.productIds);

    // Fetch product data if any exist
    let productsMap: Record<string, Record<string, unknown>> = {};
    if (allProductIds.length > 0) {
      const uniqueIds = [...new Set(allProductIds)];
      const products = await prisma.product.findMany({
        where: { id: { in: uniqueIds } },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          seller: {
            select: {
              businessName: true,
              phonePublic: true,
              whatsappNumber: true,
              user: { select: { name: true } },
            },
          },
          region: { select: { name: true, nameAr: true } },
          category: { select: { slug: true, name: true, nameAr: true } },
        },
      });

      productsMap = Object.fromEntries(
        products.map((p) => [
          p.id,
          {
            id: p.id,
            title: p.title,
            title_ar: p.titleAr,
            description: p.description,
            description_ar: p.descriptionAr,
            price: Number(p.price),
            currency: p.currency,
            condition: p.condition,
            is_negotiable: p.isNegotiable,
            image_url: p.images[0]?.url || null,
            category: p.category
              ? { slug: p.category.slug, name: p.category.name, name_ar: p.category.nameAr }
              : null,
            seller: {
              name: p.seller.businessName || p.seller.user.name,
              phone: p.seller.phonePublic,
              whatsapp: p.seller.whatsappNumber,
            },
            location: p.region
              ? { region: p.region.name, region_ar: p.region.nameAr }
              : null,
          },
        ])
      );
    }

    // Transform messages for the frontend
    const messages = dbMessages.map((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      let draft: Record<string, unknown> | undefined;
      let published: { id: string; title: string } | undefined;
      let contentLanguage: string | undefined;

      if (meta?.type === 'listing_draft') {
        draft = {
          images: ((meta.image_urls as string[]) || []).map((url: string) => ({
            previewUrl: url,
            s3Url: url,
          })),
          title: meta.title || 'Untitled',
          titleAr: meta.title_ar || undefined,
          description: meta.description || '',
          descriptionAr: meta.description_ar || undefined,
          category: meta.category || 'other',
          condition: meta.condition || 'good',
          price: String(meta.price || 0),
        };
        contentLanguage = (meta.language as string) || undefined;
      } else if (meta?.type === 'published') {
        published = {
          id: meta.productId as string,
          title: meta.title as string,
        };
      }

      return {
        id: m.id,
        role: m.role,
        text: m.content,
        image: m.imageUrl || undefined,
        products: m.productIds
          .map((pid) => productsMap[pid])
          .filter(Boolean),
        ...(draft ? { draft } : {}),
        ...(published ? { published } : {}),
        ...(contentLanguage ? { contentLanguage } : {}),
      };
    });

    return NextResponse.json({
      session_id: id,
      messages,
    });
  } catch (error) {
    console.error('Load messages error:', error);
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

// POST: Persist publish action — clear draft metadata + create published message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: user.userId },
    });
    if (!session) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, draftMessageId, productId, productTitle, text } = body;

    if (action !== 'publish_listing') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // In a transaction: clear draft metadata + create published confirmation message
    const publishedMsg = await prisma.$transaction(async (tx) => {
      // Find the draft message by metadata type within this session
      // (client-side IDs are timestamps, not DB UUIDs, so we match by content)
      const draftMsg = await tx.chatMessage.findFirst({
        where: {
          sessionId: id,
          metadata: { path: ['type'], equals: 'listing_draft' },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (draftMsg) {
        await tx.chatMessage.update({
          where: { id: draftMsg.id },
          data: { metadata: Prisma.DbNull },
        });
      }

      // Create published confirmation message
      return tx.chatMessage.create({
        data: {
          sessionId: id,
          role: 'assistant',
          content: text || 'Your listing has been published successfully!',
          metadata: {
            type: 'published',
            productId,
            title: productTitle,
          },
        },
      });
    });

    return NextResponse.json({ success: true, messageId: publishedMsg.id });
  } catch (error) {
    console.error('Publish persistence error:', error);
    return NextResponse.json(
      { error: 'Failed to persist publish' },
      { status: 500 }
    );
  }
}
