/**
 * Prisma CLI configuration.
 * Its only job here is to load the shared root .env (so DATABASE_URL is known)
 * and tell Prisma where the schema and migrations live.
 */
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
});
