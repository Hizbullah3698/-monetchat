// Find Similar Products API - Qdrant hybrid vector search
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getTextEmbedding } from '@/lib/ai/ai-service';
import { searchProducts, textToSparseVector } from '@/lib/qdrant/client';

/**
 * @openapi
 * /api/ai/find-similar-products:
 *   post:
 *     summary: Find similar products using Qdrant hybrid vector search
 *     tags: [AI, Search]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: List of similar products and their similarity scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       image_url:
 *                         type: string
 *                       score:
 *                         type: number
 *       400:
 *         description: productId or query required
 *       404:
 *         description: Product not found
 *       500:
 *         description: Search Error
 */
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
