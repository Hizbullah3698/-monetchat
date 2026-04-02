import { prisma } from '@/lib/db/prisma';
import nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';
import { AuditLogService } from '@/lib/services/audit-service';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export class NotificationService {
  /**
   * Enqueues an email notification to be processed by the worker.
   */
  static async enqueueEmail(to: string, subject: string, html: string) {
    return prisma.notificationJob.create({
      data: {
        type: 'email',
        payload: { to, subject, html },
        status: 'pending',
      },
    });
  }

  /**
   * Enqueues a system notification to be processed by the worker.
   */
  static async enqueueSystemNotification(userId: string, title: string, body: string, type: NotificationType = 'INFO', metadata?: any) {
    return prisma.notificationJob.create({
      data: {
        type: 'system',
        payload: { userId, title, body, type, metadata },
        status: 'pending',
      },
    });
  }

  /**
   * Convenience: log + create system notification immediately (no worker), mainly for critical flows.
   */
  static async createSystemAndAudit(userId: string, title: string, body: string, type: NotificationType = 'INFO', metadata?: any, actorId?: string) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        metadata: metadata || {},
      },
    });

    await AuditLogService.logAction({
      userId: actorId ?? userId,
      action: 'UPDATE',
      entityName: 'Notification',
      entityId: notification.id,
      changes: { title, body, type },
    }).catch(() => {});

    return notification;
  }

  /**
   * Sends an email directly (synchronously). Used by the worker.
   */
  static async sendEmailDirectly(to: string, subject: string, html: string) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Monetchat" <no-reply@monetchat.com>',
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Creates a system notification directly. Used by the worker.
   */
  static async createSystemNotificationDirectly(userId: string, title: string, body: string, type: NotificationType = 'INFO', metadata?: any) {
    return prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        metadata: metadata || {},
      },
    });
  }
}
