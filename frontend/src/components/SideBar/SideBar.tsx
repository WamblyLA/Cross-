import ResizeableBlock from "../../ui/ResizeableBlock";
import OptionsBar from "./OptionsBar/OptionsBar";
import FileTree from "./FileTree/FileTree";
export default function SideBar() {
  return (
    <ResizeableBlock minWidth={200} direction="r" defaultWidth={300}>
      <div className="bg-side-bar-bg w-full h-full">
        <OptionsBar />
        <FileTree />
      </div>
    </ResizeableBlock>
  );
}
