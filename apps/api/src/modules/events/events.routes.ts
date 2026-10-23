/**
 * Organizer endpoints — all require a signed-in user.
 *
 *   GET    /api/events                              list my events
 *   POST   /api/events                              create an event
 *   GET    /api/events/:eventId                     event details + progress
 *   PATCH  /api/events/:eventId                     rename / toggle guest access / toggle liveness
 *   DELETE /api/events/:eventId                     delete event, photos and face data
 *   POST   /api/events/:eventId/upload-signature    permission to upload to Cloudinary
 *   POST   /api/events/:eventId/photos/check        which of these photos (by fingerprint) does the event already have?
 *   POST   /api/events/:eventId/photos              register uploaded photos
 *   GET    /api/events/:eventId/photos              list photos
 *   DELETE /api/events/:eventId/photos/:photoId     delete one photo
 */
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import * as events from './events.service.js';

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
// A SHA-256 fingerprint written as 64 hex characters.
const sha256 = z.string().regex(/^[a-f0-9]{64}$/, 'must be a SHA-256 hex string');
const checkSchema = z.object({ hashes: z.array(sha256).min(1).max(1000) }); // browser checks in chunks
const photosSchema = z.object({
  photos: z
    .array(
      z.object({
        publicId: z.string().min(1).max(300),
        url: z.url().max(1000),
        contentHash: sha256.optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    )
    .min(1)
    .max(100), // the browser sends photos in chunks
});

/** Express 5 types route params as string | string[]; ours are always plain strings. */
const param = (value: string | string[] | undefined) => String(value);

eventsRouter.get('/', async (req, res) => {
  res.json({ events: await events.listEvents(req.user!.id) });
});

eventsRouter.post('/', async (req, res) => {
  const event = await events.createEvent(req.user!.id, createSchema.parse(req.body));
  res.status(201).json({ event });
});

eventsRouter.get('/:eventId', async (req, res) => {
  res.json({ event: await events.getEvent(req.user!.id, param(req.params.eventId)) });
});

eventsRouter.patch('/:eventId', async (req, res) => {
  const event = await events.updateEvent(req.user!.id, param(req.params.eventId), updateSchema.parse(req.body));
  res.json({ event });
});

eventsRouter.delete('/:eventId', async (req, res) => {
  await events.deleteEvent(req.user!.id, param(req.params.eventId));
  res.status(204).end();
});

eventsRouter.post('/:eventId/upload-signature', async (req, res) => {
  res.json(await events.getUploadSignature(req.user!.id, param(req.params.eventId)));
});

eventsRouter.post('/:eventId/photos/check', async (req, res) => {
  const { hashes } = checkSchema.parse(req.body);
  res.json({ existing: await events.findExistingHashes(req.user!.id, param(req.params.eventId), hashes) });
});

eventsRouter.post('/:eventId/photos', async (req, res) => {
  const { photos } = photosSchema.parse(req.body);
  res.status(201).json(await events.registerPhotos(req.user!.id, param(req.params.eventId), photos));
});

eventsRouter.get('/:eventId/photos', async (req, res) => {
  res.json({ photos: await events.listPhotos(req.user!.id, param(req.params.eventId)) });
});

eventsRouter.delete('/:eventId/photos/:photoId', async (req, res) => {
  await events.deletePhoto(req.user!.id, param(req.params.eventId), param(req.params.photoId));
  res.status(204).end();
});
