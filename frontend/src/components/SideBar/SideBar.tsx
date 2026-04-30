import ResizeableBlock from "../../ui/ResizeableBlock";
import { useAppSelector } from "../../store/hooks";
import CloudExplorer from "./Cloud/CloudExplorer";
import FileTree from "./FileTree/FileTree";
import LinkedWorkspaceBanner from "./Linked/LinkedWorkspaceBanner";
import OptionsBar from "./OptionsBar/OptionsBar";
import LinkedWorkspaceSyncDialogs from "../Sync/LinkedWorkspaceSyncDialogs";

export default function SideBar() {
  const source = useAppSelector((state) => state.workspace.source);

  return (
    <ResizeableBlock minSize={220} direction="r" defaultSize={300}>
      <div className="bg-chrome border-r border-default w-full h-full flex flex-col min-w-0">
        <OptionsBar />
        <LinkedWorkspaceBanner />
        {source === "cloud" ? <CloudExplorer /> : <FileTree />}
        <LinkedWorkspaceSyncDialogs />
      </div>
    </ResizeableBlock>
  );
}
