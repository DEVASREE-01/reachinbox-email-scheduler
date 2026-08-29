import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../config/database';
import { createSenderSchema } from '../validators/sender.validator';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Lists all registered senders for the authenticated user.
 * Redacts smtpPassword for security.
 */
export async function getSenders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    
    const senders = await prisma.sender.findMany({
      where: { userId },
      select: {
        id: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: senders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Registers a new sender with custom SMTP configurations.
 */
export async function createSender(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    
    const validated = createSenderSchema.safeParse(req.body);
    if (!validated.success) {
      return next(new ValidationError('Validation failed', validated.error.format()));
    }

    // Verify SMTP connection before saving
    const transporter = nodemailer.createTransport({
      host: validated.data.smtpHost,
      port: validated.data.smtpPort,
      secure: validated.data.smtpPort === 465,
      auth: {
        user: validated.data.smtpUser,
        pass: validated.data.smtpPassword,
      },
    });

    try {
      await transporter.verify();
    } catch (err: any) {
      logger.error({ err, email: validated.data.email }, 'SMTP verification failed during registration');
      return next(new ValidationError(`SMTP connection verification failed: ${err.message}`));
    }

    const sender = await prisma.sender.create({
      data: {
        userId,
        ...validated.data,
      },
      select: {
        id: true,
        email: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        createdAt: true,
      },
    });

    logger.info({ senderId: sender.id, email: sender.email }, '📤 New SMTP Sender registered successfully');

    res.status(201).json({
      success: true,
      data: sender,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a registered SMTP sender.
 * Prevents deletion if the sender has active campaigns or emails.
 */
export async function deleteSender(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const { id } = req.params;

    const sender = await prisma.sender.findUnique({
      where: { id },
      include: {
        emails: {
          where: { status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] } },
        },
      },
    });

    if (!sender) {
      return next(new NotFoundError('Sender not found'));
    }

    if (sender.userId !== userId) {
      return next(new ForbiddenError('You do not own this sender configuration'));
    }

    if (sender.emails.length > 0) {
      throw new ValidationError('Cannot delete sender with pending scheduled emails');
    }

    await prisma.sender.delete({
      where: { id },
    });

    logger.info({ senderId: id }, '🗑️ SMTP Sender deleted successfully');

    res.json({
      success: true,
      message: 'Sender deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
