import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load and merge environment variables from root and backend .env files
const backendEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

const parsedEnv: Record<string, string> = { ...(process.env as Record<string, string>) };

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = dotenv.parse(content);
      for (const key in parsed) {
        const currentValue = parsedEnv[key];
        const isPlaceholder = !currentValue || 
                              currentValue.includes('placeholder') || 
                              currentValue === 'your_google_client_id.apps.googleusercontent.com' || 
                              currentValue === 'your_google_client_secret';
        
        if (isPlaceholder) {
          parsedEnv[key] = parsed[key];
        }
      }
    } catch (e) {
      console.warn(`⚠️ Failed to parse env file at ${filePath}`, e);
    }
  }
}

// Load root first, then backend (backend overrides root unless it's a placeholder)
loadEnvFile(rootEnvPath);
loadEnvFile(backendEnvPath);

// Sync back to process.env
for (const key in parsedEnv) {
  process.env[key] = parsedEnv[key];
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.preprocess((val) => Number(val), z.number().default(5000)),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SESSION_SECRET: z.string().min(16, 'Session secret must be at least 16 characters long'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  
  DATABASE_URL: z.string().url(),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.preprocess((val) => Number(val), z.number().default(6379)),
  REDIS_URL: z.string().optional(),
  
  ELASTICSEARCH_URL: z.string().url().default('http://localhost:9200'),
  ELASTICSEARCH_USERNAME: z.string().optional(),
  ELASTICSEARCH_PASSWORD: z.string().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  
  WORKER_CONCURRENCY: z.preprocess((val) => Number(val), z.number().default(10)),
  MIN_SEND_DELAY_MS: z.preprocess((val) => Number(val), z.number().default(2000)),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.preprocess((val) => Number(val), z.number().default(50)),
  
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),
  
  SLACK_CLIENT_ID: z.string(),
  SLACK_CLIENT_SECRET: z.string(),
  SLACK_REDIRECT_URI: z.string().url(),
  
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.preprocess((val) => Number(val), z.number().default(587)),
  ETHEREAL_USER: z.string().optional().or(z.literal('')),
  ETHEREAL_PASSWORD: z.string().optional().or(z.literal('')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

console.log('🔍 [Debug] Google OAuth Environment Variables:');
console.log(`   GOOGLE_CLIENT_ID: ${env.GOOGLE_CLIENT_ID}`);
console.log(`   GOOGLE_CLIENT_SECRET exists: ${!!env.GOOGLE_CLIENT_SECRET}`);
console.log(`   GOOGLE_CALLBACK_URL: ${env.GOOGLE_CALLBACK_URL}`);
