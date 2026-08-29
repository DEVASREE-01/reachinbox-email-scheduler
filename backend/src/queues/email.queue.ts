import { Queue } from 'bullmq';
import { createRedisClient } from '../config/redis';
import { EmailJobData } from './queue.types';
import { logger } from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

emailQueue.on('error', (err) => {
  logger.error({ err }, 'BullMQ queue connection error');
});

/**
 * Adds an email job to the BullMQ queue.
 * Uses a deterministic job ID to prevent duplicate scheduling.
 */
export async function addEmailJob(data: EmailJobData, delayMs: number) {
  const jobId = `email-${data.emailId}`;
  
  await emailQueue.add(jobId, data, {
    jobId,
    delay: delayMs > 0 ? delayMs : undefined,
  });

  logger.info({ emailId: data.emailId, jobId, delayMs }, '📥 Queued email job via BullMQ');
}
