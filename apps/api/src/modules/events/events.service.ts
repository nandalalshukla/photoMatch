/**
 * Business logic for organizers: events and their photos.
 * Routes (events.routes.ts) stay thin and call these functions.
 */
import { prisma } from '../../lib/db.js';
import { HttpError } from '../../lib/http-error.js';
import { enqueueIndexPhotos } from '../../lib/queue.js';
import {
  createUploadSignature,
  deleteEventImages,
  deleteImage,
  eventFolder,
  isOurImageUrl,
} from '../../lib/cloudinary.js';
import { env } from '../../config/env.js';
import { calculateProgress, generatePublicCode } from './event-progress.js';

export const MAX_PHOTOS_PER_EVENT = 5000;

/** Load an event only if it belongs to this user — otherwise behave as if it doesn't exist. */
async function getOwnedEvent(eventId: string, userId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, ownerId: userId } });
  if (!event) throw new HttpError(404, 'Event not found');
  return event;
}

/** Photo counts per status for several events, in a single query. */
async function progressByEvent(eventIds: string[]) {
  const rows = await prisma.photo.groupBy({
    by: ['eventId', 'status'],
    where: { eventId: { in: eventIds } },
    _count: { _all: true },
  });
  return new Map(
    eventIds.map((id) => {
      const counts = Object.fromEntries(rows.filter((r) => r.eventId === id).map((r) => [r.status, r._count._all]));
      return [id, calculateProgress(counts)];
    }),
  );
}

/** The link guests open (it is also what the QR code contains). */
export const guestUrl = (publicCode: string) => `${env.APP_URL}/e/${publicCode}`;

export async function listEvents(userId: string) {
  const events = await prisma.event.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      // First indexed photo is used as the cover image on the dashboard card.
      photos: { where: { status: 'READY' }, take: 1, orderBy: { createdAt: 'asc' }, select: { url: true } },
      _count: { select: { searches: true } },
    },
  });
  const progress = await progressByEvent(events.map((e) => e.id));

  return events.map(({ photos, _count, ...event }) => ({
    ...event,
    coverUrl: photos[0]?.url ?? null,
    searchCount: _count.searches,
    progress: progress.get(event.id)!,
  }));
}

export async function getEvent(userId: string, eventId: string) {
  const event = await getOwnedEvent(eventId, userId);
  const [progress, searchCount] = await Promise.all([
    progressByEvent([eventId]),
    prisma.guestSearch.count({ where: { eventId } }),
  ]);
  return { ...event, guestUrl: guestUrl(event.publicCode), searchCount, progress: progress.get(eventId)! };
}

export async function createEvent(userId: string, data: { name: string; livenessRequired: boolean }) {
  return prisma.event.create({
    data: { ...data, ownerId: userId, publicCode: generatePublicCode() },
  });
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: { name?: string; guestAccess?: boolean; livenessRequired?: boolean },
) {
  await getOwnedEvent(eventId, userId);
  return prisma.event.update({ where: { id: eventId }, data });
}

export async function deleteEvent(userId: string, eventId: string) {
  await getOwnedEvent(eventId, userId);
  // Remove the images from Cloudinary first. If that fails we still delete the
  // event — leftover files can be cleaned up later, a stuck event cannot.
  await deleteEventImages(eventId).catch((error) => console.error('Cloudinary cleanup failed', error));
  // Faces, photos, searches and chat sessions are removed by the database (onDelete: Cascade).
  await prisma.event.delete({ where: { id: eventId } });
}

export async function getUploadSignature(userId: string, eventId: string) {
  await getOwnedEvent(eventId, userId);
  return createUploadSignature(eventId);
}

type UploadedPhoto = { publicId: string; url: string; width?: number; height?: number };

/**
 * Called by the browser after it uploaded photos to Cloudinary.
 * Saves them and queues face indexing. Safe to call twice with the same photos
 * (e.g. after a network retry): duplicates are skipped thanks to the unique cloudinaryId.
 */
export async function registerPhotos(userId: string, eventId: string, photos: UploadedPhoto[]) {
  await getOwnedEvent(eventId, userId);

  // Never trust the browser: the files must be in THIS event's folder in OUR Cloudinary account.
  const folder = `${eventFolder(eventId)}/`;
  for (const photo of photos) {
    if (!photo.publicId.startsWith(folder) || !isOurImageUrl(photo.url) || !photo.url.includes(photo.publicId)) {
      throw new HttpError(400, 'Photo does not belong to this event');
    }
  }

  const existing = await prisma.photo.count({ where: { eventId } });
  if (existing + photos.length > MAX_PHOTOS_PER_EVENT) {
    throw new HttpError(400, `An event can have at most ${MAX_PHOTOS_PER_EVENT} photos`);
  }

  const created = await prisma.photo.createManyAndReturn({
    data: photos.map((p) => ({ eventId, cloudinaryId: p.publicId, url: p.url, width: p.width, height: p.height })),
    skipDuplicates: true,
    select: { id: true },
  });
  await enqueueIndexPhotos(created.map((p) => p.id));
  return { added: created.length };
}

export async function listPhotos(userId: string, eventId: string) {
  await getOwnedEvent(eventId, userId);
  return prisma.photo.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, url: true, width: true, height: true, status: true, faceCount: true },
  });
}

export async function deletePhoto(userId: string, eventId: string, photoId: string) {
  await getOwnedEvent(eventId, userId);
  const photo = await prisma.photo.findFirst({ where: { id: photoId, eventId } });
  if (!photo) throw new HttpError(404, 'Photo not found');
  await deleteImage(photo.cloudinaryId).catch((error) => console.error('Cloudinary delete failed', error));
  await prisma.photo.delete({ where: { id: photoId } }); // its faces + matches cascade
}
