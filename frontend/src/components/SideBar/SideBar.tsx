import React from "react";
import ResizeableBlock from "../../ui/ResizeableBlock";

export default function SideBar() {
  return (
    <ResizeableBlock minWidth={100} direction="r" defaultWidth={300}>
      <div className="bg-[#121f14] w-full h-full">SideBar</div>
    </ResizeableBlock>
  );
}
