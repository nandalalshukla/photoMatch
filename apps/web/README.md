# PhotoMatch AI — web app (`apps/web`)

React 19 + Vite + Tailwind CSS 4 + TanStack Query + React Router.

- `npm run dev` → http://localhost:5173 (requests to `/api` are proxied to the API on :3000)
- `npm run build` → `dist/`, which the API serves in production

## Where things are

| Folder | Contents |
| --- | --- |
| `src/lib/` | `api.ts` (fetch wrapper), `auth-client.ts` (better-auth), `upload.ts` (direct Cloudinary uploads), `images.ts` (thumbnail URLs), `types.ts`, `cn.ts` (join class names), `use-dismiss.ts` (Escape / click-outside, scroll lock) |
| `src/components/ui/` | the design system — Button, Input, Toggle, Card, StatCard, Badge (pastel tag), Alert (callout), Skeleton, EmptyState, ProgressBar, Modal, Lightbox, Menu, PageHeader, Properties, Avatar. Import from `components/ui`; `index.ts` lists which file holds what |
| `src/components/landing/` | the landing page's copy (`content.ts`) |
| `src/components/` | layouts (`DashboardLayout` is the sidebar shell), route guards, `LivenessCheck`, `PhotoDropzone`, `StoryMode` (the guest "Play memories" slideshow), `TableCard` (printable QR card), `BrandIcons` |
| `src/pages/` | one file per screen (`App.tsx` lists every URL) |

## Design system

Calm and simple, in the spirit of Notion: white pages, one font, hairline borders, emoji as icons,
and nothing that moves unless it means something. The message comes first. All tokens live in
`src/index.css` and become Tailwind classes:

- **Colors** — `ink` (text), `muted` / `faint` (secondary text), `line` (borders), `paper` (soft gray
  surfaces like the sidebar and callouts), `hover` (row hover), and `brand-*` blue for actions and links.
  Status uses pastel tags: `bg-tag-green` + `text-tag-green-text`, and so on (see `<Badge>`).
- **Type** — Inter only. Bold for titles, regular for everything else.
- **Pages** — every dashboard page starts like a Notion page: an emoji icon, a bold title (`<PageHeader>`)
  and, for items like an event, a list of properties (`<Properties>`). Sections are separated by hairlines,
  not boxed in cards.
- **Feedback** — `<Alert>` is a callout block (emoji + text on a soft background); loading content uses
  `<Skeleton>`, not a spinner.
- **Motion** — only a short `animate-enter` fade on page load, `animate-scale-in` / `animate-fade-in` for
  overlays, and the `skeleton` sheen. Everything respects "reduce motion".

When building a new screen, reach for the components in `components/ui` first, and keep copy short,
plain and true to what the product does.
