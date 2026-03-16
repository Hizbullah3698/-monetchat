// POST /api/upload - Upload file to S3
// Accepts multipart form data, uploads to S3, returns public URL

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { uploadFile, getExtensionFromContentType } from '@/lib/s3/client';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'temp';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images allowed (JPEG, PNG, WebP, GIF).' },
        { status: 400 }
      );
    }

    // Validate folder
    const validFolders = ['products', 'profiles', 'temp', 'chat'] as const;
    const targetFolder = validFolders.includes(folder as typeof validFolders[number])
      ? (folder as typeof validFolders[number])
      : 'temp';

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = getExtensionFromContentType(file.type);
    const fileName = `upload.${ext}`;

    const result = await uploadFile(targetFolder, fileName, buffer, file.type);

    return NextResponse.json({
      url: result.publicUrl,
      key: result.key,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
