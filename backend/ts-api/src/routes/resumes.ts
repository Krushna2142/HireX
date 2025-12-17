import express from 'express';
import multer from 'multer';
import { uploadBuffer } from '../storage/s3';
import { prisma } from '../db';
import { parseQueue } from '../queue';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.post('/', upload.single('resume'), async (req, res) => {
if (!req.file) return res.status(400).json({ error: 'No file' });
// create db row
const userId = req.body.userId || '00000000-0000-0000-0000-000000000000';
const key = `resumes/${Date.now()}_${req.file.originalname}`;
const url = await uploadBuffer(key, req.file.buffer, req.file.mimetype);
const row = await prisma.resume.create({ data: { userId, storageUrl: url } });
// enqueue parse job
await parseQueue.add('parse_resume', { resumeId: row.id, storageUrl: url });
res.status(202).json({ resumeId: row.id });
});


router.get('/:id', async (req, res) => {
const r = await prisma.resume.findUnique({ where: { id: req.params.id } });
if (!r) return res.status(404).send('Not found');
res.json(r);
});


export default router;