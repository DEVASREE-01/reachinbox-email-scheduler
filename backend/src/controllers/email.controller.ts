import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { searchEmails } from '../services/search.service';
import { NotFoundError, ForbiddenError } from '../utils/errors';

/**
 * Returns paginated scheduled, processing, and rate-limited emails for the user.
 */
export async function getScheduledEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: { userId },
          status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          campaign: { userId },
          status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns paginated sent and failed emails for the user.
 */
export async function getSentEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: { userId },
          status: { in: ['SENT', 'FAILED'] },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: {
          campaign: { userId },
          status: { in: ['SENT', 'FAILED'] },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Searches user emails using Elasticsearch. Scopes queries by userId.
 */
export async function searchUserEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const query = (req.query.q as string) || '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));

    const result = await searchEmails(userId, query, page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Gets details of a single email. Ensures requester owns the record.
 */
export async function getEmailById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const { id } = req.params;

    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    });

    if (!email) {
      return next(new NotFoundError('Email not found'));
    }

    if (email.campaign.userId !== userId) {
      return next(new ForbiddenError('You do not have access to view this email'));
    }

    // Omit sensitive data fields before returning
    const { campaign, ...cleanEmail } = email;

    res.json({
      success: true,
      data: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
}
