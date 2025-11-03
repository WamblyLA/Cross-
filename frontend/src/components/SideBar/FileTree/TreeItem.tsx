import React from "react";
import { useState } from "react";
import { IoMdFolderOpen } from "react-icons/io";
import { IoFolderOpenOutline } from "react-icons/io5";
import { CiFileOn } from "react-icons/ci";
import { RiArrowDropRightLine } from "react-icons/ri";
import { RiArrowDropDownLine } from "react-icons/ri";
import { useRequest } from "../../../hooks/useRequest";
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [children, setChildren] = useState<TreeItemType[] | null>(unit.children ?? null);
  const {refetch} = useRequest<{files: {name: string; isDirectory: boolean}[]}>({
    url: "http://localhost:3000/api/files",
    auto: false
  })
  const processClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unit.type === "folder") {
      if (!isOpen && !children) {
        try {
          const res = await refetch({params: {path: unit.id}})
          if (res?.files) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setChildren(res.files.map((file: any) => ({
              id: `${unit.id}/${file.name}`,
              type: file.isDirectory ? "folder" : "file",
              name: file.name
            })))
          }
        } catch(err) {
          console.error("Ошибка при загрузке папки", err);
        }
      }
      setIsOpen(!isOpen);
    } else {
      onUnitClick(unit);
    }
  }
  return (
    <div className="select-none">
      <div
        className="w-full px-1 py-1 flex gap-2 items-center hover:cursor-pointer"
        onClick={processClick}
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
      {isOpen && children && (
        <div style={{ paddingLeft: "16px" }}>
          {children?.map((child) => (
            <TreeItem key={child.id} unit={child} onUnitClick={onUnitClick} />
          ))}
        </div>
      )}
    </div>
  );
};
export default TreeItem;
