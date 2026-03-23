// AWS S3 Client for Object Storage
// Used for product images, user avatars, and temporary uploads

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

// Initialize S3 client (region from environment)
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'me-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // Disable automatic checksums - they break presigned URL browser uploads
  // (SDK adds x-amz-checksum-crc32 to signed URL, but browser doesn't send it → 403)
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const BUCKET = process.env.S3_BUCKET_NAME || 'Monetchat-media';
// Use path-style URLs (buckets with dots like "Monetchat.app" break virtual-hosted SSL certs)
const CDN_URL = process.env.S3_CDN_URL || `https://s3.${process.env.AWS_REGION || 'me-south-1'}.amazonaws.com/${BUCKET}`;

// Folder types
type FolderType = 'products' | 'profiles' | 'temp' | 'chat' | 'documents';

// ============================================
// UPLOAD FUNCTIONS
// ============================================

interface PresignedUrlResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

// Generate presigned URL for direct client upload
export async function getPresignedUploadUrl(
  folder: FolderType,
  fileExtension: string,
  contentType: string
): Promise<PresignedUrlResponse> {
  const key = `${folder}/${uuid()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  // For browser uploads: don't sign content-type or checksum headers
  // so the browser can PUT without signature mismatch
  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
    unhoistableHeaders: new Set(["content-type"]),
  });

  return {
    uploadUrl,
    key,
    publicUrl: `${CDN_URL}/${key}`,
  };
}

// Upload file directly (for server-side uploads)
export async function uploadFile(
  folder: FolderType,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ key: string; publicUrl: string }> {
  const key = `${folder}/${uuid()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);

  return {
    key,
    publicUrl: `${CDN_URL}/${key}`,
  };
}

// Generate a presigned GET URL (for passing S3 images to OpenAI, etc.)
// This avoids needing public bucket access and works with any bucket name
export async function getPresignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// ============================================
// FILE OPERATIONS
// ============================================

// Delete file from S3
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3.send(command);
}

// Move file from temp to permanent location
export async function moveFile(
  tempKey: string,
  permanentFolder: FolderType,
  newFilename?: string
): Promise<string> {
  const filename = newFilename || tempKey.split('/').pop()!;
  const newKey = `${permanentFolder}/${filename}`;

  // Copy to new location
  const copyCommand = new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: encodeURIComponent(`${BUCKET}/${tempKey}`),
    Key: newKey,
  });
  await s3.send(copyCommand);

  // Delete from temp
  await deleteFile(tempKey);

  return `${CDN_URL}/${newKey}`;
}

// Check if file exists
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate public URL for a key
export function getPublicUrl(key: string): string {
  return `${CDN_URL}/${key}`;
}

// Extract key from any S3 URL format (path-style, virtual-hosted, or CDN)
export function getKeyFromUrl(url: string): string | null {
  // Match CDN_URL prefix
  if (url.startsWith(CDN_URL)) {
    return url.replace(`${CDN_URL}/`, '');
  }
  // Path-style: https://s3.REGION.amazonaws.com/BUCKET/key
  const pathMatch = url.match(/s3[.\w-]*\.amazonaws\.com\/([^/?]+)\/(.+?)(?:\?|$)/);
  if (pathMatch && pathMatch[1] === BUCKET) {
    return pathMatch[2];
  }
  // Virtual-hosted: https://BUCKET.s3.REGION.amazonaws.com/key
  const vhostMatch = url.match(new RegExp(`${BUCKET.replace(/\./g, '\\.')}\\.s3[.\\w-]*\\.amazonaws\\.com/(.+?)(?:\\?|$)`));
  if (vhostMatch) {
    return vhostMatch[1];
  }
  return null;
}

// Get file extension from content type
export function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return map[contentType] || 'bin';
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkS3Connection(): Promise<boolean> {
  try {
    // Try to check if bucket exists by listing with max 1 object
    await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: '.health-check',
      })
    );
    return true;
  } catch (error: unknown) {
    const err = error as { name?: string };
    // NotFound is OK - bucket exists but file doesn't
    if (err?.name === 'NotFound') return true;
    // NoSuchBucket means bucket doesn't exist
    if (err?.name === 'NoSuchBucket') return false;
    // Other errors might be credentials issues
    return false;
  }
}

export { s3, BUCKET, CDN_URL };
