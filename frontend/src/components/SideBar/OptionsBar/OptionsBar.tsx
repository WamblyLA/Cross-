import { VscCollapseAll, VscNewFile, VscNewFolder, VscRefresh } from "react-icons/vsc";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import { selectCloudActiveProject } from "../../../features/cloud/cloudSelectors";
import {
  requestExplorerAction,
  setWorkspaceSource,
} from "../../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { getBaseName } from "../../../utils/path";

function sourceButtonClassName(isActive: boolean) {
  return `ui-control h-8 px-3 text-xs uppercase tracking-[0.14em] ${
    isActive ? "border border-default bg-active text-primary" : ""
  }`;
}

export default function OptionsBar() {
  const dispatch = useAppDispatch();
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);

  const canCreateFile =
    source === "cloud" ? isAuthenticated && Boolean(activeCloudProject) : Boolean(rootPath);
  const canCreateFolder = source === "local" && Boolean(rootPath);
  const canRefresh = source === "cloud" ? isAuthenticated : Boolean(rootPath);
  const canCollapse = source === "cloud" ? isAuthenticated && Boolean(activeCloudProject) : Boolean(rootPath);

  const title =
    source === "cloud"
      ? activeCloudProject?.name ?? (isAuthenticated ? "Облачный проект не выбран" : "Облако доступно после входа")
      : rootPath
        ? getBaseName(rootPath)
        : "Локальная папка не выбрана";

  const subtitle = source === "cloud" ? "Облачный проводник" : "Локальный проводник";

  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-default bg-chrome px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{subtitle}</div>
        <div className="truncate text-sm text-primary">{title}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1 rounded-[10px] border border-default bg-panel p-1">
          <button
            type="button"
            className={sourceButtonClassName(source === "local")}
            onClick={() => dispatch(setWorkspaceSource("local"))}
          >
            Локально
          </button>
          <button
            type="button"
            className={sourceButtonClassName(source === "cloud")}
            onClick={() => dispatch(setWorkspaceSource("cloud"))}
          >
            Облако
          </button>
        </div>

        <div className="flex items-center gap-1 text-base">
          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(requestExplorerAction("create-file"))}
            disabled={!canCreateFile}
            title={
              source === "cloud"
                ? "Новый облачный файл"
                : "Новый локальный файл"
            }
          >
            <VscNewFile />
          </button>
          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(requestExplorerAction("create-folder"))}
            disabled={!canCreateFolder}
            title={
              source === "cloud"
                ? "Папки в облачных проектах пока не поддерживаются"
                : "Новая локальная папка"
            }
          >
            <VscNewFolder />
          </button>
          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(requestExplorerAction("refresh"))}
            disabled={!canRefresh}
            title={source === "cloud" ? "Обновить облачные проекты" : "Обновить локальное дерево"}
          >
            <VscRefresh />
          </button>
          <button
            type="button"
            className="ui-control h-8 w-8"
            onClick={() => dispatch(requestExplorerAction("collapse-all"))}
            disabled={!canCollapse}
            title={source === "cloud" ? "Свернуть активный облачный проект" : "Свернуть всё"}
          >
            <VscCollapseAll />
          </button>
        </div>
      </div>
    </div>
  );
}
