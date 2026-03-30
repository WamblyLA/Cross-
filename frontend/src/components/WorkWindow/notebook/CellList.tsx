import type * as Monaco from "monaco-editor";
import { type ThemeName } from "../../../styles/tokens";
import CodeCellView from "./CodeCellView";
import MarkdownCellView from "./MarkdownCellView";
import UnsupportedCellView from "./UnsupportedCellView";
import type { NotebookCellModel } from "./types";

type CellListProps = {
  cells: NotebookCellModel[];
  editorLanguage: string;
  filePath: string;
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
  beforeMount: (monaco: typeof Monaco) => void;
  cellExecutionState: Record<
    string,
    {
      isRunning: boolean;
      lastStatus: NotebookExecutionStatus | null;
    }
  >;
  canExecuteCodeCells: boolean;
  selectedCellId: string | null;
  focusTargetCellId: string | null;
  focusSequence: number;
  onSelectCell: (localId: string) => void;
  onRunCodeCell: (localId: string) => void;
  onRunCodeCellAndAdvance: (localId: string) => void;
  onPreviewMarkdownCell: (localId: string) => void;
  onPreviewMarkdownCellAndAdvance: (localId: string) => void;
  onChangeSource: (localId: string, source: string) => void;
  onChangeMode: (localId: string, mode: "edit" | "preview") => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
  onSaveRequest: () => Promise<void>;
};

export default function CellList({
  cells,
  editorLanguage,
  filePath,
  theme,
  fontSize,
  tabSize,
  beforeMount,
  cellExecutionState,
  canExecuteCodeCells,
  selectedCellId,
  focusTargetCellId,
  focusSequence,
  onSelectCell,
  onRunCodeCell,
  onRunCodeCellAndAdvance,
  onPreviewMarkdownCell,
  onPreviewMarkdownCellAndAdvance,
  onChangeSource,
  onChangeMode,
  onMove,
  onDelete,
  onSaveRequest,
}: CellListProps) {
  return (
    <div className="flex flex-col gap-4">
      {cells.map((cell, index) => {
        const focusToken = focusTargetCellId === cell.localId ? focusSequence : 0;
        const isSelected = selectedCellId === cell.localId;

        if (cell.cellType === "code") {
          return (
            <CodeCellView
              key={cell.localId}
              cell={cell}
              index={index}
              editorLanguage={editorLanguage}
              filePath={filePath}
              theme={theme}
              fontSize={fontSize}
              tabSize={tabSize}
              beforeMount={beforeMount}
              executionState={
                cellExecutionState[cell.localId] ?? {
                  isRunning: false,
                  lastStatus: null,
                }
              }
              canExecute={canExecuteCodeCells}
              isSelected={isSelected}
              focusToken={focusToken}
              onSelect={onSelectCell}
              onRunCell={onRunCodeCell}
              onRunCellAndAdvance={onRunCodeCellAndAdvance}
              onChangeSource={onChangeSource}
              onMove={onMove}
              onDelete={onDelete}
              onSaveRequest={onSaveRequest}
            />
          );
        }

        if (cell.cellType === "markdown") {
          return (
            <MarkdownCellView
              key={cell.localId}
              cell={cell}
              index={index}
              filePath={filePath}
              theme={theme}
              fontSize={fontSize}
              tabSize={tabSize}
              beforeMount={beforeMount}
              isSelected={isSelected}
              focusToken={focusToken}
              onSelect={onSelectCell}
              onChangeSource={onChangeSource}
              onChangeMode={onChangeMode}
              onPreviewCell={onPreviewMarkdownCell}
              onPreviewCellAndAdvance={onPreviewMarkdownCellAndAdvance}
              onMove={onMove}
              onDelete={onDelete}
              onSaveRequest={onSaveRequest}
            />
          );
        }

        return (
          <UnsupportedCellView
            key={cell.localId}
            cell={cell}
            index={index}
            isSelected={isSelected}
            focusToken={focusToken}
            onSelect={onSelectCell}
            onMove={onMove}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
