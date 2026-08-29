import { Request, Response, NextFunction } from 'express';
import { exchangeSlackCode } from '../services/slack.service';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Redirects user to Slack OAuth consent screen.
 * Embeds userId in state to correlate on callback.
 */
export function connectSlack(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;
    const rootUrl = 'https://slack.com/oauth/v2/authorize';
    const options = {
      client_id: env.SLACK_CLIENT_ID,
      scope: 'channels:read,chat:write', // required Slack scopes
      redirect_uri: env.SLACK_REDIRECT_URI,
      state: userId,
    };

    const qs = new URLSearchParams(options);
    res.redirect(`${rootUrl}?${qs.toString()}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles Slack OAuth redirect callback.
 * Correlates state with authenticated user session, exchanges code, and saves credentials.
 */
export async function slackCallback(req: Request, res: Response, next: NextFunction) {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const userId = req.session.userId;

  if (!code) {
    return next(new ValidationError('Slack authorization code not found in callback'));
  }

  // Security check: state must match authenticated user's ID
  if (!userId || state !== userId) {
    return next(new UnauthorizedError('OAuth state validation failed or session expired'));
  }

  try {
    const tokenData = await exchangeSlackCode(code);

    await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: tokenData.accessToken,
        teamId: tokenData.teamId,
        teamName: tokenData.teamName,
      },
      create: {
        userId,
        accessToken: tokenData.accessToken,
        teamId: tokenData.teamId,
        teamName: tokenData.teamName,
      },
    });

    logger.info({ userId, teamName: tokenData.teamName }, '🔌 Slack workspace connected successfully');

    res.redirect(`${env.FRONTEND_URL}?slack=connected`);
  } catch (error) {
    logger.error({ err: error }, 'Slack OAuth callback failure');
    res.redirect(`${env.FRONTEND_URL}?error=slack_connect_failed`);
  }
}

/**
 * Returns connection status of user's Slack workspace.
 */
export async function getSlackStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;

    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
      select: {
        teamName: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        connected: !!connection,
        teamName: connection?.teamName || null,
        connectedAt: connection?.createdAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Disconnects the user's Slack workspace connection.
 */
export async function disconnectSlack(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session.userId!;

    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      return next(new NotFoundError('No Slack connection found to disconnect'));
    }

    await prisma.slackConnection.delete({
      where: { userId },
    });

    logger.info({ userId }, '🔌 Slack workspace disconnected successfully');

    res.json({
      success: true,
      message: 'Slack disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
}
