# ─────────────────────────────────────────────────────
# Stage 1: BUILDER
# Full dev deps needed — @nestjs/cli for nest build,
# @prisma/adapter-pg + prisma for generate
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first — maximises layer cache hits
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (dev included)
# @nestjs/cli lives in devDeps — required for nest build
RUN npm ci

# Generate Prisma Client BEFORE TypeScript compilation
# Prisma v7: no prisma.config.ts, schema has no url field
RUN npx prisma generate

# Copy source after deps are installed
COPY . .

# Compile TypeScript → dist/
# tsconfig.json: "module": "CommonJS" ensures webpack succeeds
RUN npm run build

# ─────────────────────────────────────────────────────
# Stage 2: PRODUCTION
# Lean runtime image — no dev tooling, no source TS
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy manifests
COPY package*.json ./

# Production deps only — strips ~200MB of dev tooling
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Prisma v7 runtime requires the generated client AND adapter
# These live in node_modules and must be explicitly carried over
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema — needed for runtime query engine resolution
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# All env vars (DATABASE_URL, JWT_SECRET, etc.)
# are injected at runtime via Render's Environment tab
# NEVER bake secrets into the image
CMD ["node", "dist/main.js"]