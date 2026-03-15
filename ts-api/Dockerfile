FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files, including prisma/ folder
COPY . .

# Generate Prisma Client after source is copied!
RUN npx prisma generate

# Build NestJS app
RUN npm run build

EXPOSE 3001

# Start production server

CMD ["npm", "run", "start:prod"]