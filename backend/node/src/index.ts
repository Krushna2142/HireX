import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import analyzeRouter from './analyzeRouter'; // CommonJS build resolves this

const PORT = Number(process.env.NODE_PORT || 4000);

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'node-gateway' }));
app.use('/api/analyze', analyzeRouter);

httpServer.listen(PORT, () => {
  console.log(`[node] listening http://0.0.0.0:${PORT}`);
});