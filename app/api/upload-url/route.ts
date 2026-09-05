import { NextResponse } from 'next/server';
import { isR2Configured, createPresignedUploadUrl } from '@/lib/r2';

export async function POST(request: Request) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { enabled: false, message: 'Cloudflare R2 is not configured. Fallback to direct upload.' },
        { status: 200 }
      );
    }

    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', detail: 'Missing or invalid filename' },
        { status: 400 }
      );
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `audio_chunks/${Date.now()}_${sanitizedFilename}`;

    const uploadUrl = await createPresignedUploadUrl(key, contentType || 'audio/wav');

    if (!uploadUrl) {
      return NextResponse.json(
        { enabled: false, message: 'Failed to generate R2 presigned URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      enabled: true,
      uploadUrl,
      key,
    });
  } catch (error) {
    console.error('R2 upload-url API error:', error);
    const detail =
      error instanceof Error
        ? error.message
        : 'Failed to generate presigned upload URL';

    return NextResponse.json(
      { error: 'Presigned URL Generation Failed', detail },
      { status: 500 }
    );
  }
}
