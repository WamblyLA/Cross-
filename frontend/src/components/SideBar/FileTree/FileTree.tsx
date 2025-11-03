import React from "react";
import TreeItem from "./TreeItem";
import type { TreeItemType } from "./TreeItem";
import { useAppDispatch } from "../../../store/hooks";
import { openFile } from "../../../features/files/filesSlice";
import { useFileTree } from "../../../hooks/useFileTree";
import { useRequest } from "../../../hooks/useRequest";
const mockPath = "C:/Test"; //Потом заменить
const FileTree: React.FC = () => {
  const dispatch = useAppDispatch();
  const {tree, isLoading, error} = useFileTree(mockPath);
  const {refetch: loadFile} = useRequest<{content: string}>({
    url: "http://localhost:3000/api/files/content",
    auto: false
  })
  const clicked = async (file: TreeItemType) => {
    if (file.type !== "file") {
      return;
    }
    try {
      const res = await loadFile({
        params: {path: file.id},
      })
      dispatch(
        openFile({
          id: file.id,
          name: file.name,
          extencion: file.extencion,
          content: res?.content ?? " ",
        })
      );
    } catch (err) {
      console.error("Ошибка при загрузке", err);
    }
  };
  if (isLoading) {
    return <div>Загрузка</div>
  }
  if (error) {
    return <div>Возникла ошибка {error.response?.statusText || error.message}</div>
  }
  return (
    <div className="w-full h-full py-1 px-2">
      {tree?.map((unit) => (
        <TreeItem key={unit.id} unit={unit} onUnitClick={clicked} />
      ))}
    </div>
  );
};
export default FileTree;
