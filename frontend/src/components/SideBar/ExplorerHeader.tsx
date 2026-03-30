import { VscNewFile, VscNewFolder, VscRefresh } from "react-icons/vsc";
import { selectIsAuthenticated } from "../../features/auth/authSelectors";
import { selectCloudActiveProject } from "../../features/cloud/cloudSelectors";
import { requestExplorerAction } from "../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import SearchBar from "../../ui/SearchBar";
import { getBaseName } from "../../utils/path";

export default function ExplorerHeader() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);

  const canCreateFile =
    source === "cloud" ? isAuthenticated && Boolean(activeCloudProject) : Boolean(rootPath);
  const canCreateFolder = source === "local" && Boolean(rootPath);
  const canRefresh = source === "cloud" ? isAuthenticated : Boolean(rootPath);

  const subtitle = source === "cloud" ? "Облачный проводник" : "Локальный проводник";
  const title =
    source === "cloud"
      ? activeCloudProject?.name ??
        (isAuthenticated ? "Проект не выбран" : "Войдите, чтобы открыть облако")
      : rootPath
        ? getBaseName(rootPath)
        : "Папка не открыта";

  return (
    <div className="border-b border-default bg-chrome px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="ui-eyebrow">{subtitle}</div>
          <div className="truncate text-sm text-primary">{title}</div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(requestExplorerAction("create-file"))}
            disabled={!canCreateFile}
            title={source === "cloud" ? "Новый облачный файл" : "Новый файл"}
          >
            <VscNewFile className="h-4 w-4" />
          </button>

          {source === "local" ? (
            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => dispatch(requestExplorerAction("create-folder"))}
              disabled={!canCreateFolder}
              title="Новая папка"
            >
              <VscNewFolder className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(requestExplorerAction("refresh"))}
            disabled={!canRefresh}
            title={source === "cloud" ? "Синхронизировать проекты" : "Обновить проводник"}
          >
            <VscRefresh className="h-4 w-4" />
          </button>
        </div>
      </div>

      <SearchBar className="mt-3 w-full" />
    </div>
  );
}
