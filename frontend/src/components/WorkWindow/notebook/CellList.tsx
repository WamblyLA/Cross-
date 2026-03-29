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
  beforeMount: (monaco: typeof Monaco) => void;
  onChangeSource: (localId: string, source: string) => void;
  onChangeMode: (localId: string, mode: "edit" | "preview") => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onDelete: (localId: string) => void;
  onAddBelow: (cellType: "code" | "markdown", afterIndex: number) => void;
  onSaveRequest: () => Promise<void>;
};

export default function CellList({
  cells,
  editorLanguage,
  filePath,
  theme,
  beforeMount,
  onChangeSource,
  onChangeMode,
  onMove,
  onDelete,
  onAddBelow,
  onSaveRequest,
}: CellListProps) {
  return (
    <div className="flex flex-col gap-4">
      {cells.map((cell, index) => {
        if (cell.cellType === "code") {
          return (
            <CodeCellView
              key={cell.localId}
              cell={cell}
              index={index}
              editorLanguage={editorLanguage}
              filePath={filePath}
              theme={theme}
              beforeMount={beforeMount}
              onChangeSource={onChangeSource}
              onMove={onMove}
              onDelete={onDelete}
              onAddBelow={onAddBelow}
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
              beforeMount={beforeMount}
              onChangeSource={onChangeSource}
              onChangeMode={onChangeMode}
              onMove={onMove}
              onDelete={onDelete}
              onAddBelow={onAddBelow}
              onSaveRequest={onSaveRequest}
            />
          );
        }

        return (
          <UnsupportedCellView
            key={cell.localId}
            cell={cell}
            index={index}
            onMove={onMove}
            onDelete={onDelete}
            onAddBelow={onAddBelow}
          />
        );
      })}
    </div>
  );
}
