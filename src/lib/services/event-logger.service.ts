import { prisma } from '@/lib/db/prisma';
import { EventType } from '@prisma/client';

export class EventLogger {
  static async log(type: EventType, opts?: { userId?: string; entityType?: string; entityId?: string; metadata?: any }) {
    try {
      await prisma.eventLog.create({
        data: {
          type,
          userId: opts?.userId,
          entityType: opts?.entityType,
          entityId: opts?.entityId,
          metadata: opts?.metadata ?? {},
        },
      });
    } catch (err) {
      console.warn('[EventLogger] failed', err);
    }
  }
}
