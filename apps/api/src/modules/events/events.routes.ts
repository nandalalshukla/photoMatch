/**
 * Organizer endpoints — all require a signed-in user. The owner and invited
 * co-organizers can use them (see access.ts for who may do what).
 *
 *   GET    /api/events                              my events (owned + shared with me)
 *   POST   /api/events                              create an event
 *   GET    /api/events/:eventId                     event details, progress, co-organizers, upload link
 *   PATCH  /api/events/:eventId                     rename / toggle guest access / toggle liveness
 *   DELETE /api/events/:eventId                     delete event, photos and face data (owner)
 *   POST   /api/events/:eventId/upload-signature    permission to upload to Cloudinary
 *   POST   /api/events/:eventId/photos/check        which of these photos (by fingerprint) does the event already have?
 *   POST   /api/events/:eventId/photos              register uploaded photos
 *   GET    /api/events/:eventId/photos              list photos (approved and awaiting review)
 *   DELETE /api/events/:eventId/photos/:photoId     delete one photo
 *   POST   /api/events/:eventId/photos/approve      approve contributed photos
 *   POST   /api/events/:eventId/photos/reject       reject (delete) contributed photos
 *   POST   /api/events/:eventId/upload-link         switch the contributor upload link on, or reset it
 *   DELETE /api/events/:eventId/upload-link         switch the upload link off
 *   POST   /api/events/:eventId/members             invite a co-organizer by email (owner)
 *   DELETE /api/events/:eventId/members/:memberId   remove a co-organizer (owner)
 */
import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import * as events from './events.service.js';
import { photosSchema, sha256 } from './upload-schemas.js';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// Request body shapes. zod throws a ZodError (→ 400) when the input is wrong.
const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  livenessRequired: z.boolean().default(false),
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  guestAccess: z.boolean().optional(),
  livenessRequired: z.boolean().optional(),
});
const checkSchema = z.object({ hashes: z.array(sha256).min(1).max(1000) }); // browser checks in chunks
const photoIdsSchema = z.object({ photoIds: z.array(z.uuid()).min(1).max(500) });
const inviteSchema = z.object({ email: z.email().max(254) });

/** Express 5 types route params as string | string[]; ours are always plain strings. */
const param = (value: string | string[] | undefined) => String(value);
const user = (req: Request) => req.user! as events.User;
const eventId = (req: Request) => param(req.params.eventId);

eventsRouter.get('/', async (req, res) => {
  res.json({ events: await events.listEvents(user(req)) });
});

eventsRouter.post('/', async (req, res) => {
  const event = await events.createEvent(user(req), createSchema.parse(req.body));
  res.status(201).json({ event });
});

eventsRouter.get('/:eventId', async (req, res) => {
  res.json({ event: await events.getEvent(user(req), eventId(req)) });
});

eventsRouter.patch('/:eventId', async (req, res) => {
  res.json({ event: await events.updateEvent(user(req), eventId(req), updateSchema.parse(req.body)) });
});

eventsRouter.delete('/:eventId', async (req, res) => {
  await events.deleteEvent(user(req), eventId(req));
  res.status(204).end();
});

eventsRouter.post('/:eventId/upload-signature', async (req, res) => {
  res.json(await events.getUploadSignature(user(req), eventId(req)));
});

eventsRouter.post('/:eventId/photos/check', async (req, res) => {
  const { hashes } = checkSchema.parse(req.body);
  res.json({ existing: await events.findExistingHashes(user(req), eventId(req), hashes) });
});

eventsRouter.post('/:eventId/photos', async (req, res) => {
  const { photos } = photosSchema.parse(req.body);
  res.status(201).json(await events.registerPhotos(user(req), eventId(req), photos));
});

eventsRouter.get('/:eventId/photos', async (req, res) => {
  res.json({ photos: await events.listPhotos(user(req), eventId(req)) });
});

eventsRouter.post('/:eventId/photos/approve', async (req, res) => {
  res.json(await events.approvePhotos(user(req), eventId(req), photoIdsSchema.parse(req.body).photoIds));
});

eventsRouter.post('/:eventId/photos/reject', async (req, res) => {
  res.json(await events.rejectPhotos(user(req), eventId(req), photoIdsSchema.parse(req.body).photoIds));
});

eventsRouter.delete('/:eventId/photos/:photoId', async (req, res) => {
  await events.deletePhoto(user(req), eventId(req), param(req.params.photoId));
  res.status(204).end();
});

eventsRouter.post('/:eventId/upload-link', async (req, res) => {
  res.json(await events.resetUploadLink(user(req), eventId(req)));
});

eventsRouter.delete('/:eventId/upload-link', async (req, res) => {
  await events.disableUploadLink(user(req), eventId(req));
  res.status(204).end();
});

eventsRouter.post('/:eventId/members', async (req, res) => {
  const member = await events.inviteMember(user(req), eventId(req), inviteSchema.parse(req.body).email);
  res.status(201).json({ member });
});

eventsRouter.delete('/:eventId/members/:memberId', async (req, res) => {
  await events.removeMember(user(req), eventId(req), param(req.params.memberId));
  res.status(204).end();
});
