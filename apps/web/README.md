# PhotoMatch AI — web app (`apps/web`)

React 19 + Vite + Tailwind CSS 4 + TanStack Query + React Router.

- `npm run dev` → http://localhost:5173 (requests to `/api` are proxied to the API on :3000)
- `npm run build` → `dist/`, which the API serves in production

## Where things are

| Folder | Contents |
| --- | --- |
| `src/lib/` | `api.ts` (fetch wrapper), `auth-client.ts` (better-auth), `upload.ts` (direct Cloudinary uploads), `images.ts` (thumbnail URLs), `types.ts`, `cn.ts` (join class names), `use-dismiss.ts` (Escape / click-outside, scroll lock) |
| `src/components/ui/` | the design system — Button, Input, Toggle, Card, StatCard, Badge, Alert, Skeleton, EmptyState, ProgressBar, Modal, Lightbox, Menu, PageHeader, Avatar, Reveal. Import from `components/ui`; `index.ts` lists which file holds what |
| `src/components/landing/` | the landing page's interactive pieces — `FaceLens` (find-the-faces demo), `StoryPhone` (scroll-told how-it-works), `CompareSlider` (2,148 photos → your 23), `MomentsReel` (sideways film strip) — and all its copy in `content.ts` |
| `src/components/` | layouts, route guards, `LivenessCheck`, `PhotoDropzone`, `StoryMode` (the guest "Play memories" slideshow), `TableCard` (printable QR card), `BrandIcons` |
| `src/pages/` | one file per screen (`App.tsx` lists every URL) |
| `public/editorial/` | marketing photography (Unsplash License) — credits and swap instructions in `CREDITS.md` |

## Design system — "the darkroom"

PhotoMatch looks like a photo magazine: warm paper, ink, serif headlines and real photography.
The idea running through it is a darkroom — photos *develop* as they appear, a red *safelight*
marks what's live. All tokens live in `src/index.css` and become Tailwind classes:

- **Colors** — `paper` / `paper-deep` (backgrounds), `ink` / `ink-soft` (text and primary buttons),
  warm `stone-*` neutrals, and `brand-*`, the safelight red. Use red sparingly: dots, small highlights, errors.
- **Type** — `font-display` (Instrument Serif) for headlines and big numbers, with `<em>` for the italic
  accent word; Inter for everything else. `eyebrow` is the small uppercase kicker above a headline.
- **Shapes** — pill buttons (`rounded-full`), cards `rounded-3xl` with a hairline ring, photos `rounded-[28px]`.
  `shadow-print` makes something look like a photo print; `shadow-elevated` is for menus and dialogs.
- **Motion** — `animate-enter` (fade up and sharpen), `animate-develop` (grey and blurry → color, like a print),
  `<Reveal>` / `<Reveal develop>` to do the same on scroll, plus `animate-scale-in`, `animate-slide-up`,
  `animate-marquee`, `animate-ken-burns` and the `skeleton` sheen. Everything respects "reduce motion".
- **Texture** — `grain` adds film grain over photos and dark sections.

When building a new screen, reach for the components in `components/ui` first, use `<Skeleton>` (not a
spinner) for loading content, and keep claims in copy true to what the product does.
