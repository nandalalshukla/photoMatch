# 📸 PhotoMatch AI

> Guests find **every event photo they appear in** by sending one selfie on
> **WhatsApp** or **Telegram** — with optional **liveness protection** so a
> forwarded gallery link reveals nothing.

An organizer uploads the event album once. PhotoMatch AI finds every face in
the background. Guests scan a QR code, send a selfie to the bot, and get a
private gallery of their own photos within seconds.

---

## Contents

1. [Features](#features)
2. [How it works](#how-it-works)
3. [Engineering decisions (and why)](#engineering-decisions-and-why)
4. [Project structure](#project-structure)
5. [Run it locally](#run-it-locally)
6. [Getting each API key](#getting-each-api-key)
7. [Testing the bots locally](#testing-the-bots-locally-telegram--whatsapp)
8. [Liveness detection in detail](#liveness-detection-in-detail)
9. [Tests](#tests)
10. [Deploying](#deploying)
11. [Model licenses](#model-licenses)
12. [Security notes](#security-notes)
13. [Troubleshooting](#troubleshooting)

---

## Features

**For organizers**
- Sign up with email + password (with **email verification**) or **Google** — powered by [better-auth](https://www.better-auth.com).
- Create events, drag-and-drop thousands of photos (uploaded straight to Cloudinary).
- **Duplicate photos are skipped automatically** — a file picked twice, a renamed copy, or a photo the event already has is never uploaded or analysed again. After an interrupted upload, just re-add the whole folder: only the missing photos are sent.
- Live progress while the AI analyses faces; the page updates by itself.
- A QR code + link to share, downloadable as PNG.
- Switch guest search on/off and **liveness protection** on/off at any time.
- Account page: change name/password, see signed-in devices, sign them out.
- Admin page: platform totals, user management (make admin, ban), latest events.

**For guests**
- No app or account: scan → tap WhatsApp or Telegram → send a selfie.
- Private gallery: view, select, and download photos as a ZIP.
- On protected events, a 6-second live face check before the gallery opens.

### ✨ Highlights

| # | Feature | Where in the code |
| --- | --- | --- |
| 1 | **Liveness detection per event** — before photos are shown, the guest proves they are a real, present person *and* the same person as the selfie | `apps/ai/app/liveness.py`, `apps/api/src/modules/galleries/galleries.routes.ts`, `apps/web/src/components/LivenessCheck.tsx` |
| 2 | **WhatsApp delivery** next to Telegram — both bots share one conversation flow | `apps/api/src/modules/bots/` (`whatsapp.ts`, `telegram.ts`, `bot.service.ts`) |
| 3 | **better-auth** for all authentication (email verification, password reset, Google, sessions, admin) — no hand-written auth | `apps/api/src/lib/auth.ts`, `apps/web/src/lib/auth-client.ts` |

---

## How it works

```text
 ORGANIZER                                   GUEST
 ─────────                                   ─────
 Browser ──(1) photos──▶ Cloudinary          Scans QR ──▶ /e/<code> page
    │                        │                              │
    └─(2) "photos uploaded"──┼──▶ Node API                  ▼
                             │      │            WhatsApp / Telegram bot
                             │      ▼ queue job (pg-boss)    │ "event code" + selfie
                             │   Worker ◀────────────────────┘ (webhook → API → job)
                             │      │
                             └──────┤ (3) image ──▶ AI service (Python)
                                    │               ArcFace (ONNX) → 512-number face embedding
                                    ▼
                         PostgreSQL + pgvector  (faces, events, users, jobs — one database)
                                    │
                                    ▼ (4) similar faces = guest's photos
                         Bot replies with private gallery link  /g/<id>
                                    │
                                    ▼ (5) if event is protected:
                         live camera check ─▶ AI liveness ─▶ same face as selfie? ─▶ photos
```

1. The browser fingerprints each photo (SHA-256 of its bytes), asks the API which fingerprints the event already has, and uploads only new photos — **directly to Cloudinary** using a short-lived signature from our API. The database also refuses the same fingerprint twice in one event, so duplicates are blocked even if two uploads race.
2. It then tells the API which photos arrived; the API saves them and queues one job per photo.
3. The **worker** downloads a resized copy, asks the **AI service** for all face embeddings and stores them in **pgvector**.
4. A guest's selfie goes through the same AI → its embedding is compared with the event's faces in SQL.
5. Protected events require the live face check before any photo is returned.

---

## Engineering decisions (and why)

The goal was: **few moving parts, simple code, and a product guests can use without help.**

| Decision | Choice | Why |
| --- | --- | --- |
| Services to run | **Postgres + 1 Node worker + 1 Python service** | Little infrastructure to install, monitor, and understand. |
| Vector search | **pgvector** inside Postgres (no separate vector database) | Faces live next to photos: deleting an event deletes its faces automatically (`ON DELETE CASCADE`). No sync or cleanup worker needed. Event-sized searches take milliseconds. |
| Job queue | **pg-boss** on Postgres (no Redis) | Retries with backoff, and jobs are stored in the database you already back up. |
| Python ↔ Node | **Plain HTTP**: Node calls `POST /faces/detect`, etc. | The AI service is stateless and easy to test with `curl`. All data logic lives in one place (Node). |
| Uploads | **Browser → Cloudinary directly** (signed) | No temp files, no upload queue, no request size limits. The server never handles big files. |
| Event progress | **Counted from photo statuses** (`GROUP BY status`) instead of stored counters | Stored counters can drift out of sync; a count can't. |
| Auth | **better-auth** instead of hand-written auth | Battle-tested security, less code, more features (Google, admin). |
| Bots | **Telegram + WhatsApp** via one shared `bot.service.ts` | Each platform adapter only parses/sends; the conversation is written once. |
| Selfies | **Never stored** — only the 512-number embedding | Better privacy; the embedding is all we need for matching and the liveness identity check. |
| Deployment | **One origin**: Vite proxies `/api` in dev; the API serves the built web app in production | Cookies "just work", no CORS setup. |
| Config | **One root `.env`**, validated with zod at startup | One place to look; clear errors when something is missing. Optional features turn themselves off when their keys are empty. |
| Styling | **Tailwind CSS** + a small design system (`components/ui/`, tokens in `index.css`) | Consistent design, styles live next to the markup they affect. |

### Tech stack

| Area | Technology |
| --- | --- |
| Web | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query |
| API + worker | Node.js 22, Express 5, TypeScript (`tsx` for instant reloads in development, compiled with `tsc` for production), Prisma, pg-boss |
| Auth | better-auth (email + password, email verification, Google, admin plugin) |
| AI service | Python 3.12, FastAPI, ONNX Runtime + OpenCV running InsightFace's `buffalo_l` models (SCRFD detector, ArcFace R50, 3-D landmarks) and two MiniFASNet anti-spoofing models — no `insightface` package, no compiler needed |
| Database | PostgreSQL 16 + pgvector |
| Storage | Cloudinary |
| Messaging | Telegram Bot API, WhatsApp Cloud API |

---

## Project structure

```text
photoMatch/
├── .env.example              ← every setting, documented (copy to .env)
├── docker-compose.yml        ← Postgres+pgvector (and optionally the AI service)
├── package.json              ← npm workspaces + `npm run dev` for everything
├── scripts/setup-env.mjs     ← creates .env with random secrets
└── apps/
    ├── ai/                   ← Python face service (see apps/ai/README.md)
    │   └── app/              config · images · face_engine · liveness · main
    ├── api/                  ← Node API + background worker
    │   ├── prisma/           schema.prisma + migrations
    │   ├── scripts/          setup-bots.ts · promote-admin.ts
    │   ├── tests/            unit tests
    │   └── src/
    │       ├── config/env.ts         validated environment variables
    │       ├── lib/                  auth, db, queue, cloudinary, ai-client, face-store (SQL), email
    │       ├── middleware/           requireAuth / requireAdmin, error handler
    │       ├── modules/
    │       │   ├── events/           organizer endpoints + progress logic
    │       │   ├── public/           guest page data + feature flags
    │       │   ├── galleries/        private gallery + liveness gate
    │       │   ├── bots/             Telegram, WhatsApp, shared conversation, webhooks
    │       │   └── admin/            admin stats
    │       ├── jobs/                 index-photo.ts · search-selfie.ts
    │       ├── app.ts                Express app (routes, security headers)
    │       ├── server.ts             starts the API
    │       └── worker.ts             starts the background worker
    └── web/                  ← React app
        └── src/
            ├── lib/          api client, auth client, uploads, types
            ├── components/   ui/ design system, layouts, LivenessCheck, dropzone
            └── pages/        Landing, Auth, Events, CreateEvent, EventDetail, Account, Admin, GuestEvent, Gallery
```

Every file starts with a comment explaining what it is for, and each block
of non-obvious code explains *why* it is written that way.

---

## Run it locally

### Prerequisites

- **Node.js 22+** and npm
- **Python 3.11–3.13** (3.12 recommended) — no C++ compiler needed, on any OS
- **A PostgreSQL 16 database with the `pgvector` extension** — Docker (`docker compose up -d db`), a free cloud database such as [Neon](https://neon.tech) (use the *non-pooled* connection string), or a local install
- ~1 GB free disk for AI models (downloaded automatically on first start)

### 1. Install and create your `.env`

```bash
git clone https://github.com/nandalalshukla/photoMatch.git
cd photoMatch
npm install
npm run setup          # creates .env with random secrets already filled in
```

> **Why isn't `.env` in git?** It will contain real passwords and API keys.
> It's in `.gitignore` so it can never be pushed by accident. `.env.example`
> (committed) documents every variable; `npm run setup` copies it for you.

Open `.env` and fill in what you have. **Only these are required to start:**
`DATABASE_URL` (already correct for Docker), `BETTER_AUTH_SECRET` and
`AI_SERVICE_SECRET` (generated by `npm run setup`). Everything else is an
optional feature that switches itself on once its keys are present — the API
prints which features are on when it starts:

```text
🚀 PhotoMatch AI API on http://localhost:3000  (public URL: http://localhost:5173)
   ✅ google   ⚪ smtp   ✅ uploads   ✅ telegram   ⚪ whatsapp
```

### 2. Start the database and create the tables

```bash
docker compose up -d db                # skip if you use Neon or your own Postgres (set DATABASE_URL instead)
npm run db:deploy -w apps/api          # creates all tables
```

### 3. Start the AI service (separate terminal)

```bash
cd apps/ai
python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

The first start downloads InsightFace's model pack (~290 MB, only 3 of its files are kept), then prints `AI models loaded — ready.`
(Alternative: `docker compose up -d ai`.)

### 4. Start the API, worker and web app

```bash
npm run dev
```

This runs three processes side by side (colored prefixes `api`, `worker`, `web`).
Open **http://localhost:5173**.

### 5. Try it

1. Sign up. Without SMTP configured, the **verification link is printed in the `api` terminal** — open it.
2. Create an event (tick *Require a live face check* to try feature #1) and drop in some photos.
3. Watch the progress bar reach 100 %, then open *Preview guest page*.
4. To make yourself an admin: `npm run admin:promote -w apps/api -- you@example.com`.

---

## Getting each API key

All of these go into `.env`. Restart `npm run dev` after changing it.

<details>
<summary><b>Cloudinary</b> (photo storage — needed for uploads)</summary>

1. Create a free account at https://cloudinary.com.
2. Console → **Dashboard** → copy *Cloud name*, *API Key*, *API Secret* into
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Note: the free plan limits single images to 10 MB.
</details>

<details>
<summary><b>Email / SMTP</b> (verification + password-reset emails)</summary>

With Gmail:
1. Turn on 2-Step Verification for your Google account.
2. Create an **App password**: https://myaccount.google.com/apppasswords
3. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=you@gmail.com`,
   `SMTP_PASSWORD=<the 16-character app password>`, `EMAIL_FROM=PhotoMatch AI <you@gmail.com>`.

Any SMTP provider works (Resend, Brevo, Mailgun...). Leave `SMTP_USER` empty to print emails to the console.
</details>

<details>
<summary><b>Google login</b></summary>

1. https://console.cloud.google.com/apis/credentials → **Create credentials → OAuth client ID** → *Web application*.
2. **Authorized JavaScript origins:** your `APP_URL` (e.g. `http://localhost:5173`).
3. **Authorized redirect URI:** `<APP_URL>/api/auth/callback/google`
   (e.g. `http://localhost:5173/api/auth/callback/google`).
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

The *Continue with Google* button appears automatically once these are set.
</details>

<details>
<summary><b>Telegram bot</b></summary>

1. In Telegram, message **@BotFather** → `/newbot` → choose a name and a username ending in `bot`.
2. Put the token in `TELEGRAM_BOT_TOKEN` and the username (without `@`) in `TELEGRAM_BOT_USERNAME`.
3. `TELEGRAM_WEBHOOK_SECRET` was generated by `npm run setup`.
4. Set a public HTTPS `APP_URL` (see [Testing the bots locally](#testing-the-bots-locally-telegram--whatsapp)) and run:
   `npm run bots:setup -w apps/api`
</details>

<details>
<summary><b>WhatsApp Cloud API</b></summary>

1. https://developers.facebook.com → **Create app** → type *Business* → add the **WhatsApp** product.
2. *WhatsApp → API Setup*: copy the **temporary access token** → `WHATSAPP_ACCESS_TOKEN`
   and the **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
   For production, create a permanent token with a System User in Business Settings.
3. `WHATSAPP_BUSINESS_NUMBER` = the bot's phone number, digits only with country code (e.g. `15551234567`).
   With the free test number, add your own phone under *To* as an allowed recipient.
4. *App settings → Basic* → **App secret** → `WHATSAPP_APP_SECRET`.
5. Set a public HTTPS `APP_URL`, restart, then run `npm run bots:setup -w apps/api`. It prints:
   - **Callback URL** `<APP_URL>/api/webhooks/whatsapp`
   - **Verify token** (`WHATSAPP_VERIFY_TOKEN`)

   Paste both in *WhatsApp → Configuration → Webhook*, click **Verify and save**,
   then **subscribe to the `messages` field**.
</details>

---

## Testing the bots locally (Telegram & WhatsApp)

Telegram and Meta must be able to reach your computer over HTTPS. Use a free tunnel:

```bash
npx cloudflared tunnel --url http://localhost:5173
# → prints something like https://random-words.trycloudflare.com
```

1. Put that URL in `APP_URL` in `.env` and restart `npm run dev`.
2. Run `npm run bots:setup -w apps/api` (sets the Telegram webhook, prints WhatsApp values).
3. Open `APP_URL` in your browser, create an event, open its guest page, tap a bot button and send a selfie.

The tunnel forwards to Vite, which forwards `/api` to the API — so one tunnel covers the website, the webhooks and the gallery links.
(If you also use Google login, add the tunnel URL to the OAuth client's origins and redirect URIs.)

### The guest conversation

| Guest sends | Bot does |
| --- | --- |
| A message containing the event code (`/start K7P2QM9X` or the pre-filled WhatsApp text) | Connects the chat to that event |
| A photo | Queues a search, replies "Got your selfie!", then sends the gallery link |
| `help` | Explains the steps |
| `galleries` (or `/archive`) | Lists earlier galleries |
| A selfie with no face / several faces | Explains how to take a better selfie |

---

## Liveness detection in detail

**Goal:** a gallery link can be forwarded, screenshotted or leaked. For events
where the organizer enables liveness, the photos are only shown to **the
person who sent the selfie, physically in front of the camera.**

**What happens when a guest opens a protected gallery**

1. The API returns `locked: true` and **no photos**.
2. A guided camera screen walks the guest through it (intro with tips → face in the oval → **"I'm ready"** →
   3-2-1 → *hold still, look straight* → animated arrow: *slowly turn your head to your left*). Nothing is
   captured before the guest presses "I'm ready".
   Instead of one photo at an exact moment, the page captures **bursts**: 4 frames while looking straight
   and 12 frames (≈3.6 s) while turning.
3. The API forwards the bursts to the AI service (`POST /liveness`). It keeps the most straight-on frame and
   the most-turned frame — so a slow or late turn still passes — and checks:
   - **Head turn** (3-D landmark model from the `buffalo_l` pack): the straight frame faces the camera (|yaw| ≤ 15°) and the turned frame is turned by ≥ 20°.
     A printed photo can't turn — even tilting it doesn't change the measured yaw.
   - **Same person in both frames** (embedding similarity ≥ 0.3), so nobody can mix a victim's photo with their own moving head.
   - **Anti-spoofing** (two MiniFASNet models from the Silent-Face-Anti-Spoofing project, looking at the face at 2.7× and 4× zoom): both frames must score ≥ `LIVENESS_THRESHOLD` as "real", which catches printed photos and phone/laptop screens. On the project's sample images a live selfie scores 1.00 and a photographed print 0.15.
4. The API compares the live face with the **selfie's stored embedding** (≥ `FACE_MATCH_THRESHOLD`).
   Someone who received a forwarded link has a different face → `FACE_MISMATCH`.
5. On success the API sets a **signed, httpOnly cookie** valid for 30 minutes, for this one gallery only.
6. Max **5 attempts** per gallery (and 10/min per IP) to stop brute-forcing. The guest can always send a new selfie for a fresh link.

**Why this design?** It's simple (two frames, two small models, ~1 s on a CPU),
needs no third-party paid API, stores nothing (frames are processed in memory
only), and closes the actual risk — link sharing — by tying the gallery to a face, not to a URL.

**Limits to know:** passive anti-spoofing is not bank-grade; a very
high-quality video replay of the right person could pass. For stronger
guarantees you could swap in a commercial liveness API behind the same
`/liveness` endpoint without changing the web or API code. Also note that the
gallery's Cloudinary image URLs themselves are unguessable but not secret once
viewed.

---

## Tests

```bash
# API unit tests (pure logic: event progress, codes, Telegram/WhatsApp parsing, webhook signatures)
npm test

# AI service tests (real models; first run downloads them)
cd apps/ai && source .venv/bin/activate && pip install pytest httpx && python -m pytest
```

What was verified while building this project:

- **AI tests (15):** face detection on a group photo, selfie → correct person found (similarity > 0.6, others < 0.3), no-face / multiple-faces / invalid-image errors, liveness rejects no head turn, not facing camera, and different people; anti-spoof model scores a live selfie as real and a photographed print as fake; bursts pick the right frames, skip frames without a face, and are size-limited.
- **Model port check:** our ONNX Runtime code was compared with the `insightface` package on 11 images (group, flipped, rotated, cropped, resized): identical faces found, identical boxes, embeddings identical (cosine ≥ 0.999999), head angle within ~2°.
- **Full pipeline (33 checks)** against the real database and AI models, with Telegram/WhatsApp/Cloudinary servers simulated: sign-up → blocked until verified → sign-in; event creation; worker indexing; Telegram `/start` + selfie → correct matches; WhatsApp signed webhook + verify handshake + bad-signature rejection; gallery locked; head-not-turned and multiple-face rejections; forwarded link (different face) rejected; correct face unlocks; forged cookie rejected; lockout after 5 attempts; guest access off closes page, gallery and bot; event deletion cascades all face data.
- **Browser run (Chromium):** landing, sign-up, verify link, create event, event page, guest page (mobile), live camera check with a webcam feed (correctly asked to turn the head), gallery, ZIP download, 404 page; production build served by the API with strict CSP — no console errors.

---

## Deploying

Production = **one Node server** (API + built web app on the same domain), **one worker**, **the AI service**, and **Postgres with pgvector**.

```bash
npm ci
npm run build                          # web app → apps/web/dist, API TypeScript → apps/api/dist (plain JavaScript)
npm run db:deploy -w apps/api          # applies migrations
npm start                              # runs the compiled API (serves the web app too) + worker with plain `node`
```

Run the AI service with `docker compose up -d ai` (or `uvicorn app.main:app --host 0.0.0.0 --port 8000`) and set `AI_SERVICE_URL` accordingly.
Set `NODE_ENV=production` and `APP_URL=https://your-domain.com` (HTTPS is required for cookies marked secure, the webcam, Telegram and WhatsApp). Managed Postgres providers like Neon, Supabase and Railway support `pgvector`.

Scaling: run more workers (`npm run worker:start -w apps/api`) or more AI service replicas — pg-boss guarantees each job runs once.

---

## Model licenses

| Model | Used for | License | What it means for you |
| --- | --- | --- | --- |
| InsightFace `buffalo_l` (SCRFD, ArcFace R50, 1k3d68) | finding faces, face embeddings, head angle | **Non-commercial research use only** (InsightFace's terms) | Fine for personal/hobby use. **Before using PhotoMatch AI commercially** (charging organizers, ads, running it for a business), buy a commercial license from InsightFace or switch to commercially licensed models. |
| MiniFASNetV2 + MiniFASNetV1SE (Minivision) | liveness / anti-spoofing | **Apache 2.0** | Free for any use, including commercial. Converted to ONNX and shipped in `apps/ai/weights/` with its license. |

The code of this project calls the models through ONNX Runtime and doesn't
depend on any particular model pack: only `apps/ai/app/face_models.py` would
change if you swap to other models.

Also note: face embeddings are **biometric data** under many privacy laws
(GDPR, India's DPDP Act, Illinois' BIPA...). If real guests use a public
deployment, add a privacy notice, get consent, and define how long data is kept.

---

## Security notes

- Auth is handled by better-auth: hashed passwords, httpOnly session cookies, CSRF-protected origins, rate-limited endpoints, mandatory email verification.
- Every organizer query is scoped to `ownerId` — users can't see or change other users' events (they get a 404, not a 403, so ids can't be probed).
- Cloudinary uploads are **signed per event folder**, and the API re-checks that registered photos are in that folder of *our* Cloudinary account.
- Webhooks are authenticated: Telegram via a secret header, WhatsApp via HMAC-SHA256 signature — compared in constant time.
- The AI service requires a shared secret header and isn't meant to be exposed publicly.
- Raw SQL (pgvector) uses parameterised tagged templates — no string concatenation.
- Security headers (Helmet) with a strict Content-Security-Policy.
- Selfies and liveness frames are processed in memory and never stored.
- Guests are limited to 10 selfies per hour per chat.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `❌ Invalid environment variables in .env` | The message names the variable. Run `npm run setup` if `.env` doesn't exist. |
| Photos stay at "Analysing faces" | Is the worker running (`worker` prefix in `npm run dev`)? Is the AI service up (`curl localhost:8000/health`)? Do `AI_SERVICE_SECRET` values match (they're read from the same `.env`)? |
| "Photo uploads aren't configured" | Fill in the three `CLOUDINARY_*` values. |
| No verification email | Without SMTP, look for `📧` in the `api` terminal. With Gmail, use an App password, not your normal password. |
| Bot doesn't answer | `APP_URL` must be the public HTTPS tunnel URL; re-run `npm run bots:setup -w apps/api`. Check the `api` terminal for `[bot]` errors. |
| Google sign-in "redirect_uri_mismatch" | The redirect URI in Google Cloud must be exactly `<APP_URL>/api/auth/callback/google`. |
| Camera doesn't open on the gallery | Browsers only allow the camera on `https://` or `localhost`. |
| Liveness keeps failing for a real person | Look in the `npm run dev` window for a `[liveness]` line: it shows the reason, both head angles, the "real person" score and the selfie match score (no images are logged), so you can see which check is too strict. |
| Liveness always says "SPOOF_DETECTED" | Improve lighting, or lower `LIVENESS_THRESHOLD` slightly (e.g. 0.6). |
| AI service: `pip install` fails building a package | Use Python 3.11–3.13 (3.14 may not have pre-built packages yet). The service needs no compiler. |
| Too many / too few photos matched | Raise / lower `FACE_MATCH_THRESHOLD` (default 0.45). |

---

Built by **Nandalal Shukla**.
