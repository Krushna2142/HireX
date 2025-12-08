import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // raise to 20MB if needed
});

const PY_URL = process.env.PY_URL || 'http://python:8000';

// Existing resume proxy remains...
router.post('/resume', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.body.userId || 'guest';
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fd = new FormData();
    fd.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    fd.append('userId', userId);

    const { data, status } = await axios.post(`${PY_URL}/analyze/resume`, fd, {
      headers: fd.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return res.status(status).json(data);
  } catch (e: any) {
    console.error('[proxy/analyze] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Proxy error' });
  }
});

// New: history route
router.get('/history', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const { data, status } = await axios.get(`${PY_URL}/analyze/history`, {
      params: { userId, limit },
    });

    return res.status(status).json(data);
  } catch (e: any) {
    console.error('[proxy/history] error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Proxy error' });
  }
});

export default router;