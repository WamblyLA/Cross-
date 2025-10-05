import React from "react";
import { useState } from "react";
import { IoMdFolderOpen } from "react-icons/io";
import { IoFolderOpenOutline } from "react-icons/io5";
import { CiFileOn } from "react-icons/ci";
import { RiArrowDropRightLine } from "react-icons/ri";
import { RiArrowDropDownLine } from "react-icons/ri";
export type TreeItemType = {
  id: string;
  name: string;
  extencion?: string;
  type: "file" | "folder";
  children?: TreeItemType[];
};
interface TreeItemProps {
  unit: TreeItemType;
  onUnitClick: (unit: TreeItemType) => void;
}
const TreeItem: React.FC<TreeItemProps> = ({ unit, onUnitClick }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <div className="select-none">
      <div
        className="w-full px-1 py-1 flex gap-2 items-center hover:cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (unit.type === "folder") {
            setIsOpen(!isOpen);
          } else {
            onUnitClick(unit);
          }
        }}
      >
        <div>
          {unit.type === "folder" ? (
            isOpen ? (
              <RiArrowDropDownLine className="text-lg" />
            ) : (
              <RiArrowDropRightLine className="text-lg" />
            )
          ) : (
            ""
          )}
        </div>
        <div>
          {unit.type === "folder" ? (
            isOpen ? (
              <IoFolderOpenOutline className="text-lg" />
            ) : (
              <IoMdFolderOpen className="text-lg" />
            )
          ) : (
            <CiFileOn className="text-lg" />
          )}
        </div>
        <span>
          {unit.name}
          {unit.type === "file" && unit.extencion ? `.${unit.extencion}` : ""}
        </span>
      </div>
      {isOpen && unit.children && (
        <div style={{ paddingLeft: "16px" }}>
          {unit.children?.map((child) => (
            <TreeItem key={child.id} unit={child} onUnitClick={onUnitClick} />
          ))}
        </div>
      )}
    </div>
  );
};
export default TreeItem;
