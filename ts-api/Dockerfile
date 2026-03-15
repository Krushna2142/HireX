FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies first
COPY package*.json ./
RUN npm install

# Copy the rest of the source code (including prisma folder and schema)
COPY . .

# PRISMA: Generate the client (this step is critical!)
RUN npx prisma generate

# Optional: If you want migration in container, add:
# RUN npx prisma migrate deploy

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]