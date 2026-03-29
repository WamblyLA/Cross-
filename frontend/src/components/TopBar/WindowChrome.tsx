import type { ReactNode } from "react";
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize } from "react-icons/vsc";
import { selectCloudActiveProject } from "../../features/cloud/cloudSelectors";
import { useAppSelector } from "../../store/hooks";
import { getBaseName } from "../../utils/path";

function WindowButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="window-no-drag ui-control flex h-7 w-7 items-center justify-center rounded-[8px]"
    >
      {children}
    </button>
  );
}

export default function WindowChrome() {
  const source = useAppSelector((state) => state.workspace.source);
  const rootPath = useAppSelector((state) => state.workspace.rootPath);
  const activeCloudProject = useAppSelector(selectCloudActiveProject);

  const projectLabel =
    source === "cloud"
      ? activeCloudProject?.name ?? "Облачное рабочее пространство"
      : rootPath
        ? getBaseName(rootPath)
        : "Локальное рабочее пространство";

  return (
    <div className="window-drag flex h-9 items-center justify-between border-b border-default bg-app px-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted">Cross++</div>
        <div className="truncate text-xs text-secondary">{projectLabel}</div>
      </div>

      <div className="window-no-drag flex items-center gap-1">
        <WindowButton title="Свернуть окно" onClick={() => window.electronAPI.minimizeWindow()}>
          <VscChromeMinimize className="h-4 w-4" />
        </WindowButton>
        <WindowButton
          title="Развернуть или восстановить окно"
          onClick={() => window.electronAPI.toggleMaximizeWindow()}
        >
          <VscChromeMaximize className="h-4 w-4" />
        </WindowButton>
        <WindowButton title="Закрыть окно" onClick={() => window.electronAPI.closeWindow()}>
          <VscChromeClose className="h-4 w-4" />
        </WindowButton>
      </div>
    </div>
  );
}
