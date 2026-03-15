# --- Build Stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # ← compiles TypeScript to /app/dist

# --- Production Stage ---
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production   # only prod deps, no devDependencies
COPY --from=builder /app/dist ./dist   
# ← copy compiled output

CMD ["node", "dist/main.js"]