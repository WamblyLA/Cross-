import { Provider } from "react-redux";
import SideBar from "../components/SideBar/SideBar";
import SideIcons from "../components/SideIcons/SideIcons";
import TopBar from "../components/TopBar/TopBar";
import WorkWindow from "../components/WorkWindow/WorkWindow";
import store from "../store/store";
import type { ThemeName } from "../styles/tokens";
import PrimaryButton from "../ui/PrimaryButton";

type MainPageProps = {
  rootPath: string | null;
  setRootPath: React.Dispatch<React.SetStateAction<string | null>>;
  theme: ThemeName;
  onToggleTheme: () => void;
};

export default function MainPage({
  rootPath,
  setRootPath,
  theme,
  onToggleTheme,
}: MainPageProps) {
  const handleOpenFolder = async () => {
    try {
      const result = await window.electronAPI.openFolder();
      if (!result) return;

      setRootPath(result.folderPath);
      console.log("Opened folder:", result.folderPath);
    } catch (err) {
      console.error("Open folder error", err);
    }
  };

  return (
    <Provider store={store}>
      <div className="h-screen w-full bg-app text-primary flex flex-col">
        <TopBar theme={theme} onToggleTheme={onToggleTheme} />

        <div className="px-2 py-2 border-b border-default bg-app flex items-center gap-3">
          <PrimaryButton onClick={handleOpenFolder} className="px-3 py-1.5 text-sm">
            Открыть
          </PrimaryButton>

          {rootPath ? <span className="text-sm text-muted">{rootPath}</span> : null}
        </div>

        <div className="flex-1 w-full flex min-h-0">
          <SideIcons />
          <SideBar rootPath={rootPath} />
          <WorkWindow theme={theme} />
        </div>
      </div>
    </Provider>
  );
}
