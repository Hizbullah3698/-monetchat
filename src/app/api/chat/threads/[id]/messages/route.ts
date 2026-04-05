// Chat Thread Messages API (Legacy P2P messaging)
// Not available in V1 - redirects to AI chat endpoints

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'P2P messaging is not available in V1. Use /api/chat/sessions/[id] for AI chat history.' },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'P2P messaging is not available in V1. Use /api/chat for AI chat.' },
    { status: 501 }
  );
}
