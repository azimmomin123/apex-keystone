FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Dummy URL for build-time schema generation only
ENV DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx keystone build --no-ui
RUN npx prisma generate
# Build Next.js app
RUN SKIP_ENV_VALIDATION=1 npx next build

FROM node:22-bookworm-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Create the app user BEFORE copying files so we can use --chown on each COPY.
# Doing chown -R after the fact on a full node_modules tree hangs the build
# container in some environments (very large file count).
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/.keystone ./.keystone
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/schema.prisma ./schema.prisma
COPY --from=builder --chown=app:app /app/migrations ./migrations
COPY --from=builder --chown=app:app /app/features ./features
COPY --from=builder --chown=app:app /app/keystone.ts ./keystone.ts
COPY --from=builder --chown=app:app /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=app:app /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=app:app /app/app ./app
COPY --from=builder --chown=app:app /app/scripts ./scripts

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER app

CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/seed.mjs && npm start"]
