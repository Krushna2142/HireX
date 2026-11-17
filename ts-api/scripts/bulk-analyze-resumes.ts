import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 1. Explicitly load the .env file from the ts-api root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2. Safety check to ensure the URL was actually loaded
if (!process.env.DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is missing. Check your .env file in the ts-api directory.');
}

// 3. Pass the URL explicitly to PrismaClient to bypass the initialization error
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['warn', 'error'], // Optional: helps debug script issues
});

async function main() {
  console.log('✅ Connected to database, starting bulk analysis...');
  
  // 👇 YOUR EXISTING SCRIPT LOGIC GOES HERE 👇
  // const resumes = await prisma.resume.findMany(...)
  
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect when the script finishes
    await prisma.$disconnect();
  });