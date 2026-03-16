// POST /api/upload/presign - Get S3 presigned URL for direct client upload
// Returns a presigned URL that the client can PUT to directly
// Note: "chat" folder allows anonymous access (buyers search without account)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getPresignedUploadUrl, getExtensionFromContentType } from '@/lib/s3/client';

const presignSchema = z.object({
  content_type: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, 'Only image files allowed'),
  folder: z.enum(['products', 'profiles', 'temp', 'chat']).default('temp'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content_type, folder } = presignSchema.parse(body);

    // "chat" folder is accessible without auth (anonymous image search)
    // All other folders require authentication
    if (folder !== 'chat') {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const extension = getExtensionFromContentType(content_type);
    const result = await getPresignedUploadUrl(folder, extension, content_type);

    return NextResponse.json({
      upload_url: result.uploadUrl,
      key: result.key,
      public_url: result.publicUrl,
    });
  } catch (error) {
    console.error('Presign error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
