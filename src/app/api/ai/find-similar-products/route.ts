// Find Similar Products API - Qdrant hybrid vector search
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTextEmbedding } from '@/lib/ai/openai';
import { searchProducts, textToSparseVector } from '@/lib/qdrant/client';

export async function POST(request: Request) {
  try {
    const { productId, query: textQuery } = await request.json();

    let searchText = '';

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { title: true, description: true },
      });
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      searchText = `${product.title} ${product.description || ''}`.trim();
    } else if (textQuery) {
      searchText = textQuery;
    } else {
      return NextResponse.json({ error: 'productId or query required' }, { status: 400 });
    }

    const embedding = await getTextEmbedding(searchText);
    const sparseVector = textToSparseVector(searchText);
    const results = await searchProducts(embedding, sparseVector, { country_code: 'KW' }, 4);

    const productIds = results.map((r) => r.payload.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { where: { isPrimary: true }, take: 1 } },
    });

    return NextResponse.json({
      results: products.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        currency: p.currency,
        image_url: p.images[0]?.url || null,
        score: results.find((r) => r.payload.product_id === p.id)?.score || 0,
      })),
    });
  } catch (error) {
    console.error('Find Similar Error:', error);
    return NextResponse.json({ error: 'Search Error' }, { status: 500 });
  }
}
