# PhotoMatch AI — API & worker (`apps/api`)

Node.js + Express 5 + TypeScript. Two processes share this code:

| Process | Command | Does |
| --- | --- | --- |
| API | `npm run dev` | HTTP endpoints, auth, webhooks; serves the built web app in production |
| Worker | `npm run worker` | Background jobs: face indexing and selfie searches |

In development, [`tsx`](https://tsx.is) runs the TypeScript directly and restarts on every save.
For production, `npm run build` compiles `src/` to plain JavaScript in `dist/`
(`tsconfig.build.json`), and `npm start` / `npm run worker:start` run it with
`node` — no TypeScript tooling is involved at runtime. `npm run typecheck` checks types.

## Endpoints

| Path | Who | File |
| --- | --- | --- |
| `/api/auth/*` | everyone | better-auth (`src/lib/auth.ts`) |
| `/api/events/*` | signed-in organizers | `src/modules/events/events.routes.ts` |
| `/api/public/config`, `/api/public/events/:code` | everyone | `src/modules/public/public.routes.ts` |
| `/api/galleries/:id`, `/api/galleries/:id/liveness` | guests with the link | `src/modules/galleries/galleries.routes.ts` |
| `/api/webhooks/telegram`, `/api/webhooks/whatsapp` | Telegram / Meta (signed) | `src/modules/bots/webhooks.routes.ts` |
| `/api/admin/*` | admins | `src/modules/admin/admin.routes.ts` |

## Conventions

- **Routes are thin**: validate input with zod, call a service function, return JSON.
- **Errors**: `throw new HttpError(404, 'Event not found')` anywhere — `middleware/error-handler.ts` turns it into `{ error }`. Express 5 catches async errors, so no try/catch boilerplate.
- **Raw SQL** only for pgvector, all in `src/lib/face-store.ts`.
- **Optional integrations** check `features.*` from `src/config/env.ts`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run build` | compile to `dist/` for production |
| `npm run db:migrate` | create/apply migrations in development |
| `npm run db:deploy` | apply migrations in production |
| `npm run db:studio` | browse the database in Prisma Studio |
| `npm run bots:setup` | register the Telegram webhook, print WhatsApp webhook values |
| `npm run admin:promote -- you@example.com` | make a user admin |
| `npm test` | unit tests |
