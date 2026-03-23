import ResizeableBlock from "../../ui/ResizeableBlock";
import FileTree from "./FileTree/FileTree";
import OptionsBar from "./OptionsBar/OptionsBar";

export default function SideBar() {
  return (
    <ResizeableBlock minWidth={220} direction="r" defaultWidth={300}>
      <div className="bg-chrome border-r border-default w-full h-full flex flex-col min-w-0">
        <OptionsBar />
        <FileTree />
      </div>
    </ResizeableBlock>
  );
}
