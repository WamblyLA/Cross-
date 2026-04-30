import { VscChromeClose } from "react-icons/vsc";
import {
  activateBottomPanelTab,
  hideBottomPanel,
  setBottomPanelHeight,
} from "../../features/panel/panelSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import type { ThemeName } from "../../styles/tokens";
import ResizeableBlock from "../../ui/ResizeableBlock";
import RunPanel from "../Run/RunPanel";
import TerminalPanel from "../Terminal/TerminalPanel";

type BottomPanelProps = {
  theme: ThemeName;
};

const MIN_BOTTOM_PANEL_HEIGHT = 200;
const MAX_BOTTOM_PANEL_HEIGHT = 560;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 352;

export default function BottomPanel({ theme }: BottomPanelProps) {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector((state) => state.panel.isVisible);
  const activeTab = useAppSelector((state) => state.panel.activeTab);
  const height = useAppSelector((state) => state.panel.height);
  const currentSession = useAppSelector((state) => state.run.currentSession);

  if (!isVisible) {
    return null;
  }

  return (
    <ResizeableBlock
      minSize={MIN_BOTTOM_PANEL_HEIGHT}
      maxSize={MAX_BOTTOM_PANEL_HEIGHT}
      defaultSize={DEFAULT_BOTTOM_PANEL_HEIGHT}
      direction="u"
      size={height}
      collapsible={false}
      onSizeChange={(nextHeight) => dispatch(setBottomPanelHeight(nextHeight))}
    >
      <div className="flex h-full min-h-0 shrink-0 flex-col border-t border-default bg-chrome">
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

        <div className="min-h-0 flex-1">
          {activeTab === "terminal" ? <TerminalPanel theme={theme} /> : <RunPanel theme={theme} />}
        </div>
      </div>
    </ResizeableBlock>
  );
}
