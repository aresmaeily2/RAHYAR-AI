# ─── رهیار AI — کانتینر پروداکشن چندمرحله‌ای (ممیزی ۳۶۰) ─────
# سه مرحله: deps → builder → runner سخت‌شده (کاربر غیر-root).
#
# ساخت و اجرا:
#   docker build -t rahyar-ai .
#   docker run -d -p 3000:3000 \
#     -e DATABASE_URL="file:/app/db/custom.db" \
#     -e NODE_ENV=production \
#     -v rahyar-data:/app/db \
#     rahyar-ai
#
# یادآوری امنیتی (GU2-SEC1): در تولید RAHYAR_SETUP_TOKEN را هم بدهید و
# RAHYAR_ALLOW_OPEN_SETUP را هرگز 1 نکنید.

# ── Stage 1: وابستگی‌ها ──────────────────────────────────────
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
# openssl برای موتور Prisma روی musl (alpine) لازم است
RUN apk add --no-cache openssl
COPY package.json bun.lock ./
COPY prisma ./prisma/
RUN bun install --frozen-lockfile
RUN bun run db:generate

# ── Stage 2: بیلد ────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:/tmp/build-placeholder.db"
RUN bun run build

# ── Stage 3: رانر سخت‌شده (غیر-root) ─────────────────────────
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 rahyar && \
    adduser --system --uid 1001 --ingroup rahyar rahyar && \
    mkdir -p /app/db /app/backups && \
    chown -R rahyar:rahyar /app/db /app/backups

COPY --from=builder --chown=rahyar:rahyar /app/.next/standalone ./
COPY --from=builder --chown=rahyar:rahyar /app/.next/static ./.next/static
COPY --from=builder --chown=rahyar:rahyar /app/public ./public
COPY --from=builder --chown=rahyar:rahyar /app/prisma ./prisma
COPY --from=builder --chown=rahyar:rahyar /app/scripts/backup-db.sh ./scripts/backup-db.sh

USER rahyar
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["bun", "server.js"]
