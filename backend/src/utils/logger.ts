import pino from 'pino';
import { env } from '../config/env';

const redactionPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  '*.accessToken',
  '*.googleId',
  '*.googleClientSecret',
  '*.slackClientSecret',
  '*.smtpPassword',
  '*.password',
  '*.sessionSecret',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: redactionPaths,
    censor: '[REDACTED]',
  },
  transport: env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
