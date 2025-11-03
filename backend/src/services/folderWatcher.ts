import chokidar from "chokidar";
import {WebSocketServer} from "ws"
let wss: WebSocketServer;
export function startFolderWatching(path: string, webSocketServer: WebSocketServer){ 
    wss = webSocketServer;
    const watcher = chokidar.watch(path, {ignoreInitial: true, persistent: true});
    watcher.on("all", (event, path) => {
        wss.clients.forEach((client) => {
            if (client.readyState == client.OPEN) {
                client.send(JSON.stringify({event, path}));
            }
        })
    })
    return watcher;
}