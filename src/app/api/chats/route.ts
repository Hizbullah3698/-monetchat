// GET /api/chats - List user's chat sessions
// Returns chat sessions for the logged-in user, ordered by most recent

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ chats: [] });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.userId },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        lastMessageAt: true,
      },
    });

    const chats = sessions.map((s) => ({
      id: s.id,
      title: s.title || 'New chat',
      createdAt: s.createdAt.getTime(),
      lastMessageAt: s.lastMessageAt.getTime(),
    }));

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('List chats error:', error);
    return NextResponse.json({ chats: [] });
  }
}
