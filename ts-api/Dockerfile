# ─────────────────────────────────────────────────────
# Stage 1: BUILDER
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

RUN npx prisma generate

COPY src ./src

# Build with tsc directly — more transparent than webpack in Docker
RUN npm run build

# ✅ Hard fail here if main.js missing — catches silent build failures
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found after build" && exit 1)

# ─────────────────────────────────────────────────────
# Stage 2: PRODUCTION
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["start:prod": "node dist/src/main.js"]