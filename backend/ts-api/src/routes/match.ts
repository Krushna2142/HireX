import express from 'express';
import { prisma } from '../db';
import { searchVector } from '../vector/mockVector';


const router = express.Router();


router.post('/', async (req, res) => {
const { resumeId } = req.body;
if (!resumeId) return res.status(400).json({ error: 'resumeId required' });
const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
if (!resume || !resume.embeddingId) return res.status(400).json({ error: 'resume not indexed' });


// get resume embedding from mock vector store (we stored embedding meta earlier)
// for mock, we iterate store to find by meta id
// in prod: vector client -> searchByEmbeddingId
const searchResults = await searchVector((resume.parsedJson as any).embedding || [] , 50);
// translate to jobs (mocked)
const jobs = searchResults.map(r => ({ jobId: r.meta?.id || r.id, score: r.score }));
res.json({ matches: jobs });
});


export default router;