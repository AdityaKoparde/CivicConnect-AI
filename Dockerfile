# CivicConnect backend — Node.js 22 / Express / Prisma
FROM node:22-alpine

WORKDIR /app

# Install all dependencies (prisma CLI + tsx are needed for generate/migrate/seed)
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and generate the Prisma client, then compile TypeScript
COPY tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 4000

# migrate (idempotent) + seed demo data (idempotent upserts) + start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"]
