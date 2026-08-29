import { prisma } from '../config/database';
import { emailQueue, addEmailJob } from '../queues/email.queue';
import { indexEmail } from './search.service';
import { logger } from '../utils/logger';
import { EmailStatus } from '@prisma/client';
import crypto from 'crypto';

export interface ScheduleCampaignInput {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startTime: Date;
  delayMs: number;
  hourlyLimit: number;
  recipients: string[];
}

/**
 * Schedules a new campaign by creating database records inside a transaction,
 * then pushing delayed jobs to BullMQ.
 */
export async function scheduleCampaign(input: ScheduleCampaignInput) {
  const {
    userId,
    senderId,
    subject,
    body,
    startTime,
    delayMs,
    hourlyLimit,
    recipients,
  } = input;

  // 1. Validate Sender Ownership
  const sender = await prisma.sender.findFirst({
    where: { id: senderId, userId },
  });

  if (!sender) {
    throw new Error('Invalid sender or sender does not belong to the user');
  }

  // 2. Execute PostgreSQL Transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Create Campaign Record
    const campaign = await tx.campaign.create({
      data: {
        userId,
        senderId,
        subject,
        body,
        startTime,
        delayMs,
        hourlyLimit,
      },
    });

    // B. Calculate individual scheduled times and create email records
    const emailData = recipients.map((recipient, index) => {
      // Calculate delay based on recipient index: T0 = startTime, T1 = startTime + delayMs, etc.
      const scheduledAt = new Date(startTime.getTime() + index * delayMs);
      const emailId = crypto.randomUUID(); // generate UUID deterministically or use prisma defaults
      
      return {
        id: emailId,
        campaignId: campaign.id,
        senderId,
        recipient,
        subject,
        body,
        scheduledAt,
        status: EmailStatus.SCHEDULED,
        bullJobId: `email-${emailId}`,
      };
    });

    await tx.email.createMany({
      data: emailData,
    });

    return { campaign, emails: emailData };
  });

  logger.info(
    { campaignId: result.campaign.id, count: result.emails.length },
    '💾 Database transaction completed successfully. Campaign created.'
  );

  // 3. Queue BullMQ Jobs and Index in Search
  // If queue creation fails, the startup reconciliation will recover the jobs.
  const queuePromises = result.emails.map(async (email) => {
    const delayMs = email.scheduledAt.getTime() - Date.now();
    try {
      // Add delayed job in BullMQ
      await addEmailJob(
        {
          emailId: email.id,
          campaignId: result.campaign.id,
          senderId,
        },
        delayMs
      );

      // Index in Elasticsearch (failing indexing doesn't disrupt mail flow)
      await indexEmail({
        id: email.id,
        campaignId: result.campaign.id,
        senderId,
        userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: EmailStatus.SCHEDULED,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: null,
        createdAt: new Date().toISOString(),
      }).catch((e) => {
        logger.error({ err: e, emailId: email.id }, 'Elasticsearch indexing failed at schedule time');
      });

    } catch (err) {
      logger.error(
        { err, emailId: email.id },
        '❌ Queue creation failed for email. Startup reconciliation will recover this.'
      );
    }
  });

  await Promise.all(queuePromises);

  return result.campaign;
}

/**
 * Startup recovery reconciliation mechanism.
 * Inspects PostgreSQL for SCHEDULED, PROCESSING, or RATE_LIMITED emails.
 * Idempotently enqueues any missing jobs in BullMQ using deterministic job IDs.
 */
export async function reconcileJobs() {
  logger.info('🔄 Starting scheduled jobs reconciliation...');

  try {
    // Fetch all active/pending emails
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: {
          in: [EmailStatus.SCHEDULED, EmailStatus.PROCESSING, EmailStatus.RATE_LIMITED],
        },
      },
      include: {
        campaign: true,
      },
    });

    logger.info(`🔍 Found ${pendingEmails.length} pending email records in database to check`);

    let enqueuedCount = 0;

    for (const email of pendingEmails) {
      const jobId = `email-${email.id}`;
      // Check if job exists in BullMQ (Redis)
      const existingJob = await emailQueue.getJob(jobId);

      if (!existingJob) {
        // Job got lost (e.g. Redis restart, server crash mid-queue)
        // If email was interrupted while PROCESSING, mark it back to SCHEDULED
        if (email.status === EmailStatus.PROCESSING) {
          await prisma.email.update({
            where: { id: email.id },
            data: { status: EmailStatus.SCHEDULED },
          });
        }

        const delayMs = email.scheduledAt.getTime() - Date.now();
        
        await addEmailJob(
          {
            emailId: email.id,
            campaignId: email.campaignId,
            senderId: email.senderId,
          },
          delayMs > 0 ? delayMs : 0
        );

        enqueuedCount++;
      }
    }

    logger.info(`✅ Reconciliation finished. Re-enqueued ${enqueuedCount} missing jobs.`);
  } catch (error) {
    logger.error({ err: error }, '❌ Reconciliation process failed');
  }
}
