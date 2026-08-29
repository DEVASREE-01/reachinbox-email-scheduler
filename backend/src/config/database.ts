import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export let isDatabaseConnected = false;

export async function connectDatabase() {
  try {
    await prisma.$connect();
    isDatabaseConnected = true;
    logger.info('🔌 Connected to PostgreSQL via Prisma');
  } catch (error) {
    isDatabaseConnected = false;
    logger.fatal({ err: error }, '❌ Failed to connect to PostgreSQL database. Exiting.');
    throw error;
  }
}
