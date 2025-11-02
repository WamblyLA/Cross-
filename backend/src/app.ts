import express from 'express';
import cors from 'cors';
import filesRouter from './routes/files.ts'
const app = express();
app.use(cors());
app.use(express.json());
app.get('/ping', (_,res) => res.send('/pong'));
app.use('/files',filesRouter)
app.listen(3000, () => console.log('On port 3000 started'));
