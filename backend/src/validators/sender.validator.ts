import { z } from 'zod';

export const createSenderSchema = z.object({
  email: z.string().email('Invalid email address format'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1, 'SMTP port must be a positive integer')
  ),
  smtpUser: z.string().min(1, 'SMTP user is required'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
});

export type CreateSenderSchema = z.infer<typeof createSenderSchema>;
