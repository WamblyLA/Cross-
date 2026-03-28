import ResizeableBlock from "../../ui/ResizeableBlock";
import { useAppSelector } from "../../store/hooks";
import CloudExplorer from "./Cloud/CloudExplorer";
import FileTree from "./FileTree/FileTree";
import OptionsBar from "./OptionsBar/OptionsBar";

export default function SideBar() {
  const source = useAppSelector((state) => state.workspace.source);

  return (
    <ResizeableBlock minWidth={220} direction="r" defaultWidth={300}>
      <div className="bg-chrome border-r border-default w-full h-full flex flex-col min-w-0">
        <OptionsBar />
        {source === "cloud" ? <CloudExplorer /> : <FileTree />}
      </div>
    </ResizeableBlock>
  );
}
