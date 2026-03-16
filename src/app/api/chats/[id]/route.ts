// DELETE /api/chats/[id] - Delete a chat session and all its messages
// PATCH /api/chats/[id] - Update chat title

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: user.userId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Cascade delete handles messages, search logs, contact logs
    await prisma.chatSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat error:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await request.json();

    // Verify ownership
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: user.userId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    await prisma.chatSession.update({
      where: { id },
      data: { title: title?.slice(0, 100) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update chat error:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}
