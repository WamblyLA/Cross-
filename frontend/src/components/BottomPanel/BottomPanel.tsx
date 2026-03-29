import { VscChromeClose } from "react-icons/vsc";
import { activateBottomPanelTab, hideBottomPanel } from "../../features/panel/panelSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ThemeName } from "../../styles/tokens";
import RunPanel from "../Run/RunPanel";
import TerminalPanel from "../Terminal/TerminalPanel";

type BottomPanelProps = {
  theme: ThemeName;
};

export default function BottomPanel({ theme }: BottomPanelProps) {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector((state) => state.panel.isVisible);
  const activeTab = useAppSelector((state) => state.panel.activeTab);
  const currentSession = useAppSelector((state) => state.run.currentSession);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-default bg-chrome">
      <div className="flex h-10 items-center justify-between gap-2 border-b border-default px-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`ui-control px-3 py-1.5 text-sm ${
              activeTab === "terminal" ? "border border-default bg-active text-primary" : ""
            }`}
            onClick={() => dispatch(activateBottomPanelTab("terminal"))}
          >
            Терминал
          </button>
          <button
            type="button"
            className={`ui-control px-3 py-1.5 text-sm ${
              activeTab === "run" ? "border border-default bg-active text-primary" : ""
            }`}
            onClick={() => dispatch(activateBottomPanelTab("run"))}
          >
            Запуск
            {currentSession?.isBusy ? (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
            ) : null}
          </button>
        </div>

        <button
          type="button"
          className="ui-control h-8 w-8"
          onClick={() => dispatch(hideBottomPanel())}
          title="Скрыть нижнюю панель"
        >
          <VscChromeClose />
        </button>
      </div>

      <div className="h-[22rem] min-h-0">
        {activeTab === "terminal" ? <TerminalPanel theme={theme} /> : <RunPanel theme={theme} />}
      </div>
    </div>
  );
}
