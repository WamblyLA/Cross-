import { useMemo } from "react";
import { ScrollView } from "react-native";
import { parseNotebookContent } from "../../features/files/notebookParser";
import { EmptyState } from "../common/EmptyState";
import { InlineNotice } from "../common/InlineNotice";
import { NotebookCellList } from "./NotebookCellList";
import { NotebookRawFallback } from "./NotebookRawFallback";

type NotebookViewProps = {
  content: string;
};

export function NotebookView({ content }: NotebookViewProps) {
  const parsed = useMemo(() => parseNotebookContent(content), [content]);

  if (!parsed.isRecognizedNotebook) {
    return (
      <NotebookRawFallback
        content={content}
        reason={parsed.parseError || "Файл не распознан как notebook."}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {parsed.parseError ? <InlineNotice text={parsed.parseError} tone="warning" /> : null}

      {parsed.document.cells.length > 0 ? (
        <NotebookCellList cells={parsed.document.cells} />
      ) : (
        <EmptyState
          description="В notebook пока нет ячеек."
          title="Пустой notebook"
        />
      )}
    </ScrollView>
  );
}
