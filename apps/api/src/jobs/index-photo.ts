/**
 * Job: find the faces in one event photo and store their embeddings.
 *
 *   Cloudinary (resized copy) → AI service /faces/detect → Face rows (pgvector)
 */
import { aiClient, downloadBuffer } from '../lib/ai-client.js';
import { resizedUrl } from '../lib/cloudinary.js';
import { prisma } from '../lib/db.js';
import { savePhotoFaces } from '../lib/face-store.js';
import type { IndexPhotoJob } from '../lib/queue.js';

export async function indexPhoto({ photoId }: IndexPhotoJob) {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return; // deleted in the meantime — nothing to do

  const image = await downloadBuffer(resizedUrl(photo.url));
  const faces = await aiClient.detectFaces(image);
  await savePhotoFaces(photo, faces.map((face) => face.embedding));
}

/** Called after the last retry failed: show the photo as failed in the dashboard. */
export async function markPhotoFailed({ photoId }: IndexPhotoJob) {
  await prisma.photo.updateMany({ where: { id: photoId }, data: { status: 'FAILED' } });
}
