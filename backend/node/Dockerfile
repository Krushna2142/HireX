FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package.json tsconfig.json ./

# Install dependencies (dev deps included since NODE_ENV not set to production)
RUN npm install

# Copy source
COPY src ./src

# Build TS -> JS
RUN npm run build

# Expose and run compiled server
ENV NODE_PORT=4000
CMD ["npm", "run", "start"]