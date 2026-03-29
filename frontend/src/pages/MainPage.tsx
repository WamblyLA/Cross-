import BottomPanel from "../components/BottomPanel/BottomPanel";
import RunConfigurationDialog from "../components/Run/RunConfigurationDialog";
import SideBar from "../components/SideBar/SideBar";
import WorkWindow from "../components/WorkWindow/WorkWindow";
import type { ThemeName } from "../styles/tokens";

type MainPageProps = {
  theme: ThemeName;
};

export default function MainPage({ theme }: MainPageProps) {
  return (
    <div className="flex h-full min-h-0 flex-1">
      <SideBar />

      <div className="flex min-w-0 flex-1 flex-col bg-editor">
        <WorkWindow theme={theme} />
        <BottomPanel theme={theme} />
      </div>

      <RunConfigurationDialog />
    </div>
  );
}
