import React from "react";
import TreeItem from "./TreeItem";
import type { TreeItemType } from "./TreeItem";
import { useAppDispatch } from "../../../store/hooks";
import { openFile } from "../../../features/files/filesSlice";
interface FileTreeProps {
  treeData?: TreeItemType[];
}
const FileTree: React.FC<FileTreeProps> = ({ treeData }) => {
  const dispatch = useAppDispatch();
  const clicked = (file: TreeItemType) => {
    if (file.type === "file") {
      dispatch(
        openFile({
          id: file.id,
          name: file.name,
          extencion: file.extencion,
          content: file.content ?? " ",
        })
      );
    }
  };
  return (
    <div className="w-full h-full py-1 px-2">
      {treeData?.map((unit: TreeItemType) => (
        <TreeItem key={unit.id} unit={unit} onUnitClick={clicked} />
      ))}
    </div>
  );
};
export default FileTree;
