import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getPresignedReadUrl, deleteFile, getPublicUrl } from '@/lib/s3/client';
import { prisma } from '@/lib/db/prisma';
import { hasRole } from '@/lib/rbac';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // Find metadata
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Default to private unless entityType suggests public
    // e.g. 'Avatar', 'ProductImage' (but for now let's enforce secure access as requested)
    const isPublic = attachment.entityType === 'Avatar' || attachment.entityType === 'PublicProductImage';

    if (!isPublic) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check access rules: Owner or Admin
      const isOwner = attachment.uploadedBy === user.id;
      const isAdminRole = await hasRole(user.id as string, 'admin');

      if (!isOwner && !isAdminRole) {
        return NextResponse.json({ error: 'Forbidden. You do not have access to this file.' }, { status: 403 });
      }
    }

    // If there is no s3Key, fallback to the stored URL directly
    if (!attachment.s3Key) {
      return NextResponse.redirect(attachment.url);
    }

    // Generate secure presigned URL valid for 1 hour
    const presignedUrl = await getPresignedReadUrl(attachment.s3Key, 3600);
    
    // Redirect client to download stream
    return NextResponse.redirect(presignedUrl);

  } catch (error) {
    console.error('File Retrieval Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve file' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find metadata
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check access rules: Owner or Admin
    const isOwner = attachment.uploadedBy === user.id;
    const isAdminRole = await hasRole(user.id as string, 'admin');

    if (!isOwner && !isAdminRole) {
      return NextResponse.json({ error: 'Forbidden. You do not have permission to delete this file.' }, { status: 403 });
    }

    // Delete from S3
    if (attachment.s3Key) {
      await deleteFile(attachment.s3Key);
    }

    // Delete from Database
    await prisma.attachment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('File Deletion Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
