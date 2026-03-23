import React, { useState } from "react";
import { CiFileOn } from "react-icons/ci";
import { IoMdFolderOpen } from "react-icons/io";
import { IoFolderOpenOutline } from "react-icons/io5";
import { RiArrowDropDownLine, RiArrowDropRightLine } from "react-icons/ri";

export type TreeItemType = {
  id: string;
  name: string;
  extencion?: string;
  type: "file" | "folder";
  children?: TreeItemType[];
  content?: string;
};

interface TreeItemProps {
  unit: TreeItemType;
  onUnitClick: (unit: TreeItemType) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ unit, onUnitClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<TreeItemType[] | null>(unit.children ?? null);

  const processClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (unit.type === "folder") {
      if (!isOpen && !children) {
        try {
          const files = await window.electronAPI.listFolder(unit.id);

          setChildren(
            files.map((file) => ({
              id: `${unit.id}/${file.name}`,
              type: file.isDirectory ? "folder" : "file",
              name: file.name,
            })),
          );
        } catch (err) {
          console.error("Ошибка при загрузке папки", err);
        }
      }

      setIsOpen(!isOpen);
      return;
    }

    onUnitClick(unit);
  };

  return (
    <div className="select-none">
      <button
        type="button"
        className="ui-tree-item w-full px-2 py-1.5 flex gap-2 items-center text-left"
        onClick={processClick}
      >
        <span className="w-4 flex justify-center text-secondary">
          {unit.type === "folder" ? (
            isOpen ? (
              <RiArrowDropDownLine className="text-lg" />
            ) : (
              <RiArrowDropRightLine className="text-lg" />
            )
          ) : null}
        </span>
        <span className="w-4 flex justify-center text-secondary">
          {unit.type === "folder" ? (
            isOpen ? (
              <IoFolderOpenOutline className="text-lg" />
            ) : (
              <IoMdFolderOpen className="text-lg" />
            )
          ) : (
            <CiFileOn className="text-lg" />
          )}
        </span>
        <span className="truncate">
          {unit.name}
          {unit.type === "file" && unit.extencion ? `.${unit.extencion}` : ""}
        </span>
      </button>
      {isOpen && children ? (
        <div className="pl-4">
          {children.map((child) => (
            <TreeItem key={child.id} unit={child} onUnitClick={onUnitClick} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TreeItem;
