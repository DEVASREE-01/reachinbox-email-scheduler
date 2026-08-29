import { Request, Response, NextFunction } from 'express';
import { scheduleCampaign } from '../services/scheduler.service';
import { prisma } from '../config/database';
import { parseEmailsFromCSV } from '../utils/csv.parser';
import { scheduleCampaignSchema } from '../validators/campaign.validator';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { emailQueue } from '../queues/email.queue';
import { logger } from '../utils/logger';

/**
 * Schedules a new campaign. Supports CSV upload or JSON recipient list.
 */
export async function createCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    let recipients: string[] = [];

    // 1. If file uploaded, parse it
    if (req.file) {
      const parsed = parseEmailsFromCSV(req.file.buffer);
      recipients = parsed.emails;

      if (recipients.length === 0) {
        throw new ValidationError('CSV file did not contain any valid email addresses');
      }
    } else if (req.body.recipients) {
      // If it's sent as a string (JSON form body), parse it if necessary
      recipients = typeof req.body.recipients === 'string'
        ? JSON.parse(req.body.recipients)
        : req.body.recipients;
    }

    // 2. Format inputs and validate
    const payload = {
      senderId: req.body.senderId,
      subject: req.body.subject,
      body: req.body.body,
      startTime: req.body.startTime,
      delayMs: req.body.delayMs,
      hourlyLimit: req.body.hourlyLimit,
      recipients,
    };

    const validated = scheduleCampaignSchema.safeParse(payload);
    if (!validated.success) {
      return next(new ValidationError('Validation failed', validated.error.format()));
    }

    // 3. Call Scheduling Service
    const campaign = await scheduleCampaign({
      userId,
      ...validated.data,
    });

    res.status(201).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lists all campaigns created by the user.
 */
export async function getCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      include: {
        sender: {
          select: { email: true },
        },
        _count: {
          select: { emails: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets campaign details by ID.
 */
export async function getCampaignById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        sender: {
          select: { email: true },
        },
        emails: {
          take: 50, // Limit preview emails
          orderBy: { scheduledAt: 'asc' },
        },
      },
    });

    if (!campaign) {
      return next(new NotFoundError('Campaign not found'));
    }

    if (campaign.userId !== userId) {
      return next(new ForbiddenError('You do not own this campaign'));
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes/Cancels a campaign and cancels all its active scheduled jobs.
 */
export async function deleteCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        emails: {
          where: {
            status: { in: ['SCHEDULED', 'RATE_LIMITED'] },
          },
        },
      },
    });

    if (!campaign) {
      return next(new NotFoundError('Campaign not found'));
    }

    if (campaign.userId !== userId) {
      return next(new ForbiddenError('You do not own this campaign'));
    }

    // Cancel and remove pending BullMQ jobs
    logger.info({ campaignId: id }, 'Cancelling pending jobs for campaign deletion');
    for (const email of campaign.emails) {
      const job = await emailQueue.getJob(email.bullJobId);
      if (job) {
        await job.remove().catch(() => {});
      }
    }

    // Cascade delete campaign (handles emails in DB via Cascade constraint)
    await prisma.campaign.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Campaign deleted and pending scheduling jobs cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
}
