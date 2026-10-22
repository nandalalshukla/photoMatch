/**
 * Image storage on Cloudinary.
 *
 * Upload design: the browser uploads photos DIRECTLY to Cloudinary using a
 * short-lived signature that our API creates. Big files never pass through
 * our server, so there are no temp files, no upload queue and no memory spikes.
 * The signature locks the upload to one folder per event, so a user can only
 * put files into events they own.
 */
import { v2 as cloudinary } from 'cloudinary';
import { env, features } from '../config/env.js';
import { HttpError } from './http-error.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

function assertConfigured() {
  if (!features.uploads) throw new HttpError(503, 'Photo uploads are not configured yet (missing Cloudinary keys in .env)');
}

/** Every event gets its own folder, e.g. "photomatch/events/<eventId>". */
export const eventFolder = (eventId: string) => `photomatch/events/${eventId}`;

/** Signature the browser sends to Cloudinary together with each file. Valid for about 1 hour. */
export function createUploadSignature(eventId: string) {
  assertConfigured();
  const timestamp = Math.round(Date.now() / 1000);
  const folder = eventFolder(eventId);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, env.CLOUDINARY_API_SECRET!);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    signature,
  };
}

/** True when `url` is an image in OUR Cloudinary account (not some random website). */
export const isOurImageUrl = (url: string) =>
  url.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`);

/**
 * Ask Cloudinary for a smaller copy of an image by adding a transformation to
 * the URL ("c_limit,w_1600" = shrink to max 1600px wide, never enlarge).
 * Face detection doesn't need 6000px originals, and smaller files are much faster.
 */
export const resizedUrl = (url: string, maxSide = 1600) =>
  url.replace('/image/upload/', `/image/upload/c_limit,w_${maxSide},h_${maxSide}/`);

export async function deleteImage(publicId: string) {
  if (!features.uploads) return;
  await cloudinary.uploader.destroy(publicId);
}

/** Delete every image of an event, then the (now empty) folder. */
export async function deleteEventImages(eventId: string) {
  if (!features.uploads) return;
  await cloudinary.api.delete_resources_by_prefix(`${eventFolder(eventId)}/`);
  await cloudinary.api.delete_folder(eventFolder(eventId)).catch(() => undefined); // folder may not exist
}
