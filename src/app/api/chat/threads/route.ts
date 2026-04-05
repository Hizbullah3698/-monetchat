// Chat Threads API (Legacy P2P messaging - rewritten for Prisma)
// NOTE: V1 focuses on AI chat search, not P2P messaging.
// This is kept as a placeholder for future expansion.
// The main chat endpoint is /api/chat (AI-powered search).

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'P2P messaging is not available in V1. Use /api/chat for AI search.' },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'P2P messaging is not available in V1. Use /api/chat/sessions for AI chat history.' },
    { status: 501 }
  );
}
