import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { uploadFile, getExtensionFromContentType, s3, BUCKET } from '@/lib/s3/client';
import { prisma } from '@/lib/db/prisma';

// Allowed MIME types config
const ALLOWED_IMAGES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_DOCUMENTS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALL_ALLOWED_MIME_TYPES = [...ALLOWED_IMAGES, ...ALLOWED_DOCUMENTS];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'temp';
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALL_ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images (JPEG/PNG/WebP/GIF) and documents (PDF/DOC/DOCX) allowed.' },
        { status: 400 }
      );
    }

    // Validate size
    const isImage = ALLOWED_IMAGES.includes(file.type);
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size is ${isImage ? '5MB' : '20MB'}.` },
        { status: 400 }
      );
    }

    // Validate folder
    const validFolders = ['products', 'profiles', 'temp', 'chat', 'documents'] as const;
    const targetFolder = validFolders.includes(folder as typeof validFolders[number])
      ? (folder as typeof validFolders[number])
      : 'temp';

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = getExtensionFromContentType(file.type);
    
    // clean filename 
    const originalFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${targetFolder === 'documents' ? 'doc' : 'img'}_${Date.now()}.${ext}`;

    // Upload to S3
    const result = await uploadFile(targetFolder, fileName, buffer, file.type);

    // Record Metadata in Prisma Attachment model
    const attachment = await prisma.attachment.create({
      data: {
        fileName: originalFileName,
        fileType: file.type,
        fileSize: file.size,
        url: result.publicUrl,
        s3Key: result.key,
        entityType: entityType || 'General',
        entityId: entityId || null,
        uploadedBy: user.id as string,
      }
    });

    return NextResponse.json({
      success: true,
      attachment: attachment,
    }, { status: 201 });

  } catch (error) {
    console.error('File Upload Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload and save file' },
      { status: 500 }
    );
  }
}
