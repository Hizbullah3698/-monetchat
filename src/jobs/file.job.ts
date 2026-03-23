import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../lib/queue';

export interface FileProcessPayload {
  fileId: string;
  url: string;
  action: 'EXTRACT_METADATA' | 'GENERATE_THUMBNAILS' | 'SYNC_TO_CDN';
}

export const fileWorker = createWorker<FileProcessPayload>(
  QUEUE_NAMES.FILES,
  async (job: Job<FileProcessPayload>) => {
    const { fileId, action } = job.data;
    console.log(`[File Job] Processing file ${fileId} for action: ${action}`);
    
    // Simulate long-running file processing / transcoding
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`📁 [File Worker] Completed action ${action} for file ${fileId}`);
    return { success: true, fileId, processedAt: new Date().toISOString() };
  },
  { concurrency: 2 } // Keep low if files are heavy 
);
