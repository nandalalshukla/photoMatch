/**
 * The Express application: security headers, body parsing and all routes.
 * (server.ts starts it; tests can import it without opening a port.)
 */
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { auth } from './lib/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { publicRouter } from './modules/public/public.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';

export const app = express();

// We usually run behind a proxy (Vite in dev, a load balancer in production).
// This makes req.ip the real visitor IP, which rate limiting relies on.
app.set('trust proxy', 1);

// Secure HTTP headers. The Content-Security-Policy lists the only outside
// places the web app may load images from or send data to.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.googleusercontent.com'],
        'connect-src': ["'self'", 'https://api.cloudinary.com', 'https://res.cloudinary.com'],
      },
    },
  }),
);

// better-auth handles everything under /api/auth (sign-up, sign-in, Google,
// email verification, sessions...). It must come BEFORE express.json() because
// it reads the request body itself.
app.all('/api/auth/*splat', toNodeHandler(auth));

// Parse JSON bodies. We also keep the raw bytes: WhatsApp signs the exact body
// it sends, and we need those bytes to verify the signature.
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buffer;
    },
  }),
);
// Signed cookies (used for the "liveness passed" gallery pass).
app.use(cookieParser(env.BETTER_AUTH_SECRET));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/public', publicRouter);
app.use('/api/events', eventsRouter);

// Unknown API route → JSON 404 (instead of the web app's HTML).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// In production the API also serves the built web app, so everything lives on
// one domain: no CORS setup and auth cookies just work.
const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  // Any other path is a page of the single-page app → send index.html.
  app.get('/*splat', (_req, res) => res.sendFile(`${webDist}/index.html`));
}

app.use(errorHandler);
