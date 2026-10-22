/**
 * Environment variables, validated once at startup.
 *
 * All apps share the `.env` file in the repository root. We validate it with
 * zod so a typo or missing value fails fast with a clear message, instead of
 * causing a confusing error somewhere deep in the code later.
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// apps/api/src/config/env.ts → repository root is four folders up.
config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)), quiet: true });

/** An optional string: empty values in .env ("KEY=") are treated as "not set". */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.url().transform((url) => url.replace(/\/$/, '')),
  DATABASE_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be a long random string (run `npm run setup`)'),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  EMAIL_FROM: z.string().default('PhotoMatch AI <no-reply@photomatch.ai>'),

  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,

  AI_SERVICE_URL: z.url().default('http://localhost:8000'),
  AI_SERVICE_SECRET: z.string().min(1, 'AI_SERVICE_SECRET is required (run `npm run setup`)'),
  FACE_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.45),

  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_BOT_USERNAME: optional.transform((name) => name?.replace(/^@/, '')),
  TELEGRAM_WEBHOOK_SECRET: optional,

  WHATSAPP_ACCESS_TOKEN: optional,
  WHATSAPP_PHONE_NUMBER_ID: optional,
  WHATSAPP_BUSINESS_NUMBER: optional.transform((number) => number?.replace(/\D/g, '')),
  WHATSAPP_VERIFY_TOKEN: optional,
  WHATSAPP_APP_SECRET: optional,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables in .env:');
  for (const issue of parsed.error.issues) console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;

/**
 * Which optional features are switched on. A feature is "on" only when all of
 * its keys are filled in, so the app keeps working while you set things up.
 */
export const features = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  smtp: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD),
  uploads: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME && env.TELEGRAM_WEBHOOK_SECRET),
  whatsapp: Boolean(
    env.WHATSAPP_ACCESS_TOKEN &&
      env.WHATSAPP_PHONE_NUMBER_ID &&
      env.WHATSAPP_BUSINESS_NUMBER &&
      env.WHATSAPP_VERIFY_TOKEN &&
      env.WHATSAPP_APP_SECRET,
  ),
};
