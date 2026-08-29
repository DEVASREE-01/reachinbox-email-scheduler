import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { esClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';

/**
 * Health check endpoint checking API, PostgreSQL, Redis, and Elasticsearch connectivity.
 */
export async function checkHealth(req: Request, res: Response) {
  const status = {
    api: 'up',
    database: 'down',
    redis: 'down',
    elasticsearch: 'down',
  };

  let hasError = false;

  // 1. Check PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'up';
  } catch (error) {
    logger.error({ err: error }, 'Healthcheck: PostgreSQL is down');
    hasError = true;
  }

  // 2. Check Redis
  try {
    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      status.redis = 'up';
    }
  } catch (error) {
    logger.error({ err: error }, 'Healthcheck: Redis is down');
    hasError = true;
  }

  // 3. Check Elasticsearch (Non-blocking: if down, we warn but don't fail the whole app)
  try {
    const health = await esClient.ping();
    if (health) {
      status.elasticsearch = 'up';
    }
  } catch (error) {
    logger.warn({ err: error }, 'Healthcheck: Elasticsearch is down');
  }

  const statusCode = hasError ? 503 : 200;

  res.status(statusCode).json({
    success: !hasError,
    status: hasError ? 'error' : 'ok',
    services: status,
  });
}
