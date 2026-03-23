import { Queue } from 'bullmq';
import { redis } from '../redis';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  FILES: 'files',
  SYSTEM: 'system',
  INDEXING: 'indexing',
} as const;

// Create Queue instances
export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: redis as any });
export const fileQueue = new Queue(QUEUE_NAMES.FILES, { connection: redis as any });
export const systemQueue = new Queue(QUEUE_NAMES.SYSTEM, { connection: redis as any });
export const indexingQueue = new Queue(QUEUE_NAMES.INDEXING, { connection: redis as any });
