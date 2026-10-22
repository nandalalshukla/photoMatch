/**
 * One shared Prisma client for the whole process.
 * Prisma keeps a connection pool inside, so creating it once is important.
 */
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

/**
 * pgvector expects vectors written as text like "[0.1,0.2,...]".
 * Used with raw SQL: `${toVector(embedding)}::vector`.
 */
export const toVector = (embedding: number[]) => `[${embedding.join(',')}]`;
