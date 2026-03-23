
import { prisma } from '@/lib/db/prisma';
import { ProductStatus, Prisma } from '@prisma/client';
import { CreateProductInput, UpdateProductInput, ProductStatusUpdateInput } from '../validation/product';
import { hasPermission } from '../rbac';

export class ListingService {
  /**
   * Create a new product listing
   */
  static async createListing(userId: string, data: CreateProductInput) {
    const { images, ...productData } = data;

    // By default, new listings are 'pending' for moderation
    // If the user is a trusted/verified seller, we could auto-approve to 'active'
    const status = ProductStatus.pending;

    try {
      return await prisma.product.create({
        data: {
          ...productData,
          sellerId: userId,
          status,
          images: {
            create: images.map((img) => ({
              url: img.url,
              s3Key: img.s3Key,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            })),
          },
        },
        include: {
          images: true,
        },
      });
    } catch (error) {
      console.error('Error in createListing:', error);
      throw error;
    }
  }

  /**
   * Update an existing listing
   */
  static async updateListing(userId: string, productId: string, data: UpdateProductInput) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new Error('Product not found');

    // Ownership check: Only the seller or an admin can update
    const isAdmin = await hasPermission(userId, 'manage_products');
    if (product.sellerId !== userId && !isAdmin) {
      throw new Error('Unauthorized: You do not own this listing');
    }

    const { images, ...productData } = data;

    return await prisma.product.update({
      where: { id: productId },
      data: {
        ...productData,
        // If images are provided, we replace them (simple approach) or merge
        ...(images && {
          images: {
            deleteMany: {}, // Clear existing images
            create: images.map((img) => ({
              url: img.url,
              s3Key: img.s3Key,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            })),
          },
        }),
      },
      include: {
        images: true,
      },
    });
  }

  /**
   * Soft delete a listing
   */
  static async deleteListing(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new Error('Product not found');

    const isAdmin = await hasPermission(userId, 'manage_products');
    if (product.sellerId !== userId && !isAdmin) {
      throw new Error('Unauthorized');
    }

    return await prisma.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.expired, // Or just keep the status and use deletedAt for filtering
      },
    });
  }

  /**
   * Update product status (e.g., approve, reject, mark as sold)
   */
  static async updateStatus(userId: string, productId: string, data: ProductStatusUpdateInput) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new Error('Product not found');

    const isAdmin = await hasPermission(userId, 'manage_products');
    const isOwner = product.sellerId === userId;

    // Logic for who can transition to which status
    if (data.status === ProductStatus.active || data.status === ProductStatus.rejected) {
      if (!isAdmin) throw new Error('Unauthorized: Only admins can approve or reject listings');
    }

    if (data.status === ProductStatus.sold) {
      if (!isOwner && !isAdmin) throw new Error('Unauthorized: Only the owner can mark as sold');
    }

    return await prisma.product.update({
      where: { id: productId },
      data: {
        status: data.status,
        rejectionReason: data.status === ProductStatus.rejected ? data.rejectionReason : null,
      },
    });
  }

  /**
   * Get listing by ID
   */
  static async getListing(productId: string) {
    const product = await prisma.product.findUnique({
      where: { 
        id: productId,
        deletedAt: null // Exclude soft-deleted items
      },
      include: {
        images: true,
        seller: {
          include: {
            user: {
              select: {
                name: true,
                avatarUrl: true,
              }
            }
          }
        },
        category: true,
        country: true,
      },
    });

    return product;
  }

  /**
   * Get all active listings for a seller
   */
  static async getSellerListings(sellerId: string, includeInactive = false) {
    return await prisma.product.findMany({
      where: {
        sellerId,
        deletedAt: null,
        ...(includeInactive ? {} : { status: ProductStatus.active }),
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
