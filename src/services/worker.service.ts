import { prisma } from '@/lib/db/prisma';
import { NotificationService } from './notification.service';

/**
 * Worker Service to process notification jobs.
 * This runs periodically to process pending jobs in the NotificationJob table.
 */
export class WorkerService {
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs = 5000) {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.processJobs(), intervalMs);
    console.log(`[WorkerService] Started job processing worker (interval: ${intervalMs}ms)`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[WorkerService] Stopped job processing worker');
    }
  }

  async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Fetch up to 10 pending jobs that are due
      const jobs = await prisma.notificationJob.findMany({
        where: {
          status: 'pending',
          runAt: {
            lte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 10,
      });

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('[WorkerService] Error fetching jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: any) {
    try {
      // Mark as processing
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'processing' },
      });

      const payload = job.payload as any;

      if (job.type === 'email') {
        const { to, subject, html } = payload;
        await NotificationService.sendEmailDirectly(to, subject, html);
      } else if (job.type === 'system') {
        const { userId, title, body, type, metadata } = payload;
        await NotificationService.createSystemNotificationDirectly(userId, title, body, type, metadata);
      }

      // Mark as completed
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'completed' },
      });
    } catch (error: any) {
      console.error(`[WorkerService] Failed to process job ${job.id}:`, error);

      // Handle retry logic
      const retryCount = job.retryCount + 1;
      const status = retryCount >= 3 ? 'failed' : 'pending';
      const runAt = new Date(Date.now() + retryCount * 1000 * 60); // Exponential backoff (1m, 2m, etc.)

      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status,
          error: error.message || String(error),
          retryCount,
          runAt,
        },
      });
    }
  }
}

// Singleton instance
export const workerService = new WorkerService();
