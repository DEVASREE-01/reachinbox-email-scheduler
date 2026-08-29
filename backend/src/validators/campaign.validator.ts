import { z } from 'zod';
import { env } from '../config/env';

export const scheduleCampaignSchema = z.object({
  senderId: z.string().uuid('Invalid sender ID format'),
  subject: z.string().min(1, 'Subject is required and cannot be empty'),
  body: z.string().min(1, 'Body is required and cannot be empty'),
  startTime: z.preprocess(
    (val) => (typeof val === 'string' || val instanceof Date ? new Date(val) : val),
    z.date().refine((date) => date.getTime() >= Date.now() - 60000, {
      message: 'Start time must be in the present or future',
    })
  ),
  delayMs: z.preprocess(
    (val) => Number(val),
    z.number().int().min(env.MIN_SEND_DELAY_MS, `Delay between emails must be at least ${env.MIN_SEND_DELAY_MS}ms`)
  ),
  hourlyLimit: z.preprocess(
    (val) => Number(val),
    z.number().int().positive('Hourly email limit must be greater than 0')
  ),
  recipients: z.array(z.string().email('Invalid email address format')).min(1, 'At least one recipient is required'),
});

export type ScheduleCampaignSchema = z.infer<typeof scheduleCampaignSchema>;
