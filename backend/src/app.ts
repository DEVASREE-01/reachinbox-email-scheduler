import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { redis, isRedisAvailable } from './config/redis';
import { emailQueue } from './queues/email.queue';
import { isAuthenticated } from './middleware/auth.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

import authRouter from './routes/auth.routes';
import senderRouter from './routes/sender.routes';
import campaignRouter from './routes/campaign.routes';
import emailRouter from './routes/email.routes';
import slackRouter from './routes/slack.routes';
import healthRouter from './routes/health.routes';

const app = express();

// Trust reverse proxy in production to allow transmission of Secure cookies
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 1. Basic Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP temporarily if Bull Board assets are blocked
}));
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 2. Session Store Setup
const redisStore = new RedisStore({
  client: redis,
  prefix: 'reachinbox-sess:',
});

app.use(
  session({
    store: redisStore,
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
    },
  })
);

// 3. Authenticated Bull Board Setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});

app.use(
  '/admin/queues',
  isAuthenticated,
  (req, res, next) => {
    if (!isRedisAvailable || redis.status !== 'ready') {
      res.status(503).send('<h1>503 Service Unavailable</h1><p>The queue monitor is offline because Redis is disconnected.</p>');
      return;
    }
    next();
  },
  serverAdapter.getRouter()
);

// 4. API Routes
app.use('/api/auth', authRouter);
app.use('/api/senders', senderRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/emails', emailRouter);
app.use('/api/slack', slackRouter);
app.use('/api/health', healthRouter);

// 5. Fallback Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
