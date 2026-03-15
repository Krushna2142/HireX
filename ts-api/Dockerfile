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

RUN npm run build

# ✅ Verify against the ACTUAL output path
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found" && exit 1)



# ─────────────────────────────────────────────────────
# Stage 2: PRODUCTION
# ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ✅ Copy the actual output directory
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# ✅ Point to the actual path

CMD ["node", "dist/src/main.js"]