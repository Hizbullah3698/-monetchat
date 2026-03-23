import { prisma } from '@/lib/db/prisma';
import { AuditAction } from '@prisma/client';

export interface AuditLogOptions {
  userId?: string | null;
  action: AuditAction;
  entityName: string;
  entityId: string;
  changes?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditLogService {
  /**
   * Logs an action to the audit_logs table.
   * Fails silently (only logs to console) to prevent disrupting the main application flow.
   */
  static async logAction(options: AuditLogOptions) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: options.userId,
          action: options.action,
          entityName: options.entityName,
          entityId: options.entityId,
          changes: options.changes ? options.changes : undefined,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });
    } catch (error) {
      console.error('[AuditLogService] Failed to create audit log:', error);
    }
  }
}
