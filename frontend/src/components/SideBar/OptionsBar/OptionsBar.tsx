import { VscNewFile, VscNewFolder } from "react-icons/vsc";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import { selectCloudActiveProject } from "../../../features/cloud/cloudSelectors";
import {
  requestExplorerAction,
  setWorkspaceSource,
} from "../../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { getBaseName } from "../../../utils/path";

function sourceButtonClassName(isActive: boolean) {
  return `ui-control ui-segmented-control-button ${
    isActive ? "ui-segmented-control-button-active" : ""
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
  const canCreateFolder =
    source === "cloud" ? isAuthenticated && Boolean(activeCloudProject) : Boolean(rootPath);

  const title =
    source === "cloud"
      ? activeCloudProject?.name ??
        (isAuthenticated ? "Облачный проект не выбран" : "Войдите, чтобы открыть облако")
      : rootPath
        ? getBaseName(rootPath)
        : "Папка не открыта";

  const subtitle = source === "cloud" ? "Облачный проводник" : "Локальный проводник";
  const isCloud = source === "cloud";

  return (
    <div className="border-b border-default bg-chrome px-3 py-3">
      <div className={`flex gap-3 ${isCloud ? "flex-col" : "flex-wrap items-start justify-between"}`}>
        <div className="min-w-0 flex-1">
          <div className="ui-eyebrow">{subtitle}</div>
          <div className="truncate text-sm text-primary">{title}</div>
        </div>

        <div
          className={`flex gap-2 ${
            isCloud
              ? "min-w-0 items-center justify-between"
              : "shrink-0 flex-wrap items-center justify-end"
          }`}
        >
          <div className="ui-segmented-control">
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

          <div className="flex flex-none items-center gap-1">
            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => dispatch(requestExplorerAction("create-file"))}
              disabled={!canCreateFile}
              title={source === "cloud" ? "Новый облачный файл" : "Новый файл"}
            >
              <VscNewFile className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => dispatch(requestExplorerAction("create-folder"))}
              disabled={!canCreateFolder}
              title={source === "cloud" ? "Новая облачная папка" : "Новая папка"}
            >
              <VscNewFolder className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
