/**
 * Background worker process: `npm run worker`.
 *
 * Runs the slow jobs (face indexing, selfie searches) outside the web API, so
 * uploading 2,000 photos never makes the website slow. You can run several
 * workers at once; pg-boss makes sure each job is processed only once.
 */
import type { Job } from 'pg-boss';
import { indexPhoto, markPhotoFailed } from './jobs/index-photo.js';
import { markSearchFailed, searchSelfie } from './jobs/search-selfie.js';
import { boss, QUEUES, RETRY_LIMIT, startQueue, type IndexPhotoJob, type SearchSelfieJob } from './lib/queue.js';

/**
 * Wrap a job handler: if it throws on the LAST allowed attempt, run `onGiveUp`
 * (e.g. mark the photo as failed) before letting pg-boss record the failure.
 */
function withRetries<T>(handler: (data: T) => Promise<void>, onGiveUp: (data: T) => Promise<void>) {
  return async ([job]: Job<T>[]) => {
    try {
      await handler(job.data);
    } catch (error) {
      console.error(`[worker] ${job.name} failed (attempt ${job.retryCount + 1}/${RETRY_LIMIT + 1}):`, error);
      if (job.retryCount >= RETRY_LIMIT) await onGiveUp(job.data).catch(console.error);
      throw error;
    }
  };
}

await startQueue();

// localConcurrency = jobs processed in parallel by this worker. The AI service
// handles one image at a time, so a small number is enough.
await boss.work<IndexPhotoJob>(
  QUEUES.indexPhoto,
  { localConcurrency: 2, pollingIntervalSeconds: 1 },
  withRetries(indexPhoto, markPhotoFailed),
);
await boss.work<SearchSelfieJob>(
  QUEUES.searchSelfie,
  { localConcurrency: 2, pollingIntervalSeconds: 1 },
  withRetries(searchSelfie, markSearchFailed),
);
console.log('👷 PhotoMatch AI worker started — waiting for jobs');

// Finish running jobs before exiting (Ctrl+C or a deploy restart).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await boss.stop({ graceful: true });
    process.exit(0);
  });
}
