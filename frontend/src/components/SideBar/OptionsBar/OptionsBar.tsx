import { VscCollapseAll, VscNewFile, VscNewFolder, VscRefresh } from "react-icons/vsc";
import { requestExplorerAction } from "../../../features/workspace/workspaceSlice";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { getBaseName } from "../../../utils/path";

export default function OptionsBar() {
  const dispatch = useAppDispatch();
  const rootPath = useAppSelector((state) => state.workspace.rootPath);

  return (
    <div className="flex h-12 items-center justify-between gap-2 border-b border-default bg-chrome px-3 py-2">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Проводник</div>
        <div className="truncate text-sm text-primary">
          {rootPath ? getBaseName(rootPath) : "Локальная папка не выбрана"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 text-base">
        <button
          type="button"
          className="ui-control h-8 w-8"
          onClick={() => dispatch(requestExplorerAction("create-file"))}
          disabled={!rootPath}
          title="Новый файл"
        >
          <VscNewFile />
        </button>
        <button
          type="button"
          className="ui-control h-8 w-8"
          onClick={() => dispatch(requestExplorerAction("create-folder"))}
          disabled={!rootPath}
          title="Новая папка"
        >
          <VscNewFolder />
        </button>
        <button
          type="button"
          className="ui-control h-8 w-8"
          onClick={() => dispatch(requestExplorerAction("refresh"))}
          disabled={!rootPath}
          title="Обновить дерево"
        >
          <VscRefresh />
        </button>
        <button
          type="button"
          className="ui-control h-8 w-8"
          onClick={() => dispatch(requestExplorerAction("collapse-all"))}
          disabled={!rootPath}
          title="Свернуть все"
        >
          <VscCollapseAll />
        </button>
      </div>
    </div>
  );
}
