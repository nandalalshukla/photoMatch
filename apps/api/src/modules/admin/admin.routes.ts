/**
 * Admin-only endpoints (role = "admin").
 * User management (list, ban, set role...) comes from better-auth's admin
 * plugin at /api/auth/admin/*, so we only add app statistics here.
 *
 *   GET /api/admin/overview   totals for the dashboard cards
 *   GET /api/admin/events     latest events across all organizers
 */
import { Router } from 'express';
import { prisma } from '../../lib/db.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', async (_req, res) => {
  const [users, events, photos, faces, searches] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.photo.count(),
    prisma.face.count(),
    prisma.guestSearch.count(),
  ]);
  res.json({ overview: { users, events, photos, faces, searches } });
});

adminRouter.get('/events', async (_req, res) => {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      createdAt: true,
      guestAccess: true,
      livenessRequired: true,
      owner: { select: { name: true, email: true } },
      _count: { select: { photos: true, searches: true } },
    },
  });
  res.json({ events });
});
