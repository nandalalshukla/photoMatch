/**
 * The contributor upload link — no sign-in. Anyone with the link can add
 * photos to the event; they wait for an organizer to approve them before
 * guests can find them. The organizer can switch the link off or reset it.
 *
 *   GET  /api/contribute/:token                     event name (to show on the upload page)
 *   POST /api/contribute/:token/upload-signature    permission to upload to Cloudinary
 *   POST /api/contribute/:token/photos/check        which of these photos does the event already have?
 *   POST /api/contribute/:token/photos              register uploaded photos, with the contributor's name
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { createUploadSignature } from '../../lib/cloudinary.js';
import { addPhotos, existingHashesIn, getEventByUploadToken } from './events.service.js';
import { photosSchema, sha256 } from './upload-schemas.js';

export const contributeRouter = Router();

// The link is public, so keep strangers from hammering it. Generous enough for
// someone uploading hundreds of photos (the browser sends them in chunks of 50).
contributeRouter.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));

const checkSchema = z.object({ hashes: z.array(sha256).min(1).max(1000) });
const contributionSchema = photosSchema.extend({ name: z.string().trim().min(1).max(60) });

const token = (value: string | string[] | undefined) => String(value);

contributeRouter.get('/:token', async (req, res) => {
  const event = await getEventByUploadToken(token(req.params.token));
  res.json({ event: { name: event.name } });
});

contributeRouter.post('/:token/upload-signature', async (req, res) => {
  const event = await getEventByUploadToken(token(req.params.token));
  res.json(createUploadSignature(event.id));
});

contributeRouter.post('/:token/photos/check', async (req, res) => {
  const event = await getEventByUploadToken(token(req.params.token));
  res.json({ existing: await existingHashesIn(event.id, checkSchema.parse(req.body).hashes) });
});

contributeRouter.post('/:token/photos', async (req, res) => {
  const event = await getEventByUploadToken(token(req.params.token));
  const { name, photos } = contributionSchema.parse(req.body);
  res.status(201).json(await addPhotos(event.id, photos, { name, approved: false }));
});
