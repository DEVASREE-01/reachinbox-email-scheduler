import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisConfig = {
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
  connectTimeout: 5000,       // 5 seconds timeout
  retryStrategy(times: number) {
    if (times > 10) {
      return null; // Stop retrying to avoid blocking start
    }
    return Math.min(times * 100, 2000);
  }
};

export let isRedisAvailable = false;
export let redis: Redis;

export function createRedisClient(customConfig = {}): Redis {
  const baseConfig = { ...redisConfig, ...customConfig };
  let client: Redis;
  
  if (env.REDIS_URL) {
    const options: any = { ...baseConfig };
    if (env.REDIS_URL.startsWith('rediss://')) {
      options.tls = {
        rejectUnauthorized: false
      };
    }
    client = new Redis(env.REDIS_URL, options);
  } else {
    client = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      ...baseConfig,
    });
  }

  // Attach a default error handler to prevent unhandled exceptions on background connections
  client.on('error', (err) => {
    logger.debug({ err: err.message }, 'Redis client connection error');
  });

  return client;
}

try {
  redis = createRedisClient();

  redis.on('connect', () => {
    isRedisAvailable = true;
  });
} catch (err) {
  // ignore
}

export async function connectRedis() {
  if (!redis) {
    isRedisAvailable = false;
    throw new Error('Redis client is not initialized');
  }

  if (env.REDIS_URL) {
    logger.info('Using managed Redis via REDIS_URL');
  } else {
    logger.info('Using local Redis');
  }

  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      isRedisAvailable = true;
      logger.info('🔌 Connected to Redis successfully (Verified with PING)');
      return;
    }
    throw new Error(`Unexpected Redis ping response: ${pong}`);
  } catch (err: any) {
    isRedisAvailable = false;
    if (env.NODE_ENV === 'development') {
      logger.warn('⚠️ Redis unavailable: background email scheduling queue is disabled in development mode.');
      return;
    }
    logger.fatal({ err }, '❌ Redis connection verification failed (PING failed).');
    throw err;
  }
}
