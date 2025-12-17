import express from 'express';
import resumesRouter from './routes/resumes';
import matchRouter from './routes/match';
import './workers/parseWorker';


const app = express();
app.use(express.json());
app.use('/api/resumes', resumesRouter);
app.use('/api/match', matchRouter);


const port = parseInt(process.env.PORT || '4000');
app.listen(port, () => console.log('TS API listening on', port));