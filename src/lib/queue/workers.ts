import { Worker, Job, Processor, WorkerOptions } from 'bullmq';
import { redis } from '../redis';

/**
 * Creates a configured BullMQ worker with standard event listeners
 */
export function createWorker<T = any, R = any, N extends string = string>(
  queueName: string,
  processor: Processor<T, R, N>,
  options?: Partial<WorkerOptions>
) {
  const worker = new Worker<T, R, N>(queueName, processor, {
    connection: redis as any,
    concurrency: options?.concurrency ?? 1,
    ...options
  });

  worker.on('completed', (job: Job) => {
    console.log(`✅ Job ${job.id} completed successfully in queue [${queueName}]`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`❌ Job ${job?.id} failed in queue [${queueName}]:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error(`⚠️ Worker error in queue [${queueName}]:`, err.message);
  });

  return worker;
}
