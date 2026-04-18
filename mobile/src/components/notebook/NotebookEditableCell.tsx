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
  onChangeSource: (localId: string, source: string) => void;
  onChangeMode: (localId: string, mode: "edit" | "preview") => void;
  onAddBelow: (index: number, type: EditableNotebookCellType) => void;
  onDelete: (localId: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
  onSwitchType: (localId: string, nextType: EditableNotebookCellType) => void;
};

function getCellTitle(cell: NotebookCellModel, index: number) {
  if (cell.cellType === "markdown") {
    return `Markdown-ячейка ${index + 1}`;
  }

  if (cell.cellType === "code") {
    const suffix = cell.executionCount != null ? ` • In [${cell.executionCount}]` : "";
    return `Code-ячейка ${index + 1}${suffix}`;
  }

  return `Ячейка ${index + 1}`;
}

export function NotebookEditableCell({
  cell,
  index,
  cellCount,
  onChangeSource,
  onChangeMode,
  onAddBelow,
  onDelete,
  onMove,
  onSwitchType,
}: NotebookEditableCellProps) {
  if (!cell.isEditable) {
    return (
      <Card>
        <Text className="will-change-variable text-sm font-extrabold text-primary">
          {`Ячейка ${index + 1}`}
        </Text>
        <Text className="will-change-variable text-sm leading-6 text-secondary">
          {`Тип "${cell.cellType}" пока доступен только для просмотра.`}
        </Text>
      </Card>
    );
  }

  const isMarkdown = cell.cellType === "markdown";

  return (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold text-secondary">
            {getCellTitle(cell, index)}
          </Text>
          <Text className="will-change-variable text-xs text-muted">
            {isMarkdown ? "Без выполнения" : "Код редактируется как обычный текст"}
          </Text>
        </View>

        {isMarkdown ? (
          <View className="will-change-variable flex-row gap-2 rounded-md border border-default bg-editor p-1">
            <Pressable
              className={cn(
                "will-change-variable min-h-9 flex-1 items-center justify-center rounded-sm border px-3",
                cell.mode === "edit" ? "border-default bg-active" : "border-transparent bg-transparent",
              )}
              onPress={() => onChangeMode(cell.localId, "edit")}
            >
              <Text
                className={cn(
                  "will-change-variable text-xs font-bold uppercase tracking-[1.6px]",
                  cell.mode === "edit" ? "text-primary" : "text-secondary",
                )}
              >
                Редактирование
              </Text>
            </Pressable>
            <Pressable
              className={cn(
                "will-change-variable min-h-9 flex-1 items-center justify-center rounded-sm border px-3",
                cell.mode === "preview"
                  ? "border-default bg-active"
                  : "border-transparent bg-transparent",
              )}
              onPress={() => onChangeMode(cell.localId, "preview")}
            >
              <Text
                className={cn(
                  "will-change-variable text-xs font-bold uppercase tracking-[1.6px]",
                  cell.mode === "preview" ? "text-primary" : "text-secondary",
                )}
              >
                Просмотр
              </Text>
            </Pressable>
          </View>
        ) : null}

        {isMarkdown && cell.mode === "preview" ? (
          <MarkdownPreview content={cell.source} scrollable={false} />
        ) : (
          <NotebookSourceEditor
            editable
            onChangeText={(value) => onChangeSource(cell.localId, value)}
            placeholder={isMarkdown ? "Markdown-ячейка пуста" : "Code-ячейка пуста"}
            value={cell.source}
          />
        )}

        {cell.hasOutdatedOutputs ? (
          <InlineNotice
            text="Вывод сохранён как в файле и может быть устаревшим после правок."
            tone="warning"
          />
        ) : null}

        {cell.cellType === "code" ? (
          <NotebookOutputList hasUnsupportedOutputs={cell.hasUnsupportedOutputs} outputs={cell.outputs} />
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <NotebookCellActionButton
            label="Добавить markdown"
            onPress={() => onAddBelow(index, "markdown")}
          />
          <NotebookCellActionButton label="Добавить code" onPress={() => onAddBelow(index, "code")} />
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
            label={isMarkdown ? "В code" : "В markdown"}
            onPress={() => onSwitchType(cell.localId, isMarkdown ? "code" : "markdown")}
          />
          <NotebookCellActionButton
            disabled={cellCount === 0}
            label="Удалить"
            onPress={() => onDelete(cell.localId)}
            tone="danger"
          />
        </View>
      </View>
    </Card>
  );
}
