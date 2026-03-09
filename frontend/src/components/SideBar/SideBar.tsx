import ResizeableBlock from "../../ui/ResizeableBlock";
import OptionsBar from "./OptionsBar/OptionsBar";
import FileTree from "./FileTree/FileTree";

type SideBarProps = {
  rootPath: string | null;
};

export default function SideBar({ rootPath }: SideBarProps) {
  return (
    <ResizeableBlock minWidth={200} direction="r" defaultWidth={300}>
      <div className="bg-side-bar-bg w-full h-full">
        <OptionsBar />
        <FileTree rootPath={rootPath} />
      </div>
    </ResizeableBlock>
  );
}