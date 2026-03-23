import { createWorker, QUEUE_NAMES, indexingQueue } from '../lib/queue';
import { prisma } from '../lib/db/prisma';
import { getTextEmbedding } from '../lib/ai/ai-service';
import { indexProduct, textToSparseVector, deleteProductFromIndex } from '../lib/qdrant/client';

export type IndexAction = 'add' | 'update' | 'delete';

export interface IndexingPayload {
  action: IndexAction;
  productId: string;
}

// -----------------------------------------------------
// Job Enqueue Helpers
// -----------------------------------------------------

/**
 * Enqueue a job to index or update a product in Qdrant.
 */
export async function enqueueIndexProduct(productId: string) {
  await indexingQueue.add('indexProduct', {
    action: 'add',
    productId,
  } as IndexingPayload);
}

/**
 * Enqueue a job to remove a product from Qdrant.
 */
export async function enqueueRemoveProduct(productId: string) {
  await indexingQueue.add('removeProduct', {
    action: 'delete',
    productId,
  } as IndexingPayload);
}

// -----------------------------------------------------
// Worker Logic
// -----------------------------------------------------

export const indexingWorker = createWorker<IndexingPayload>(
  QUEUE_NAMES.INDEXING,
  async (job) => {
    const { action, productId } = job.data;
    console.log(`[Indexing Worker] Processing ${action} for product ${productId}`);

    if (action === 'delete') {
      await deleteProductFromIndex(productId);
      return { success: true, action: 'delete' };
    }

    // Default to 'add' or 'update'
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { slug: true } },
        seller: { select: { userId: true } },
      },
    });

    if (!product) {
       console.warn(`[Indexing Worker] Product ${productId} not found; skipping.`);
       return { success: false, reason: 'NotFound' };
    }

    const searchText = `${product.title} ${product.description || ''}`.trim();
    const embedding = await getTextEmbedding(searchText);
    const sparseVector = textToSparseVector(searchText);

    await indexProduct(productId, embedding, sparseVector, {
      product_id: productId,
      seller_id: product.sellerId,
      title: product.title,
      title_ar: product.titleAr || undefined,
      description: product.description || undefined,
      price: Number(product.price),
      currency: product.currency,
      category_slug: product.category?.slug || 'other',
      country_code: product.countryCode,
      region_id: product.regionId || undefined,
      status: product.status,
      created_at: product.createdAt.toISOString(),
    });

    // Mark as indexed in Postgres (allows tracking index status if needed)
    await prisma.product.update({
      where: { id: productId },
      data: { qdrantPointId: productId },
    });

    return { success: true, action };
  },
  { concurrency: 5 }
);
