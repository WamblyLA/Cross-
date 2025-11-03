import express from 'express';
import http from "http";
import { WebSocketServer } from 'ws';
import { startFolderWatching } from './services/folderWatcher.ts';
import cors from 'cors';
import filesRouter from './routes/files.ts'
const app = express();
app.use(cors());
app.use(express.json());
app.get('/ping', (_,res) => res.send('/pong'));
app.use('/api/files',filesRouter)
const server = http.createServer(app);
const wss = new WebSocketServer({server});
wss.on('connection', (ws) => {
    ws.send(JSON.stringify({type: "connected"}))
})
const pathToWatch = "C:/Test"
startFolderWatching(pathToWatch, wss);

server.listen(3000, () => console.log('On port 3000 started'));
