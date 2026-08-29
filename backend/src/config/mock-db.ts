import { Email, Campaign, Sender, User, SlackConnection, EmailStatus } from '@prisma/client';
import crypto from 'crypto';

export let mockUsers: User[] = [
  {
    id: 'dev-google-oauth-placeholder-id',
    googleId: 'dev-google-oauth-placeholder-id',
    name: 'Developer User',
    email: 'dev-user@reachinbox.com',
    avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export let mockSenders: Sender[] = [
  {
    id: 's-1',
    userId: 'dev-google-oauth-placeholder-id',
    email: 'growth@reachinbox.ai',
    smtpHost: 'smtp.ethereal.email',
    smtpPort: 587,
    smtpUser: 'growth@reachinbox.ai',
    smtpPassword: 'password',
    createdAt: new Date(Date.now() - 10000000),
    updatedAt: new Date(Date.now() - 10000000)
  },
  {
    id: 's-2',
    userId: 'dev-google-oauth-placeholder-id',
    email: 'sales@reachinbox.ai',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpUser: 'sales@reachinbox.ai',
    smtpPassword: 'password',
    createdAt: new Date(Date.now() - 20000000),
    updatedAt: new Date(Date.now() - 20000000)
  }
];

export let mockCampaigns: (Campaign & { sender?: { email: string }, _count?: { emails: number } })[] = [
  {
    id: 'c-1',
    userId: 'dev-google-oauth-placeholder-id',
    senderId: 's-1',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello {{firstName}},\n\nI wanted to share our Q3 product updates...',
    startTime: new Date(Date.now() + 15 * 60000),
    delayMs: 3000,
    hourlyLimit: 100,
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 3600000),
    sender: { email: 'growth@reachinbox.ai' },
    _count: { emails: 3 }
  },
  {
    id: 'c-2',
    userId: 'dev-google-oauth-placeholder-id',
    senderId: 's-2',
    subject: 'Partnership Proposal',
    body: 'Hi {{firstName}},\n\nHope this email finds you well. I was looking at your company...',
    startTime: new Date(Date.now() + 120 * 60000),
    delayMs: 5000,
    hourlyLimit: 50,
    createdAt: new Date(Date.now() - 7200000),
    updatedAt: new Date(Date.now() - 7200000),
    sender: { email: 'sales@reachinbox.ai' },
    _count: { emails: 3 }
  }
];

export let mockEmails: Email[] = [
  {
    id: 'e-1',
    campaignId: 'c-1',
    senderId: 's-1',
    recipient: 'john.doe@example.com',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello John,\n\nI wanted to share our Q3 product updates...',
    scheduledAt: new Date(Date.now() + 15 * 60000),
    sentAt: null,
    status: 'SCHEDULED',
    attempts: 0,
    bullJobId: 'job-1',
    messageId: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'e-2',
    campaignId: 'c-1',
    senderId: 's-1',
    recipient: 'jane.smith@example.com',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello Jane,\n\nI wanted to share our Q3 product updates...',
    scheduledAt: new Date(Date.now() + 30 * 60000),
    sentAt: null,
    status: 'PROCESSING',
    attempts: 1,
    bullJobId: 'job-2',
    messageId: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'e-3',
    campaignId: 'c-1',
    senderId: 's-1',
    recipient: 'error.user@example.com',
    subject: 'Q3 Product Update Outreach',
    body: 'Hello Error,\n\nI wanted to share our Q3 product updates...',
    scheduledAt: new Date(Date.now() + 5 * 60000),
    sentAt: null,
    status: 'SCHEDULED',
    attempts: 2,
    bullJobId: 'job-3',
    messageId: null,
    errorMessage: 'SMTP connection timeout',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'e-4',
    campaignId: 'c-2',
    senderId: 's-2',
    recipient: 'bob.harris@example.com',
    subject: 'Partnership Proposal',
    body: 'Hi Bob,\n\nHope this email finds you well...',
    scheduledAt: new Date(Date.now() - 10 * 60000),
    sentAt: new Date(Date.now() - 10 * 60000),
    status: 'SENT',
    attempts: 1,
    bullJobId: 'job-4',
    messageId: '<msg-12345@reachinbox.ai>',
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'e-5',
    campaignId: 'c-2',
    senderId: 's-2',
    recipient: 'failed.recipient@example.com',
    subject: 'Partnership Proposal',
    body: 'Hi Failed,\n\nHope this email finds you well...',
    scheduledAt: new Date(Date.now() - 20 * 60000),
    sentAt: null,
    status: 'FAILED',
    attempts: 3,
    bullJobId: 'job-5',
    messageId: null,
    errorMessage: '550 5.1.1 User Unknown',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'e-6',
    campaignId: 'c-2',
    senderId: 's-2',
    recipient: 'limited.user@example.com',
    subject: 'Partnership Proposal',
    body: 'Hi Limited,\n\nHope this email finds you well...',
    scheduledAt: new Date(Date.now() + 60 * 60000),
    sentAt: null,
    status: 'RATE_LIMITED',
    attempts: 1,
    bullJobId: 'job-6',
    messageId: null,
    errorMessage: 'Sender rate limit exceeded (50/hr)',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export let mockSlackConnections: SlackConnection[] = [];
