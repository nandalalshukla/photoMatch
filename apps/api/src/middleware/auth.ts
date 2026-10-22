/**
 * Route guards.
 *
 *   requireAuth  → the request must come from a signed-in, verified user
 *   requireAdmin → ...and that user must have the "admin" role
 *
 * better-auth reads the session cookie for us; we just ask it who is signed in.
 */
import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, type Session } from '../lib/auth.js';
import { HttpError } from '../lib/http-error.js';

// Teach TypeScript that `req.user` exists after requireAuth has run.
declare global {
  namespace Express {
    interface Request {
      user?: Session['user'];
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) throw new HttpError(401, 'Please sign in to continue');
  req.user = session.user;
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Admins only');
  next();
};
