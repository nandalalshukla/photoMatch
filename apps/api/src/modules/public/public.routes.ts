/**
 * Public endpoints (no sign-in needed).
 *
 *   GET /api/public/config         which optional features are switched on
 *   GET /api/public/events/:code   the guest landing page behind the QR code
 */
import { Router } from 'express';
import { features } from '../../config/env.js';
import { prisma } from '../../lib/db.js';
import { HttpError } from '../../lib/http-error.js';
import { getEventProgress } from '../events/events.service.js';
import { telegramLink, whatsappLink } from '../bots/links.js';

export const publicRouter = Router();

// The web app uses this to show/hide the Google button and bot buttons.
publicRouter.get('/config', (_req, res) => {
  res.json({
    google: features.google,
    uploads: features.uploads,
    telegram: features.telegram,
    whatsapp: features.whatsapp,
  });
});

publicRouter.get('/events/:code', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { publicCode: String(req.params.code).toUpperCase() } });
  // A switched-off event looks exactly like a missing one, so codes can't be probed.
  if (!event || !event.guestAccess) throw new HttpError(404, 'Event not found');

  const progress = await getEventProgress(event.id);
  const ready = progress.state === 'READY';

  res.json({
    event: {
      name: event.name,
      state: progress.state,
      livenessRequired: event.livenessRequired,
      // Only hand out bot links once guests can actually search.
      telegramLink: ready ? telegramLink(event.publicCode) : null,
      whatsappLink: ready ? whatsappLink(event.publicCode) : null,
    },
  });
});
