import React from "react";
import ResizeableBlock from "../../ui/ResizeableBlock";
import FileTree from "./FileTree/FileTree";
import mockData from "./FileTree/mockData"
export default function SideBar() {
  return (
    <ResizeableBlock minWidth={100} direction="r" defaultWidth={300}>
      <div className="bg-[#121f14] w-full h-full">
        <FileTree treeData={mockData}/>
      </div>
    </ResizeableBlock>
  );
}
