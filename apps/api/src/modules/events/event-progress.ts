/**
 * Pure helpers about events — no database here, which makes them easy to test.
 */
import { randomInt } from 'node:crypto';
import type { PhotoStatus } from '@prisma/client';

export type EventState = 'EMPTY' | 'PROCESSING' | 'READY' | 'FAILED';

export type EventProgress = {
  total: number;
  processing: number;
  ready: number;
  failed: number;
  state: EventState;
};

/**
 * Turn "how many photos are in each status" into an overall event state.
 *   EMPTY      → no photos yet
 *   PROCESSING → some photos are still being analysed
 *   READY      → done, at least one photo indexed → guests can search
 *   FAILED     → done, but every photo failed
 */
export function calculateProgress(counts: Partial<Record<PhotoStatus, number>>): EventProgress {
  const processing = counts.PROCESSING ?? 0;
  const ready = counts.READY ?? 0;
  const failed = counts.FAILED ?? 0;
  const total = processing + ready + failed;

  let state: EventState = 'READY';
  if (total === 0) state = 'EMPTY';
  else if (processing > 0) state = 'PROCESSING';
  else if (ready === 0) state = 'FAILED';

  return { total, processing, ready, failed, state };
}

// No 0/O/1/I/L so codes are easy to read aloud and type.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A random 8-character event code like "K7P2QM9X" (~10^12 combinations). */
export function generatePublicCode() {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

/**
 * Find an event code inside any message text, e.g. "/start K7P2QM9X" or
 * "Find my photos for event K7P2QM9X". Codes are always upper case, which
 * keeps normal words in a sentence from being mistaken for a code.
 */
export function findPublicCode(text: string) {
  return text.match(/\b[A-HJKMNP-Z2-9]{8}\b/)?.[0];
}
