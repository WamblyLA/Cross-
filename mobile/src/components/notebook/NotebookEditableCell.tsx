import { Pressable, Text, View } from "react-native";
import type { EditableNotebookCellType, NotebookCellModel } from "../../types/notebook";
import { cn } from "../../lib/utils/cn";
import { InlineNotice } from "../common/InlineNotice";
import { Card } from "../common/Card";
import { MarkdownPreview } from "../markdown/MarkdownPreview";
import { NotebookCellActionButton } from "./NotebookCellActionButton";
import { NotebookOutputList } from "./NotebookOutputList";
import { NotebookSourceEditor } from "./NotebookSourceEditor";

type NotebookEditableCellProps = {
  cell: NotebookCellModel;
  index: number;
  cellCount: number;
  onEditorFocus: (index: number) => void;
  onChangeSource: (localId: string, source: string) => void;
  onChangeMode: (localId: string, mode: "edit" | "preview") => void;
  onAddBelow: (index: number, type: EditableNotebookCellType) => void;
  onDelete: (localId: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onSwitchType: (localId: string, nextType: EditableNotebookCellType) => void;
};

function getCellLabel(cell: NotebookCellModel) {
  return cell.cellType === "markdown" ? "Markdown" : cell.cellType === "code" ? "Код" : "Ячейка";
}

function getCellMeta(cell: NotebookCellModel, index: number) {
  if (cell.cellType === "markdown") {
    return `Ячейка ${index + 1} - ${cell.mode === "preview" ? "просмотр" : "редактирование"}`;
  }

  if (cell.cellType === "code" && cell.executionCount != null) {
    return `Ячейка ${index + 1} - In [${cell.executionCount}]`;
  }

  return `Ячейка ${index + 1}`;
}

export function NotebookEditableCell({
  cell,
  index,
  cellCount,
  onEditorFocus,
  onChangeSource,
  onChangeMode,
  onAddBelow,
  onDelete,
  onMove,
  onSwitchType,
}: NotebookEditableCellProps) {
  if (!cell.isEditable) {
    return (
      <Card className="gap-2">
        <Text className="will-change-variable text-[11px] font-bold uppercase tracking-[1.4px] text-secondary">
          Не поддерживается
        </Text>
        <Text className="will-change-variable text-sm text-primary">{`Ячейка ${index + 1}`}</Text>
        <Text className="will-change-variable text-sm leading-5 text-secondary">
          {`Тип "${cell.cellType}" доступен только для чтения.`}
        </Text>
      </Card>
    );
  }

  const isMarkdown = cell.cellType === "markdown";

  return (
    <Card className="gap-2.5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="will-change-variable text-[11px] font-bold uppercase tracking-[1.4px] text-secondary">
            {getCellLabel(cell)}
          </Text>
          <Text className="will-change-variable text-xs text-primary">{getCellMeta(cell, index)}</Text>
        </View>

        <View className="flex-row gap-1.5">
          <NotebookCellActionButton
            disabled={index === 0}
            label="Вверх"
            onPress={() => onMove(cell.localId, -1)}
          />
          <NotebookCellActionButton
            disabled={index === cellCount - 1}
            label="Вниз"
            onPress={() => onMove(cell.localId, 1)}
          />
          <NotebookCellActionButton
            label="Удал."
            onPress={() => onDelete(cell.localId)}
            tone="danger"
          />
        </View>
      </View>

      {isMarkdown ? (
        <View className="will-change-variable flex-row gap-1.5 rounded-md border border-default bg-panel p-1">
          <Pressable
            className={cn(
              "will-change-variable min-h-8 flex-1 items-center justify-center rounded-sm border px-3",
              cell.mode === "edit" ? "border-default bg-active" : "border-transparent bg-transparent",
            )}
            onPress={() => onChangeMode(cell.localId, "edit")}
          >
            <Text
              className={cn(
                "will-change-variable text-[11px] font-bold uppercase tracking-[1.6px]",
                cell.mode === "edit" ? "text-primary" : "text-secondary",
              )}
            >
              Правка
            </Text>
          </Pressable>
          <Pressable
            className={cn(
              "will-change-variable min-h-8 flex-1 items-center justify-center rounded-sm border px-3",
              cell.mode === "preview" ? "border-default bg-active" : "border-transparent bg-transparent",
            )}
            onPress={() => onChangeMode(cell.localId, "preview")}
          >
            <Text
              className={cn(
                "will-change-variable text-[11px] font-bold uppercase tracking-[1.6px]",
                cell.mode === "preview" ? "text-primary" : "text-secondary",
              )}
            >
              Просмотр
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isMarkdown && cell.mode === "preview" ? (
        <MarkdownPreview content={cell.source} framed={false} scrollable={false} />
      ) : (
        <NotebookSourceEditor
          editable
          onChangeText={(value) => onChangeSource(cell.localId, value)}
          onFocus={() => onEditorFocus(index)}
          placeholder={isMarkdown ? "Markdown-ячейка" : "Ячейка кода"}
          value={cell.source}
        />
      )}

      {cell.hasOutdatedOutputs ? (
        <InlineNotice
          text="Вывод сохранен из файла и может быть неактуален после правок."
          tone="warning"
        />
      ) : null}

      {cell.cellType === "code" ? (
        <NotebookOutputList hasUnsupportedOutputs={cell.hasUnsupportedOutputs} outputs={cell.outputs} />
      ) : null}

      <View className="flex-row flex-wrap gap-1.5">
        <NotebookCellActionButton label="+ Текст" onPress={() => onAddBelow(index, "markdown")} />
        <NotebookCellActionButton label="+ Код" onPress={() => onAddBelow(index, "code")} />
        <NotebookCellActionButton
          label={isMarkdown ? "В код" : "В текст"}
          onPress={() => onSwitchType(cell.localId, isMarkdown ? "code" : "markdown")}
        />
      </View>
    </Card>
  );
}
