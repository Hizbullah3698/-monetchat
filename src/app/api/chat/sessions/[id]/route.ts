// GET /api/chat/sessions/[id] - Get messages for a chat session

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const user = await getCurrentUser().catch(() => null);

    // Find the session
    const session = await prisma.chatSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check access: authenticated session must match user; anonymous session requires sessionToken header
    if (session.userId) {
      if (session.userId !== user?.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Anonymous session — require the sessionToken that was issued at creation
      const sessionToken = request.headers.get('x-session-token');
      if (!sessionToken || sessionToken !== session.sessionToken) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        hasImage: true,
        imageUrl: true,
        hasVoice: true,
        voiceTranscript: true,
        productIds: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        country_code: session.countryCode,
        language: session.language,
        created_at: session.createdAt,
      },
      messages,
    });
  } catch (error) {
    console.error('Chat session messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
