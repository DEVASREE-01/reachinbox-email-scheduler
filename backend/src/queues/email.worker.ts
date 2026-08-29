import { Worker, Job } from 'bullmq';
import { redis, createRedisClient } from '../config/redis';
import { prisma } from '../config/database';
import { EmailJobData } from './queue.types';
import { logger } from '../utils/logger';
import { sendMail } from '../services/smtp.service';
import { checkAndIncrementRateLimit, acquireDelaySlot } from '../services/rate-limit.service';
import { sendRateLimitNotification } from '../services/slack.service';
import { indexEmail, updateEmailStatusInSearch } from '../services/search.service';
import { env } from '../config/env';
import { EMAIL_QUEUE_NAME, addEmailJob } from './email.queue';

const WORKER_NAME = 'email-worker';

export async function processEmail(emailId: string): Promise<void> {
  logger.info({ emailId }, '⚙️ Processing email job');

  // 1. Fetch Email and related Sender/Campaign details
  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      sender: true,
      campaign: true,
    },
  });

  if (!email) {
    logger.error({ emailId }, '❌ Email record not found. Skipping job.');
    return;
  }

  // If email is already sent, complete successfully
  if (email.status === 'SENT') {
    logger.info({ emailId }, '✅ Email already sent. Skipping.');
    return;
  }

  const senderId = email.senderId;
  const hourlyLimit = email.campaign?.hourlyLimit || 50;

  // 2. Check Hourly Rate Limit per Sender
  const rateCheck = await checkAndIncrementRateLimit(senderId, hourlyLimit);
  if (!rateCheck.allowed) {
    const nextHourStart = rateCheck.resetTimeMs;
    // Calculate the fractional offset of the original scheduled time in its hour
    const offsetInHour = email.scheduledAt.getTime() % (60 * 60 * 1000);
    // Align it to the same relative offset in the next hour
    let newScheduledAtTime = nextHourStart + offsetInHour;
    
    // Safety check: ensure it is in the future
    if (newScheduledAtTime <= Date.now()) {
      newScheduledAtTime += 60 * 60 * 1000;
    }
    const newScheduledAt = new Date(newScheduledAtTime);
    const delayMsFallback = newScheduledAt.getTime() - Date.now();

    logger.warn({ senderId, emailId, delayMsFallback, newScheduledAt: newScheduledAt.toISOString() }, `⚠️ Rate limit reached for sender. Rescheduling job.`);
    
    await prisma.email.update({
      where: { id: emailId },
      data: { 
        status: 'RATE_LIMITED',
        scheduledAt: newScheduledAt,
      },
    });
    await updateEmailStatusInSearch(emailId, 'RATE_LIMITED');

    const hourWindow = `${new Date().getUTCHours()}:00 - ${new Date().getUTCHours() + 1}:00 UTC`;
    await sendRateLimitNotification(email.campaign?.userId || 'dev-user-id', email.sender?.email || 'growth@reachinbox.ai', hourlyLimit, hourWindow);

    await addEmailJob({ emailId, campaignId: email.campaignId, senderId }, delayMsFallback);
    return;
  }

  // 3. Enforce Minimum Delay between emails per Sender
  const delayCheck = await acquireDelaySlot(senderId, env.MIN_SEND_DELAY_MS);
  if (!delayCheck.allowed) {
    const remainingMsFallback = delayCheck.remainingMs;
    logger.info({ senderId, emailId, remainingMsFallback }, `⏳ Minimum send delay not met. Rescheduling job.`);
    await addEmailJob({ emailId, campaignId: email.campaignId, senderId }, remainingMsFallback);
    return;
  }

  // 4. Update status to PROCESSING
  await prisma.email.update({
    where: { id: emailId },
    data: { status: 'PROCESSING' },
  });
  await updateEmailStatusInSearch(emailId, 'PROCESSING');

  // 5. Send SMTP email
  try {
    const sendResult = await sendMail({
      from: email.sender?.email || 'growth@reachinbox.ai',
      to: email.recipient,
      subject: email.subject,
      text: email.body,
    });

    // 6. On success: Update database
    const updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        messageId: sendResult.messageId,
        errorMessage: null,
      },
    });

    await indexEmail({
      id: updatedEmail.id,
      campaignId: updatedEmail.campaignId,
      senderId: updatedEmail.senderId,
      userId: email.campaign.userId,
      recipient: updatedEmail.recipient,
      subject: updatedEmail.subject,
      body: updatedEmail.body,
      status: 'SENT',
      scheduledAt: updatedEmail.scheduledAt.toISOString(),
      sentAt: updatedEmail.sentAt ? updatedEmail.sentAt.toISOString() : null,
      createdAt: updatedEmail.createdAt.toISOString(),
    });

    logger.info({ emailId, messageId: sendResult.messageId }, '🚀 Email sent successfully');
  } catch (error: any) {
    const nextAttempts = email.attempts + 1;
    const isFailedPermanently = nextAttempts >= 3;

    logger.error({ err: error, emailId, attempt: nextAttempts }, '🔄 Email send failed');

    await prisma.email.update({
      where: { id: emailId },
      data: {
        attempts: nextAttempts,
        errorMessage: error.message,
        status: isFailedPermanently ? 'FAILED' : 'SCHEDULED',
      },
    });
    await updateEmailStatusInSearch(emailId, isFailedPermanently ? 'FAILED' : 'SCHEDULED');

    if (!isFailedPermanently) {
      throw error;
    }
  }
}

/**
 * Initializes and starts the BullMQ worker.
 */
export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      await processEmail(job.data.emailId);
    },
    {
      connection: createRedisClient(),
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('active', (job) => {
    logger.debug({ jobId: job.id }, 'Worker job active');
  });

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Worker job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Worker job execution failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Worker connection/processing error');
  });

  logger.info(`👷 BullMQ worker started with concurrency = ${env.WORKER_CONCURRENCY}`);
  return worker;
}

// Auto start worker if run directly (e.g. npm run worker)
if (require.main === module) {
  Promise.all([
    prisma.$connect(),
    redis.ping(),
  ]).then(() => {
    logger.info('Worker process connected to DB & Redis');
    startEmailWorker();
  }).catch((err) => {
    logger.fatal({ err }, 'Worker process failed to initialize services');
    process.exit(1);
  });
}
