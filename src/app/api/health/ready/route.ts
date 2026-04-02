import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {
    db: { ok: false },
    redis: { ok: false },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db.ok = true;
  } catch (e: any) {
    checks.db = { ok: false, error: e?.message || 'db error' };
  }

  try {
    await redis.ping();
    checks.redis.ok = true;
  } catch (e: any) {
    checks.redis = { ok: false, error: e?.message || 'redis error' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { ok: allOk, checks },
    { status: allOk ? 200 : 503 },
  );
}
