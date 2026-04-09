FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Use dummy URL for build-time schema generation (no DB connection needed)
ENV DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy

RUN npx keystone build --no-ui
RUN npx prisma generate
RUN npx next build

FROM node:22-bookworm-slim AS production
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

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
