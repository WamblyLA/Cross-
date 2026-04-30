import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import {
  addNotebookCell,
  deleteNotebookCell,
  hasNotebookOutdatedOutputs,
  moveNotebookCell,
  setNotebookCellMode,
  switchNotebookCellType,
  updateNotebookCellSource,
} from "../../features/files/notebookDocument";
import { parseNotebookContent, serializeNotebookDocument } from "../../features/files/notebookParser";
import type { EditableNotebookCellType, NotebookDocumentModel } from "../../types/notebook";
import { AppButton } from "../common/AppButton";
import { EmptyState } from "../common/EmptyState";
import { InlineNotice } from "../common/InlineNotice";
import { NotebookEditableCell } from "./NotebookEditableCell";
import { NotebookRawFallback } from "./NotebookRawFallback";

type NotebookEditorProps = {
  content: string;
  onChangeContent: (value: string) => void;
};

function createParsedState(content: string) {
  const parsed = parseNotebookContent(content);

  return {
    document: parsed.document,
    parseError: parsed.parseError,
    isRecognizedNotebook: parsed.isRecognizedNotebook,
  };
}

export function NotebookEditor({ content, onChangeContent }: NotebookEditorProps) {
  const initialState = createParsedState(content);
  const [document, setDocument] = useState<NotebookDocumentModel>(initialState.document);
  const [parseError, setParseError] = useState<string | null>(initialState.parseError);
  const [isRecognizedNotebook, setIsRecognizedNotebook] = useState(initialState.isRecognizedNotebook);
  const lastSerializedRef = useRef(content);

  useEffect(() => {
    if (content === lastSerializedRef.current) {
      return;
    }

    const nextState = createParsedState(content);
    setDocument(nextState.document);
    setParseError(nextState.parseError);
    setIsRecognizedNotebook(nextState.isRecognizedNotebook);
    lastSerializedRef.current = content;
  }, [content]);

  const updateDocument = useCallback(
    (updater: (current: NotebookDocumentModel) => NotebookDocumentModel) => {
      setDocument((current) => {
        const nextDocument = updater(current);
        const serialized = serializeNotebookDocument(nextDocument);

        lastSerializedRef.current = serialized;
        setParseError(null);
        setIsRecognizedNotebook(true);
        onChangeContent(serialized);

        return nextDocument;
      });
    },
    [onChangeContent],
  );

  const handleCreateCell = useCallback(
    (cellType: EditableNotebookCellType) => {
      updateDocument((current) => addNotebookCell(current, cellType));
    },
    [updateDocument],
  );

  if (!isRecognizedNotebook) {
    return (
      <NotebookRawFallback
        content={content}
        reason={parseError || "Файл не распознан как notebook."}
      />
    );
  }

  const hasOutdatedOutputs = hasNotebookOutdatedOutputs(document);

  return (
    <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <AppButton onPress={() => handleCreateCell("code")} title="Code" variant="secondary" />
        </View>
        <View className="flex-1">
          <AppButton onPress={() => handleCreateCell("markdown")} title="Markdown" variant="ghost" />
        </View>
      </View>

      {parseError ? <InlineNotice text={parseError} tone="warning" /> : null}
      {hasOutdatedOutputs ? (
        <InlineNotice
          text="Некоторые outputs сохранены как в исходном notebook и могут быть устаревшими."
          tone="warning"
        />
      ) : null}

      {document.cells.length > 0 ? (
        <View className="gap-2">
          {document.cells.map((cell, index) => (
            <NotebookEditableCell
              cell={cell}
              cellCount={document.cells.length}
              index={index}
              key={cell.localId}
              onAddBelow={(afterIndex, cellType) => {
                updateDocument((current) => addNotebookCell(current, cellType, afterIndex));
              }}
              onChangeMode={(localId, mode) => {
                updateDocument((current) => setNotebookCellMode(current, localId, mode));
              }}
              onChangeSource={(localId, source) => {
                updateDocument((current) => updateNotebookCellSource(current, localId, source));
              }}
              onDelete={(localId) => {
                updateDocument((current) => deleteNotebookCell(current, localId));
              }}
              onMove={(localId, direction) => {
                updateDocument((current) => moveNotebookCell(current, localId, direction));
              }}
              onSwitchType={(localId, nextType) => {
                updateDocument((current) => switchNotebookCellType(current, localId, nextType));
              }}
            />
          ))}
        </View>
      ) : (
        <View className="gap-2">
          <EmptyState
            description="Добавьте первую ячейку и сохраните notebook обратно в .ipynb."
            title="Пустой notebook"
          />
          <View className="gap-2">
            <AppButton onPress={() => handleCreateCell("markdown")} title="Добавить markdown-ячейку" />
            <AppButton
              onPress={() => handleCreateCell("code")}
              title="Добавить code-ячейку"
              variant="secondary"
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
