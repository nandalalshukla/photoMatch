/**
 * A guest's private gallery (the link the bot sends).
 *
 *   GET  /api/galleries/:searchId           status + photos (if allowed)
 *   POST /api/galleries/:searchId/liveness  live face check → unlocks the photos
 *
 * LIVENESS PROTECTION (when the organizer enabled it for the event)
 * ---------------------------------------------------------------
 * Gallery links can be forwarded. To make sure only the guest themself can
 * open their photos, the page first asks for a live face check:
 *   1. The browser captures two webcam frames: looking straight, then head turned.
 *   2. The AI service checks it's a real, present person (anti-spoof model + head turn).
 *   3. We compare that live face with the selfie the guest sent to the bot.
 *   4. If both pass, we set a signed, httpOnly cookie that unlocks this one
 *      gallery for 30 minutes on this browser only.
 * Someone who receives a forwarded link has a different face → step 3 fails.
 */
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { AiImageError, aiClient } from '../../lib/ai-client.js';
import { prisma } from '../../lib/db.js';
import { similarityToSelfie } from '../../lib/face-store.js';
import { HttpError } from '../../lib/http-error.js';

export const galleriesRouter = Router();

const PASS_MINUTES = 30;
const MAX_LIVENESS_ATTEMPTS = 5;

// Webcam frames are kept in memory only (never written to disk), max 5 MB each.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 2 } });

// Liveness is expensive and security-sensitive: max 10 tries per minute per IP.
const livenessLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

const cookieName = (searchId: string) => `gallery_pass_${searchId}`;

/** True when this browser holds a valid, unexpired pass for this gallery. */
function hasValidPass(req: Request, searchId: string) {
  // cookie-parser verifies the signature; a tampered cookie comes back as `false`.
  const expiresAt = Number(req.signedCookies?.[cookieName(searchId)]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function givePass(res: Response, searchId: string) {
  const expiresAt = Date.now() + PASS_MINUTES * 60_000;
  res.cookie(cookieName(searchId), String(expiresAt), {
    signed: true, // can't be forged without our secret
    httpOnly: true, // JavaScript can't read it
    secure: env.APP_URL.startsWith('https://'),
    sameSite: 'strict',
    maxAge: PASS_MINUTES * 60_000,
    path: `/api/galleries/${searchId}`,
  });
}

async function findSearch(searchId: string) {
  // Gallery ids are random UUIDs; reject anything else before touching the database.
  if (!/^[0-9a-f-]{36}$/i.test(searchId)) throw new HttpError(404, 'Gallery not found');
  const search = await prisma.guestSearch.findUnique({
    where: { id: searchId },
    include: { event: { select: { name: true, livenessRequired: true, guestAccess: true } } },
  });
  if (!search || !search.event.guestAccess) throw new HttpError(404, 'Gallery not found');
  return search;
}

galleriesRouter.get('/:searchId', async (req, res) => {
  const searchId = String(req.params.searchId);
  const search = await findSearch(searchId);
  const locked = search.event.livenessRequired && !hasValidPass(req, searchId);

  // Photos are only loaded when the gallery is unlocked.
  const matches =
    search.status === 'COMPLETED' && !locked
      ? await prisma.guestMatch.findMany({
          where: { searchId },
          orderBy: { similarity: 'desc' },
          select: { similarity: true, photo: { select: { id: true, url: true, width: true, height: true } } },
        })
      : [];

  res.json({
    gallery: {
      eventName: search.event.name,
      status: search.status, // PENDING | COMPLETED | FAILED
      livenessRequired: search.event.livenessRequired,
      locked,
      attemptsLeft: Math.max(0, MAX_LIVENESS_ATTEMPTS - search.livenessAttempts),
      photos: matches.map((m) => ({ ...m.photo, similarity: m.similarity })),
    },
  });
});

const failureMessages: Record<string, string> = {
  NO_FACE: "We couldn't see your face. Make sure it's well lit and inside the frame.",
  MULTIPLE_FACES: 'Only you should be in front of the camera.',
  INVALID_IMAGE: 'The camera image could not be read. Please try again.',
  NOT_FACING_CAMERA: 'Look straight at the camera for the first photo.',
  HEAD_NOT_TURNED: 'Turn your head a bit more to the side for the second photo.',
  DIFFERENT_PEOPLE: 'Both photos must show the same person.',
  SPOOF_DETECTED: "We couldn't confirm a live person. Use your real face, not a photo or screen.",
  FACE_MISMATCH: "This face doesn't match the selfie sent for this gallery.",
};

galleriesRouter.post(
  '/:searchId/liveness',
  livenessLimiter,
  upload.fields([{ name: 'front', maxCount: 1 }, { name: 'turned', maxCount: 1 }]),
  async (req, res) => {
    const searchId = String(req.params.searchId);
    const search = await findSearch(searchId);
    if (!search.event.livenessRequired) return res.json({ passed: true });
    if (search.status !== 'COMPLETED') throw new HttpError(409, 'This gallery is not ready yet');
    if (search.livenessAttempts >= MAX_LIVENESS_ATTEMPTS) {
      throw new HttpError(429, 'Too many attempts. Send a new selfie to the bot to get a fresh link.', 'LOCKED');
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const front = files?.front?.[0]?.buffer;
    const turned = files?.turned?.[0]?.buffer;
    if (!front || !turned) throw new HttpError(400, 'Two camera frames are required');

    // Count the attempt BEFORE checking, so failed tries can't be repeated forever.
    await prisma.guestSearch.update({ where: { id: searchId }, data: { livenessAttempts: { increment: 1 } } });

    let reason: string | null = null;
    try {
      const result = await aiClient.liveness(front, turned);
      reason = result.reason;
      if (result.passed && result.embedding) {
        const similarity = await similarityToSelfie(searchId, result.embedding);
        if (similarity === null || similarity < env.FACE_MATCH_THRESHOLD) reason = 'FACE_MISMATCH';
      }
    } catch (error) {
      if (!(error instanceof AiImageError)) throw error;
      reason = error.code;
    }

    if (reason) {
      return res.json({ passed: false, reason, message: failureMessages[reason] ?? 'Please try again.' });
    }
    givePass(res, searchId);
    res.json({ passed: true });
  },
);
