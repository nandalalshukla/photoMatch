# Image for the Node side of PhotoMatch AI: the API (which also serves the
# built web app) and the background worker. Both run from this same image —
# docker-compose.prod.yml just starts it with a different command.
#
# Build from the repository root, because npm workspaces need the root
# package.json and package-lock.json.
FROM node:22-slim

# Prisma's query engine needs OpenSSL.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so Docker can cache this layer between deploys.
# The Prisma schema is needed here too: `npm ci` runs `prisma generate`.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Build the web app (→ apps/web/dist) and the API (→ apps/api/dist).
COPY apps/api ./apps/api
COPY apps/web ./apps/web
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
# Apply database migrations, then start the API.
CMD ["sh", "-c", "npm run db:deploy -w apps/api && npm run start -w apps/api"]
