import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface SlackOAuthResult {
  accessToken: string;
  teamId: string;
  teamName: string;
}

/**
 * Exchanges the Slack authorization code for an access token.
 */
export async function exchangeSlackCode(code: string): Promise<SlackOAuthResult> {
  const params = new URLSearchParams();
  params.append('client_id', env.SLACK_CLIENT_ID);
  params.append('client_secret', env.SLACK_CLIENT_SECRET);
  params.append('code', code);
  params.append('redirect_uri', env.SLACK_REDIRECT_URI);

  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.data.ok) {
      throw new Error(`Slack OAuth Error: ${response.data.error}`);
    }

    return {
      accessToken: response.data.access_token,
      teamId: response.data.team.id,
      teamName: response.data.team.name,
    };
  } catch (error) {
    logger.error({ err: error }, '❌ Failed to exchange Slack OAuth code');
    throw error;
  }
}

/**
 * Finds a suitable channel to post messages to.
 * Fallback priority: "general" channel -> first channel found.
 */
async function findPostChannel(accessToken: string): Promise<string> {
  try {
    const response = await axios.get('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { types: 'public_channel', exclude_archived: true },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error);
    }

    const channels = response.data.channels || [];
    if (channels.length === 0) {
      throw new Error('No public channels found');
    }

    const generalChannel = channels.find((c: any) => c.name === 'general');
    return generalChannel ? generalChannel.id : channels[0].id;
  } catch (error) {
    logger.warn({ err: error }, '⚠️ Could not fetch channel list, falling back to "#general" channel name');
    return '#general';
  }
}

/**
 * Sends a rate-limit alert to Slack.
 * Deduplicates notifications using a Redis lock key.
 */
export async function sendRateLimitNotification(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  hourWindow: string
) {
  const notifiedKey = `slack-rate-limit-notified:${senderEmail}:${hourWindow}`;

  // Atomic SET with NX (Not Exists) and EX (Expiration of 1 hour / 3600 seconds)
  const lockAcquired = await redis.set(notifiedKey, 'true', 'EX', 3600, 'NX');
  if (!lockAcquired) {
    logger.info({ senderEmail, hourWindow }, 'Slack notification already sent for this sender window');
    return;
  }

  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!connection) {
      logger.debug({ userId }, 'Slack is not connected for user; skipping alert notification.');
      // Remove lock so if slack is connected later in the same hour, it can alert
      await redis.del(notifiedKey);
      return;
    }

    const channelId = await findPostChannel(connection.accessToken);

    const messageText = `⚠️ *Email Rate Limit Reached*

*Sender:* ${senderEmail}
*Hourly Limit:* ${hourlyLimit}
*Current Window:* ${hourWindow}
_Additional scheduled emails have been deferred to the next available hour._`;

    const postResponse = await axios.post(
      'https://slack.com/api/chat.postMessage',
      {
        channel: channelId,
        text: messageText,
      },
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );

    if (!postResponse.data.ok) {
      throw new Error(postResponse.data.error);
    }

    logger.info({ senderEmail, channelId }, '📣 Slack rate limit alert sent successfully');
  } catch (error) {
    logger.error({ err: error, senderEmail }, '❌ Failed to send Slack rate limit notification');
    // Delete the lock so it can be retried on subsequent rate limit triggers
    await redis.del(notifiedKey);
  }
}
