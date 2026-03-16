// GET /api/chat/sessions - Get user's chat sessions

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.userId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        country_code: s.countryCode,
        language: s.language,
        last_message: s.messages[0]?.content || null,
        last_message_role: s.messages[0]?.role || null,
        message_count: s._count.messages,
        created_at: s.createdAt,
        last_message_at: s.lastMessageAt,
      })),
    });
  } catch (error) {
    console.error('Chat sessions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
