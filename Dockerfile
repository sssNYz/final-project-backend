# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci
RUN npm i @next/swc-linux-x64-gnu || true
RUN npx prisma generate

# ============================================================
# Stage 2: Build the Next.js application
# ============================================================
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Dummy build-time env vars so Next.js page data collection doesn't crash.
# Real values are injected at runtime via docker-compose env_file.
ENV JWT_SECRET=build-placeholder
ENV RESEND_API_KEY=re_build_placeholder
ENV DATABASE_URL=mysql://placeholder:placeholder@localhost:3306/placeholder

RUN npm run build

# ============================================================
# Stage 3: Production runner for Next.js server
# ============================================================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs
RUN useradd -u 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# ============================================================
# Stage 4: Worker runner
# ============================================================
FROM node:20-slim AS worker
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app ./

CMD ["node", "-e", "console.log('Specify a worker command in docker-compose.yml')"]