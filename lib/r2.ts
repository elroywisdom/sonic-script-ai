import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Checks if Cloudflare R2 environment variables are configured.
 */
export function isR2Configured(): boolean {
  return (
    !!process.env.R2_ACCOUNT_ID &&
    !!process.env.R2_ACCESS_KEY_ID &&
    !!process.env.R2_SECRET_ACCESS_KEY &&
    !!process.env.R2_BUCKET_NAME
  );
}

/**
 * Initializes S3 Client configured for Cloudflare R2
 */
export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Generates a presigned PUT upload URL for an R2 object key
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Retrieves audio object blob from R2 bucket
 */
export async function getObjectFromR2(key: string): Promise<Blob | null> {
  const client = getR2Client();
  if (!client) return null;

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  const response = await client.send(command);
  if (!response.Body) return null;

  const bytes = await response.Body.transformToByteArray();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: response.ContentType || 'audio/wav' });
}

/**
 * Deletes audio object from R2 bucket after successful transcription
 */
export async function deleteObjectFromR2(key: string): Promise<boolean> {
  const client = getR2Client();
  if (!client) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.warn(`[R2] Failed deleting transient object '${key}':`, err);
    return false;
  }
}
