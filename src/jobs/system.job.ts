import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES, systemQueue } from '../lib/queue';
import { logger } from '../lib/logger';

export interface SystemProcessPayload {
  task: 'SYNC_SEARCH_INDEX' | 'CLEANUP_TEMP_FILES' | 'WEEKLY_REPORT';
}

export const systemWorker = createWorker<SystemProcessPayload>(
  QUEUE_NAMES.SYSTEM,
  async (job: Job<SystemProcessPayload>) => {
    const { task } = job.data;
    logger.info({ jobId: job.id, task }, `[System Job] Executing scheduled task: ${task}`);
    
    // Simulate task execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (task === 'SYNC_SEARCH_INDEX') {
      logger.info({ jobId: job.id }, `🔍 [System Job] Syncing database to vector index...`);
    } else if (task === 'CLEANUP_TEMP_FILES') {
      logger.info({ jobId: job.id }, `🗑️ [System Job] Cleaning up temp directory...`);
    }
    
    return { success: true, task, executedAt: new Date().toISOString() };
  },
  { concurrency: 1 } // Run system tasks one at a time
);

// Helper function to initialize our repeatable cron jobs
export const scheduleSystemJobs = async () => {
  logger.info(`[System Jobs] Setting up recurring schedules...`);
  
  // Clean up existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await systemQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await systemQueue.removeRepeatableByKey(job.key);
  }

  // Example: Run search sync every night at midnight
  await systemQueue.add(
    'sync-search-index',
    { task: 'SYNC_SEARCH_INDEX' },
    { repeat: { pattern: '0 0 * * *' } }
  );

  // Example: Clean temp files every Sunday at 3 AM
  await systemQueue.add(
    'cleanup-temp-files',
    { task: 'CLEANUP_TEMP_FILES' },
    { repeat: { pattern: '0 3 * * 0' } }
  );
};
