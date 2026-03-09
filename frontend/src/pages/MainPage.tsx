import TopBar from "../components/TopBar/TopBar";
import SideBar from "../components/SideBar/SideBar";
import SideIcons from "../components/SideIcons/SideIcons";
import { Provider } from "react-redux";
import store from "../store/store";
import WorkWindow from "../components/WorkWindow/WorkWindow";

type MainPageProps = {
  rootPath: string | null;
  setRootPath: React.Dispatch<React.SetStateAction<string | null>>;
};

export default function MainPage({ rootPath, setRootPath }: MainPageProps) {
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
      <div className="h-screen w-full bg-main-page-bg flex flex-col">
        <TopBar />

        {/* <TODO>Эту кнопку потом убрать, это открытие папки</TODO> */}
        <div className="px-2 py-1">
          <button
            onClick={handleOpenFolder}
            className="px-3 py-1 bg-green-800 text-white rounded"
          >
            Открыть
          </button>

          {rootPath && (
            <span className="ml-3 text-sm text-gray-400">{rootPath}</span>
          )}
        </div>

        <div className="flex-1 w-full flex">
          <SideIcons />
          <SideBar rootPath={rootPath} />
          <WorkWindow />
        </div>
      </div>
    </Provider>
  );
}
