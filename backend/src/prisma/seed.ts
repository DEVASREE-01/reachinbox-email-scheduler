import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // 1. Create a default dev User
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      googleId: 'dev-google-oauth-placeholder-id',
      email: 'dev@example.com',
      name: 'ReachInbox Developer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    },
  });

  logger.info({ user: devUser.email }, '👤 Dev User seeded');

  // 2. Create a default Ethereal SMTP Sender for this user
  // This helps users test schedules immediately without having to write credentials manually
  const defaultSender = await prisma.sender.create({
    data: {
      userId: devUser.id,
      email: 'outreach@reachinbox.co',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: 'placeholder@ethereal.email',
      smtpPassword: 'placeholder_password',
    },
  });

  logger.info({ sender: defaultSender.email }, '📤 Default Ethereal SMTP Sender seeded');

  logger.info('🌱 Seeding database complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
