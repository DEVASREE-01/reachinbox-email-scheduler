import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase, prisma } from './config/database';
import { connectRedis, redis } from './config/redis';
import { connectElasticsearch } from './config/elasticsearch';
import { initializeSearchIndex } from './services/search.service';
import { reconcileJobs } from './services/scheduler.service';
import { startEmailWorker } from './queues/email.worker';
import { emailQueue } from './queues/email.queue';
import { logger } from './utils/logger';

let server: http.Server;
let worker: ReturnType<typeof startEmailWorker> | null = null;

async function bootstrap() {
  logger.info('🚀 Starting ReachInbox Email Scheduler Backend Bootstrap...');

  try {
    // 1. Connect core database and cache
    await connectDatabase();
    await connectRedis();

    // 2. Connect Elasticsearch search index
    const esConnected = await connectElasticsearch();
    if (esConnected) {
      await initializeSearchIndex().catch((e) => {
        logger.error({ err: e }, 'Elasticsearch index initialization failed');
      });
    }

    // 3. Run startup recovery reconciliation
    await reconcileJobs();

    // 4. Start BullMQ worker in the same application process (modular monolith style)
    worker = startEmailWorker();

    // 5. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 HTTP Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📊 Bull Board available at http://localhost:${env.PORT}/admin/queues`);
    });

  } catch (error) {
    logger.fatal({ err: error }, '💥 Server bootstrap failed. Exiting process.');
    process.exit(1);
  }
}

/**
 * Handles graceful connection cleanups.
 */
async function gracefulShutdown(signal: string) {
  logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

  // Close HTTP Server first to stop accepting new requests
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('🔒 HTTP server closed');
        resolve();
      });
    });
  }

  // Close Worker to stop pulling new jobs
  if (worker) {
    await worker.close();
    logger.info('🔒 BullMQ email worker closed');
  }

  // Close Queue connection
  await emailQueue.close();
  logger.info('🔒 BullMQ email queue connection closed');

  // Disconnect Redis
  await redis.quit();
  logger.info('🔒 Redis client disconnected');

  // Disconnect Database
  await prisma.$disconnect();
  logger.info('🔒 PostgreSQL client disconnected');

  logger.info('👋 Graceful shutdown completed. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap();
