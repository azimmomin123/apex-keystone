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

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/.keystone ./.keystone
COPY --from=builder /app/public ./public
COPY --from=builder /app/schema.prisma ./schema.prisma
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/features ./features
COPY --from=builder /app/keystone.ts ./keystone.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/app ./app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
