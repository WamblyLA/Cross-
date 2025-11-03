import { useEffect, useState, useRef } from "react";
import { type TreeItemType } from "../components/SideBar/FileTree/TreeItem";
import { useRequest } from "./useRequest";
export function useFileTree(path: string) {
  const [tree, setTree] = useState<TreeItemType[]>([]);
  const { data, isLoading, error, refetch } = useRequest<{
    files: { name: string; isDirectory: boolean }[];
  }>({ url: "http://localhost:3000/api/files", params: { path }, auto: true });
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (!data) {
      return;
    }
    setTree(
      data.files.map((file) => ({
        id: `${path}/${file.name}`,
        name: file.name,
        type: file.isDirectory ? "folder" : "file",
      }))
    );
  }, [data, path]);
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000");
    wsRef.current = ws;
    ws.onopen = () => console.log("WS connected");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg == "folder-change") {
          if (msg.path.startsWith(path)) {
            refetch();
          }
        }
      } catch (err) {
        console.error("Ошибка в ws messaging", err);
      }
    };
    ws.onclose = (ev) => console.log("WS closed", ev);
    ws.onerror = (err) => console.error("WS Error", err);
    return () => {
      ws.close();
    };
  }, [path, refetch]);
  return { tree, isLoading, error, refetch };
}
