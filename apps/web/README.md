# PhotoMatch AI — web app (`apps/web`)

React 19 + Vite + Tailwind CSS 4 + TanStack Query + React Router.

- `npm run dev` → http://localhost:5173 (requests to `/api` are proxied to the API on :3000)
- `npm run build` → `dist/`, which the API serves in production

## Where things are

| Folder | Contents |
| --- | --- |
| `src/lib/` | `api.ts` (fetch wrapper), `auth-client.ts` (better-auth), `upload.ts` (direct Cloudinary uploads), `images.ts` (thumbnail URLs), `types.ts` |
| `src/components/` | `ui.tsx` (Button, Input, Card, Toggle, Modal, ...), layouts, route guards, `LivenessCheck.tsx`, `PhotoDropzone.tsx` |
| `src/pages/` | one file per screen (`App.tsx` lists every URL) |

Brand colors are defined once in `src/index.css` (`--color-brand-*`, `brand-gradient`).
