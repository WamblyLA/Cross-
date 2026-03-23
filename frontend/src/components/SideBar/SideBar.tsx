import ResizeableBlock from "../../ui/ResizeableBlock";
import FileTree from "./FileTree/FileTree";
import OptionsBar from "./OptionsBar/OptionsBar";

type SideBarProps = {
  rootPath: string | null;
};

export default function SideBar({ rootPath }: SideBarProps) {
  return (
    <ResizeableBlock minWidth={200} direction="r" defaultWidth={300}>
      <div className="bg-chrome border-r border-default w-full h-full flex flex-col">
        <OptionsBar />
        <FileTree rootPath={rootPath} />
      </div>
    </ResizeableBlock>
  );
}
