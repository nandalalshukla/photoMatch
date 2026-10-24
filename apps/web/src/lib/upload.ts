/**
 * Uploading event photos — straight from the browser to Cloudinary.
 *
 *   1. Fingerprint every file (SHA-256 of its bytes) and drop exact duplicates:
 *      copies inside this selection, and photos the event already has.
 *   2. Ask our API for a signature (proves we may upload into this event's folder).
 *   3. Upload the remaining files to Cloudinary, a few at the same time.
 *   4. Tell our API which photos arrived (in chunks); it queues face indexing.
 *
 * The photos never pass through our own server, so uploads of thousands of
 * photos don't slow it down. Because duplicates are skipped by content, you can
 * re-add a whole folder after an interrupted upload and only the missing photos
 * are sent.
 */
import { api, send } from './api';

type Signature = { uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string };
type Uploaded = { publicId: string; url: string; contentHash?: string; width: number; height: number };

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_MB = 20;
const PARALLEL_UPLOADS = 4;
const REGISTER_CHUNK = 50;
const CHECK_CHUNK = 500;

export type UploadProgress = {
  phase: 'checking' | 'uploading';
  checked: number; // files fingerprinted so far
  done: number;
  failed: number;
  duplicates: number; // skipped: same content already in this selection or in the event
  total: number; // files chosen
};

/** A cheap identity for a file on disk — catches the same file being picked twice. */
const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

/**
 * Add newly chosen files to a list, ignoring ones that are already in it
 * (same name, size and modified date). Returns the new list and how many were ignored.
 */
export function mergeFiles(current: File[], incoming: File[]) {
  const seen = new Set(current.map(fileKey));
  const added = incoming.filter((file) => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { files: [...current, ...added], duplicates: incoming.length - added.length };
}

/**
 * SHA-256 fingerprint of a file's contents, as 64 hex characters. Two files
 * with identical bytes always get the same fingerprint, whatever their names.
 * The browser computes it natively; it only works on https:// or localhost,
 * so elsewhere we skip fingerprinting (and duplicate checks) instead of failing.
 */
async function fingerprint(file: File): Promise<string | undefined> {
  if (!crypto?.subtle) return undefined;
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Ask the API which of these fingerprints the event already has (in chunks). */
async function existingHashes(eventId: string, hashes: string[]) {
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += CHECK_CHUNK) {
    const chunk = hashes.slice(i, i + CHECK_CHUNK);
    const result = await send<{ existing: string[] }>('POST', `/events/${eventId}/photos/check`, { hashes: chunk });
    result.existing.forEach((hash) => existing.add(hash));
  }
  return existing;
}

async function uploadOne(file: File, signature: Signature): Promise<Omit<Uploaded, 'contentHash'>> {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('folder', signature.folder);
  form.append('signature', signature.signature);

  const response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Upload failed');
  return { publicId: body.public_id, url: body.secure_url, width: body.width, height: body.height };
}

export async function uploadEventPhotos(
  eventId: string,
  files: File[],
  onProgress: (progress: UploadProgress) => void,
) {
  const progress: UploadProgress = { phase: 'checking', checked: 0, done: 0, failed: 0, duplicates: 0, total: files.length };
  const report = () => onProgress({ ...progress });
  report();

  // --- Step 1: fingerprint, then drop duplicates ---
  const hashed: { file: File; hash?: string }[] = [];
  for (const file of files) {
    hashed.push({ file, hash: await fingerprint(file) }); // one at a time keeps memory low
    progress.checked++;
    if (progress.checked % 10 === 0) report();
  }
  const alreadyInEvent = await existingHashes(eventId, hashed.flatMap((h) => (h.hash ? [h.hash] : [])));
  const seen = new Set<string>();
  const queue = hashed.filter(({ hash }) => {
    if (!hash) return true; // couldn't fingerprint → upload anyway
    if (alreadyInEvent.has(hash) || seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
  progress.duplicates = files.length - queue.length;
  progress.phase = 'uploading';
  report();
  if (queue.length === 0) return progress;

  // --- Steps 2–4: upload what's left ---
  const signature = await send<Signature>('POST', `/events/${eventId}/upload-signature`);
  const uploaded: Uploaded[] = [];

  /** Save a chunk of uploaded photos in our database. */
  const register = async (photos: Uploaded[]) => {
    if (!photos.length) return;
    const result = await api<{ added: number; duplicates: number }>(`/events/${eventId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ photos }),
    });
    // The database may still reject a duplicate (e.g. another tab uploaded the same photo meanwhile).
    progress.duplicates += result.duplicates;
    progress.done -= result.duplicates;
  };

  // A few "lanes" each take the next file from the queue until it's empty.
  const lane = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        uploaded.push({ ...(await uploadOne(item.file, signature)), contentHash: item.hash });
        progress.done++;
        if (uploaded.length >= REGISTER_CHUNK) await register(uploaded.splice(0, REGISTER_CHUNK));
      } catch {
        progress.failed++;
      }
      report();
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, lane));
  await register(uploaded); // whatever is left
  report();

  return progress;
}
