/**
 * Background jobs with pg-boss.
 *
 * pg-boss stores jobs in PostgreSQL (in its own "pgboss" schema), so we get a
 * reliable queue with retries WITHOUT running Redis. The API process only
 * adds jobs; the worker process (src/worker.ts) runs them.
 *
 * Two kinds of jobs:
 *   index-photo   → find faces in one event photo and save their embeddings
 *   search-selfie → find a guest's photos from the selfie they sent to a bot
 */
import { PgBoss } from 'pg-boss';
import { env } from '../config/env.js';
import type { Channel } from '@prisma/client';

export const QUEUES = {
  indexPhoto: 'index-photo',
  searchSelfie: 'search-selfie',
} as const;

/** How many times a failed job is retried (with growing delays) before we give up. */
export const RETRY_LIMIT = 3;
// retryBackoff = wait longer after each failure (e.g. when the AI service is briefly down).
const RETRY_OPTIONS = { retryLimit: RETRY_LIMIT, retryDelay: 5, retryBackoff: true };

export type IndexPhotoJob = { photoId: string };
export type SearchSelfieJob = { searchId: string; channel: Channel; mediaId: string };

export const boss = new PgBoss(env.DATABASE_URL);
boss.on('error', (error) => console.error('[queue]', error));

/** Connect to the database and make sure our queues exist. Safe to call more than once. */
let starting: Promise<void> | undefined;
export function startQueue() {
  starting ??= (async () => {
    await boss.start();
    for (const name of Object.values(QUEUES)) {
      await boss.createQueue(name, RETRY_OPTIONS);
    }
  })();
  return starting;
}

export async function enqueueIndexPhotos(photoIds: string[]) {
  await startQueue();
  if (photoIds.length === 0) return;
  // insert() adds many jobs in one database round-trip.
  await boss.insert(
    QUEUES.indexPhoto,
    photoIds.map((photoId) => ({ data: { photoId } satisfies IndexPhotoJob, ...RETRY_OPTIONS })),
  );
}

export async function enqueueSelfieSearch(job: SearchSelfieJob) {
  await startQueue();
  await boss.send(QUEUES.searchSelfie, job, RETRY_OPTIONS);
}
