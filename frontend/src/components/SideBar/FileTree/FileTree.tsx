import React, { useEffect, useState } from "react";
import { openFile } from "../../../features/files/filesSlice";
import { useAppDispatch } from "../../../store/hooks";
import TreeItem from "./TreeItem";
import type { TreeItemType } from "./TreeItem";

type FileTreeProps = {
  rootPath: string | null;
};

const FileTree: React.FC<FileTreeProps> = ({ rootPath }) => {
  const dispatch = useAppDispatch();
  const [tree, setTree] = useState<TreeItemType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRoot = async () => {
      if (!rootPath) {
        setTree([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const files = await window.electronAPI.listFolder(rootPath);

        setTree(
          files.map((file) => ({
            id: `${rootPath}/${file.name}`,
            name: file.name,
            type: file.isDirectory ? "folder" : "file",
          })),
        );
      } catch (err) {
        console.error("Ошибка при загрузке корневой папки", err);
        setError("Не удалось загрузить папку");
      } finally {
        setIsLoading(false);
      }
    };

    loadRoot();
  }, [rootPath]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onFolderChanged(async () => {
      if (!rootPath) {
        return;
      }

      try {
        const files = await window.electronAPI.listFolder(rootPath);

        setTree(
          files.map((file) => ({
            id: `${rootPath}/${file.name}`,
            name: file.name,
            type: file.isDirectory ? "folder" : "file",
          })),
        );
      } catch (err) {
        console.error("Ошибка при обновлении дерева", err);
      }
    });

    return unsubscribe;
  }, [rootPath]);

  const clicked = async (file: TreeItemType) => {
    if (file.type !== "file") {
      return;
    }

    try {
      const content = await window.electronAPI.readFile(file.id);

      dispatch(
        openFile({
          id: file.id,
          name: file.name,
          extencion: file.extencion,
          content: content ?? "",
        }),
      );
    } catch (err) {
      console.error("Ошибка при загрузке файла", err);
    }
  };

  if (!rootPath) {
    return <div className="w-full h-full px-3 py-3 text-sm text-muted">Папка не открыта</div>;
  }

  if (isLoading) {
    return <div className="px-3 py-3 text-sm text-secondary">Загрузка</div>;
  }

  if (error) {
    return <div className="px-3 py-3 text-sm text-error">Возникла ошибка {error}</div>;
  }

  return (
    <div className="w-full h-full py-2 px-2 text-sm text-secondary overflow-auto">
      {tree.map((unit) => (
        <TreeItem key={unit.id} unit={unit} onUnitClick={clicked} />
      ))}
    </div>
  );
};

export default FileTree;
