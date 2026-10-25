/**
 * Business logic for organizers: events, their photos, co-organizers and the
 * contributor upload link. Routes (events.routes.ts, contribute.routes.ts) stay
 * thin and call these functions.
 */
import { prisma } from '../../lib/db.js';
import { HttpError } from '../../lib/http-error.js';
import { enqueueIndexPhotos } from '../../lib/queue.js';
import { sendEmail } from '../../lib/email.js';
import {
  createUploadSignature,
  deleteEventImages,
  deleteImage,
  eventFolder,
  isOurImageUrl,
} from '../../lib/cloudinary.js';
import { env } from '../../config/env.js';
import { accessibleEventsWhere, can, generateUploadToken, normalizeEmail, roleFor, type EventAction, type Viewer } from './access.js';
import { calculateProgress, generatePublicCode } from './event-progress.js';

export const MAX_PHOTOS_PER_EVENT = 5000;
export const MAX_COORGANIZERS = 20;

/** The signed-in user, as the service needs it. */
export type User = Viewer & { name: string };

/**
 * Load an event this user may open and check they may do `action`.
 * Events they can't open behave as if they don't exist (404, so ids can't be probed).
 */
async function getEventFor(user: User, eventId: string, action: EventAction = 'view') {
  const event = await prisma.event.findFirst({ where: { id: eventId, ...accessibleEventsWhere(user) } });
  if (!event) throw new HttpError(404, 'Event not found');
  const role = roleFor(event, user);
  if (!can(role, action)) throw new HttpError(403, 'Only the event owner can do this');
  return { event, role };
}

/**
 * Photo counts per status for several events, in a single query. Only approved
 * photos count — a contributor's upload waiting for review must not hold up guests.
 */
async function progressByEvent(eventIds: string[]) {
  const rows = await prisma.photo.groupBy({
    by: ['eventId', 'status'],
    where: { eventId: { in: eventIds }, approved: true },
    _count: { _all: true },
  });
  return new Map(
    eventIds.map((id) => {
      const counts = Object.fromEntries(rows.filter((r) => r.eventId === id).map((r) => [r.status, r._count._all]));
      return [id, calculateProgress(counts)];
    }),
  );
}

/** Progress of a single event (used by the guest page and the bots). */
export async function getEventProgress(eventId: string) {
  return (await progressByEvent([eventId])).get(eventId)!;
}

/** The link guests open (it is also what the QR code contains). */
export const guestUrl = (publicCode: string) => `${env.APP_URL}/e/${publicCode}`;
/** The link contributors open to add their photos. */
export const uploadUrl = (token: string) => `${env.APP_URL}/u/${token}`;

export async function listEvents(user: User) {
  const events = await prisma.event.findMany({
    where: accessibleEventsWhere(user),
    orderBy: { createdAt: 'desc' },
    include: {
      // First indexed photo is used as the cover image on the dashboard card.
      photos: { where: { status: 'READY', approved: true }, take: 1, orderBy: { createdAt: 'asc' }, select: { url: true } },
      _count: { select: { searches: true, photos: { where: { approved: false } } } },
    },
  });
  const progress = await progressByEvent(events.map((e) => e.id));

  return events.map(({ photos, _count, uploadToken: _token, ...event }) => ({
    ...event,
    role: roleFor(event, user),
    coverUrl: photos[0]?.url ?? null,
    searchCount: _count.searches,
    pendingCount: _count.photos,
    progress: progress.get(event.id)!,
  }));
}

export async function getEvent(user: User, eventId: string) {
  const { event, role } = await getEventFor(user, eventId);
  const [progress, searchCount, pendingCount, members, owner] = await Promise.all([
    getEventProgress(eventId),
    prisma.guestSearch.count({ where: { eventId } }),
    prisma.photo.count({ where: { eventId, approved: false } }),
    prisma.eventMember.findMany({ where: { eventId }, orderBy: { createdAt: 'asc' }, select: { id: true, email: true, createdAt: true } }),
    prisma.user.findUnique({ where: { id: event.ownerId }, select: { name: true, email: true } }),
  ]);
  const { uploadToken, ...rest } = event;
  return {
    ...rest,
    role,
    owner,
    members,
    guestUrl: guestUrl(event.publicCode),
    uploadUrl: uploadToken ? uploadUrl(uploadToken) : null,
    searchCount,
    pendingCount,
    progress,
  };
}

export async function createEvent(user: User, data: { name: string; livenessRequired: boolean }) {
  return prisma.event.create({
    data: { ...data, ownerId: user.id, publicCode: generatePublicCode() },
  });
}

export async function updateEvent(
  user: User,
  eventId: string,
  data: { name?: string; guestAccess?: boolean; livenessRequired?: boolean },
) {
  await getEventFor(user, eventId, 'edit');
  return prisma.event.update({ where: { id: eventId }, data });
}

export async function deleteEvent(user: User, eventId: string) {
  await getEventFor(user, eventId, 'deleteEvent');
  // Remove the images from Cloudinary first. If that fails we still delete the
  // event — leftover files can be cleaned up later, a stuck event cannot.
  await deleteEventImages(eventId).catch((error) => console.error('Cloudinary cleanup failed', error));
  // Faces, photos, members, searches and chat sessions are removed by the database (onDelete: Cascade).
  await prisma.event.delete({ where: { id: eventId } });
}

// ---------- Uploading (shared by organizers and the contributor upload link) ----------

export type UploadedPhoto = { publicId: string; url: string; contentHash?: string; width?: number; height?: number };
/** Who is adding photos. Contributors (upload link) have no account and their photos need approval. */
export type Uploader = { userId?: string; name: string; approved: boolean };

export async function getUploadSignature(user: User, eventId: string) {
  await getEventFor(user, eventId, 'upload');
  return createUploadSignature(eventId);
}

/**
 * Which of these file fingerprints (SHA-256 hashes) does the event already have?
 * The browser asks before uploading, so photos already in the event are skipped
 * instead of being uploaded, stored and analysed a second time.
 */
export async function existingHashesIn(eventId: string, hashes: string[]) {
  const rows = await prisma.photo.findMany({
    where: { eventId, contentHash: { in: hashes } },
    select: { contentHash: true },
  });
  return rows.map((row) => row.contentHash!);
}

export async function findExistingHashes(user: User, eventId: string, hashes: string[]) {
  await getEventFor(user, eventId, 'upload');
  return existingHashesIn(eventId, hashes);
}

/**
 * Save photos the browser uploaded to Cloudinary and queue face indexing.
 * Duplicates are skipped by the database:
 *   • the same upload registered twice (network retry) → same cloudinaryId
 *   • the same photo uploaded again → same contentHash in this event
 */
export async function addPhotos(eventId: string, photos: UploadedPhoto[], uploader: Uploader) {
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
    data: photos.map((p) => ({
      eventId,
      cloudinaryId: p.publicId,
      contentHash: p.contentHash,
      url: p.url,
      width: p.width,
      height: p.height,
      uploadedById: uploader.userId,
      uploaderName: uploader.name,
      approved: uploader.approved,
    })),
    skipDuplicates: true,
    select: { id: true, cloudinaryId: true },
  });
  // Faces of photos awaiting approval are indexed too, so approving is instant;
  // guest searches only match approved photos (see face-store.ts).
  await enqueueIndexPhotos(created.map((p) => p.id));

  // A photo that was skipped because the event already has the same content
  // (e.g. two browser tabs uploading the same file at once) was still uploaded
  // to Cloudinary. Delete that extra copy so no orphan files are left behind.
  // (Skipped retries of the *same* upload are left alone — that file is in use.)
  const createdIds = new Set(created.map((p) => p.cloudinaryId));
  const skipped = photos.filter((p) => !createdIds.has(p.publicId)).map((p) => p.publicId);
  if (skipped.length) {
    const inUse = await prisma.photo.findMany({ where: { cloudinaryId: { in: skipped } }, select: { cloudinaryId: true } });
    const inUseIds = new Set(inUse.map((p) => p.cloudinaryId));
    const orphans = skipped.filter((id) => !inUseIds.has(id));
    await Promise.all(orphans.map((id) => deleteImage(id).catch((error) => console.error('Cloudinary delete failed', error))));
  }

  return { added: created.length, duplicates: photos.length - created.length };
}

/** Organizers' and co-organizers' own uploads are approved straight away. */
export async function registerPhotos(user: User, eventId: string, photos: UploadedPhoto[]) {
  await getEventFor(user, eventId, 'upload');
  return addPhotos(eventId, photos, { userId: user.id, name: user.name, approved: true });
}

export async function listPhotos(user: User, eventId: string) {
  await getEventFor(user, eventId);
  return prisma.photo.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, url: true, width: true, height: true, status: true, faceCount: true, approved: true, uploaderName: true },
  });
}

/** Delete photos from Cloudinary and the database (their faces and matches cascade). */
async function removePhotos(eventId: string, photoIds: string[]) {
  const photos = await prisma.photo.findMany({ where: { id: { in: photoIds }, eventId }, select: { id: true, cloudinaryId: true } });
  await Promise.all(photos.map((p) => deleteImage(p.cloudinaryId).catch((error) => console.error('Cloudinary delete failed', error))));
  await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } });
  return photos.length;
}

export async function deletePhoto(user: User, eventId: string, photoId: string) {
  await getEventFor(user, eventId, 'review');
  if (!(await removePhotos(eventId, [photoId]))) throw new HttpError(404, 'Photo not found');
}

// ---------- Reviewing contributed photos ----------

/** Approve contributed photos: from now on guests can find them. */
export async function approvePhotos(user: User, eventId: string, photoIds: string[]) {
  await getEventFor(user, eventId, 'review');
  const { count } = await prisma.photo.updateMany({ where: { id: { in: photoIds }, eventId, approved: false }, data: { approved: true } });
  return { approved: count };
}

/** Reject contributed photos: they are deleted for good. Only photos still awaiting review can be rejected here. */
export async function rejectPhotos(user: User, eventId: string, photoIds: string[]) {
  await getEventFor(user, eventId, 'review');
  const pending = await prisma.photo.findMany({ where: { id: { in: photoIds }, eventId, approved: false }, select: { id: true } });
  return { rejected: await removePhotos(eventId, pending.map((p) => p.id)) };
}

// ---------- Upload link ----------

/** Switch the upload link on, or replace it with a new one (the old link stops working). */
export async function resetUploadLink(user: User, eventId: string) {
  await getEventFor(user, eventId, 'edit');
  const event = await prisma.event.update({ where: { id: eventId }, data: { uploadToken: generateUploadToken() } });
  return { uploadUrl: uploadUrl(event.uploadToken!) };
}

export async function disableUploadLink(user: User, eventId: string) {
  await getEventFor(user, eventId, 'edit');
  await prisma.event.update({ where: { id: eventId }, data: { uploadToken: null } });
}

/** The event behind an upload link, or a 404 if the link is wrong or switched off. */
export async function getEventByUploadToken(token: string) {
  const event = token ? await prisma.event.findUnique({ where: { uploadToken: token } }) : null;
  if (!event) throw new HttpError(404, 'This upload link isn\'t active');
  return event;
}

// ---------- Co-organizers ----------

export async function inviteMember(user: User, eventId: string, rawEmail: string) {
  const { event } = await getEventFor(user, eventId, 'manageMembers');
  const email = normalizeEmail(rawEmail);
  if (email === normalizeEmail(user.email)) throw new HttpError(400, "That's you — you already own this event");
  if ((await prisma.eventMember.count({ where: { eventId } })) >= MAX_COORGANIZERS) {
    throw new HttpError(400, `An event can have at most ${MAX_COORGANIZERS} co-organizers`);
  }
  const existing = await prisma.eventMember.findUnique({ where: { eventId_email: { eventId, email } } });
  if (existing) throw new HttpError(409, 'This person is already a co-organizer');

  const member = await prisma.eventMember.create({ data: { eventId, email }, select: { id: true, email: true, createdAt: true } });
  await sendEmail({
    to: email,
    subject: `${user.name} invited you to "${event.name}" on PhotoMatch`,
    heading: `Help run "${event.name}"`,
    body: `${user.name} added you as a co-organizer. Sign in — or create a free account — with this email address (${email}) to add photos and review the ones guests send.`,
    buttonText: 'Open the event',
    buttonUrl: `${env.APP_URL}/sign-in?next=${encodeURIComponent(`/dashboard/events/${eventId}`)}`,
  }).catch((error) => console.error('Invite email failed', error)); // the invite still works without the email
  return member;
}

export async function removeMember(user: User, eventId: string, memberId: string) {
  await getEventFor(user, eventId, 'manageMembers');
  const { count } = await prisma.eventMember.deleteMany({ where: { id: memberId, eventId } });
  if (!count) throw new HttpError(404, 'Co-organizer not found');
}
