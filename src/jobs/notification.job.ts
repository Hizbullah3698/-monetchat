import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../lib/queue';
import { logger } from '../lib/logger';

export interface NotificationPayload {
  userId: string;
  type: 'EMAIL' | 'SYSTEM' | 'PUSH';
  subject: string;
  message: string;
  metadata?: any;
}

export const notificationWorker = createWorker<NotificationPayload>(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job: Job<NotificationPayload>) => {
    const { userId, type, subject } = job.data;
    logger.info({ jobId: job.id, userId, type }, `[Notification Job UI] Processing for user ${userId}, type: ${type}`);
    
    // Simulate external network call or db insertion
    await new Promise(resolve => setTimeout(resolve, 500));

    if (type === 'EMAIL') {
      logger.info({ jobId: job.id, subject }, `✉️ [Notification Worker] Sending EMAIL: ${subject}`);
      // e.g., await sendEmail(...)
    } else {
      logger.info({ jobId: job.id, subject }, `🔔 [Notification Worker] Creating SYSTEM notification: ${subject}`);
      // e.g., await prisma.notification.create(...)
    }
    
    return { success: true, deliveredAt: new Date().toISOString() };
  },
  { concurrency: 5 } // Can process 5 notifications at once
);
