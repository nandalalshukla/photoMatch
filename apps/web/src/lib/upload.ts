/**
 * Uploading event photos — straight from the browser to Cloudinary.
 *
 *   1. Ask our API for a signature (proves we may upload into this event's folder).
 *   2. Upload files to Cloudinary, a few at the same time.
 *   3. Tell our API which photos arrived (in chunks); it queues face indexing.
 *
 * The photos never pass through our own server, so uploads of thousands of
 * photos don't slow it down.
 */
import { api, send } from './api';

type Signature = { uploadUrl: string; apiKey: string; timestamp: number; folder: string; signature: string };
type Uploaded = { publicId: string; url: string; width: number; height: number };

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_MB = 20;
const PARALLEL_UPLOADS = 4;
const REGISTER_CHUNK = 50;

export type UploadProgress = { done: number; failed: number; total: number };

async function uploadOne(file: File, signature: Signature): Promise<Uploaded> {
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
  const signature = await send<Signature>('POST', `/events/${eventId}/upload-signature`);
  const progress: UploadProgress = { done: 0, failed: 0, total: files.length };
  const uploaded: Uploaded[] = [];
  const queue = [...files];

  /** Save a chunk of uploaded photos in our database. */
  const register = async (photos: Uploaded[]) => {
    if (photos.length) await api(`/events/${eventId}/photos`, { method: 'POST', body: JSON.stringify({ photos }) });
  };

  // A few "lanes" each take the next file from the queue until it's empty.
  const lane = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      try {
        uploaded.push(await uploadOne(file, signature));
        progress.done++;
        if (uploaded.length >= REGISTER_CHUNK) await register(uploaded.splice(0, REGISTER_CHUNK));
      } catch {
        progress.failed++;
      }
      onProgress({ ...progress });
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, lane));
  await register(uploaded); // whatever is left

  return progress;
}
