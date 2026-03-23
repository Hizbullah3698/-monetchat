// POST /api/chat/voice - Transcribe voice recording to text
// Accepts audio file and returns transcript

import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/ai/ai-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || undefined;

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB - Whisper limit)
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large (max 25MB)' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await transcribeAudio(buffer, language);

    return NextResponse.json({
      transcript: result.text,
      language_detected: result.language,
    });
  } catch (error) {
    console.error('Voice transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
