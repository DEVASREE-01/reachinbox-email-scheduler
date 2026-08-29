import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let transporter: nodemailer.Transporter | null = null;
let dynamicCredentials: { user: string; pass: string } | null = null;

/**
 * Initializes the connection pool for Ethereal/SMTP sending.
 * Dynamically creates test credentials if none are provided.
 */
export async function getSMTPTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  let host = env.ETHEREAL_HOST;
  let port = env.ETHEREAL_PORT;
  let user = env.ETHEREAL_USER;
  let pass = env.ETHEREAL_PASSWORD;

  if (!user || !pass) {
    if (dynamicCredentials) {
      user = dynamicCredentials.user;
      pass = dynamicCredentials.pass;
    } else {
      logger.info('🔑 SMTP credentials not provided. Generating dynamic Ethereal SMTP test account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        host = testAccount.smtp.host;
        port = testAccount.smtp.port;
        user = testAccount.user;
        pass = testAccount.pass;
        dynamicCredentials = { user, pass };
        logger.info({ user, pass }, '🎉 Dynamic Ethereal test account created successfully');
      } catch (error) {
        logger.error({ err: error }, '❌ Failed to create dynamic Ethereal test account');
        throw error;
      }
    }
  }

  // Safely assert non-nullability to satisfy Nodemailer typings
  const authUser = user!;
  const authPass = pass!;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // Use SSL/TLS for port 465, false for 587 or others
    auth: {
      user: authUser,
      pass: authPass,
    },
    pool: true, // Enable Nodemailer transport pooling
    maxConnections: env.WORKER_CONCURRENCY,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    logger.info(`✅ SMTP Pool connection established on ${host}:${port}`);
  } catch (error) {
    logger.error({ err: error }, '❌ SMTP connection verification failed');
    transporter = null;
    throw error;
  }

  return transporter;
}

export interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(options: SendMailOptions) {
  const mailTransporter = await getSMTPTransporter();
  const info = await mailTransporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info({ messageId: info.messageId, previewUrl }, `📬 Ethereal Preview URL: ${previewUrl}`);
  } else {
    logger.info({ messageId: info.messageId }, '📬 Email sent successfully');
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
}
