import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { prisma } from '../db';
import { insertVector } from '../vector/mockVector';


const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');


new Worker('parse_resume', async job => {
const { resumeId, storageUrl } = job.data;
console.log('Worker parsing', resumeId);
// call python ML service
const resp = await axios.post(`${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/extract`, { url: storageUrl }, { timeout: 120000 });
const parsed = resp.data;
// update DB
await prisma.resume.update({ where: { id: resumeId }, data: { parsedJson: parsed.structured, status: 'parsed' } });
// insert embedding into vector DB
const vecId = await insertVector(parsed.embedding, { type: 'resume', id: resumeId });
await prisma.resume.update({ where: { id: resumeId }, data: { embeddingId: vecId, status: 'indexed' } });
}, { connection });