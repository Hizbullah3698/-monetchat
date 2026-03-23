import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { logger } from '../src/lib/logger';

import { notificationQueue, fileQueue, systemQueue } from '../src/lib/queue/queues';
import '../src/jobs'; // Register all workers
import { scheduleSystemJobs } from '../src/jobs/system.job';

const run = async () => {
  logger.info('Starting background worker process...');
  
  // 1. Setup recurring jobs
  await scheduleSystemJobs();

  // 2. Setup Bull Board for monitoring
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(notificationQueue),
      new BullMQAdapter(fileQueue),
      new BullMQAdapter(systemQueue),
    ],
    serverAdapter: serverAdapter,
  });

  const app = express();
  app.use('/admin/queues', serverAdapter.getRouter());

  const PORT = process.env.WORKER_PORT || 4501;
  app.listen(PORT, () => {
    logger.info(`✅ Background Workers are active and listening on port ${PORT}`);
    logger.info(`📊 Bull Board UI running on http://localhost:${PORT}/admin/queues`);
  });
};

run().catch((err) => {
  logger.fatal({ err }, 'Fatal error starting worker process');
  process.exit(1);
});
