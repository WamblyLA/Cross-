import { useCallback, useEffect, useRef, useState } from "react";
import { createNotebookDocumentWithStarterCell } from "./notebookDocument";
import { parseNotebookContent, serializeNotebookDocument } from "./notebookPersistence";
import type { NotebookDocumentModel } from "./types";

type CommitOptions = { markDirty?: boolean };
type ApplyDocumentOptions = CommitOptions & {
  syncToStore?: boolean;
  parseError?: string | null;
};

type UseNotebookDocumentStateOptions = {
  content: string;
  filePath: string;
  isDirty: boolean;
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
};

function getInitialSelection(document: NotebookDocumentModel) {
  return document.cells[0]?.localId ?? null;
}

export function useNotebookDocumentState({
  content,
  filePath,
  isDirty,
  onCommitContent,
  onMarkDirty,
}: UseNotebookDocumentStateOptions) {
  const initialParsedRef = useRef<ReturnType<typeof parseNotebookContent> | null>(null);
  if (initialParsedRef.current === null) {
    initialParsedRef.current = parseNotebookContent(content);
  }

  const initialDocument =
    initialParsedRef.current.document ?? createNotebookDocumentWithStarterCell("code");
  const [document, setDocument] = useState<NotebookDocumentModel>(initialDocument);
  const [parseError, setParseError] = useState<string | null>(initialParsedRef.current.parseError);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(() =>
    getInitialSelection(initialDocument),
  );
  const [focusTargetCellId, setFocusTargetCellId] = useState<string | null>(null);
  const [focusSequence, setFocusSequence] = useState(0);
  const documentRef = useRef(document);
  const lastFilePathRef = useRef(filePath);
  const lastCommittedContentRef = useRef(content);
  const dirtyNotifiedRef = useRef(isDirty);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    dirtyNotifiedRef.current = isDirty;
  }, [isDirty]);

  const focusCell = useCallback((cellId: string | null) => {
    setSelectedCellId(cellId);
    setFocusTargetCellId(cellId);
    if (cellId) {
      setFocusSequence((current) => current + 1);
    }
  }, []);

  const selectCell = useCallback((cellId: string) => setSelectedCellId(cellId), []);

  const applyParsedNotebook = useCallback((nextContent: string, dirtyState: boolean) => {
    const parsed = parseNotebookContent(nextContent);
    lastCommittedContentRef.current = nextContent;
    documentRef.current = parsed.document;
    dirtyNotifiedRef.current = dirtyState;
    setDocument(parsed.document);
    setParseError(parsed.parseError);
    setStatusMessage(parsed.parseError ? "В ноутбуке некорректный JSON." : null);
    setSelectedCellId(getInitialSelection(parsed.document));
    setFocusTargetCellId(null);
  }, []);

  useEffect(() => {
    if (filePath !== lastFilePathRef.current) {
      lastFilePathRef.current = filePath;
      applyParsedNotebook(content, isDirty);
    } else if (!dirtyNotifiedRef.current && content !== lastCommittedContentRef.current) {
      applyParsedNotebook(content, isDirty);
    }
  }, [applyParsedNotebook, content, filePath, isDirty]);

  useEffect(
    () => () => {
      const serialized = serializeNotebookDocument(documentRef.current);
      if (serialized !== lastCommittedContentRef.current) {
        lastCommittedContentRef.current = serialized;
        onCommitContent(serialized);
      }
    },
    [onCommitContent],
  );

  useEffect(() => {
    setSelectedCellId((current) =>
      current && document.cells.some((cell) => cell.localId === current)
        ? current
        : getInitialSelection(document),
    );
  }, [document]);

  const syncDocumentToStore = useCallback(
    (nextDocument: NotebookDocumentModel) => {
      const serialized = serializeNotebookDocument(nextDocument);
      if (serialized !== lastCommittedContentRef.current) {
        lastCommittedContentRef.current = serialized;
        onCommitContent(serialized);
      }
      return serialized;
    },
    [onCommitContent],
  );

  const applyDocumentState = useCallback(
    (nextDocument: NotebookDocumentModel, options: ApplyDocumentOptions = {}) => {
      const { markDirty = false, syncToStore = false, parseError: nextParseError = null } = options;
      documentRef.current = nextDocument;
      setDocument(nextDocument);
      setParseError(nextParseError);
      if (syncToStore) {
        syncDocumentToStore(nextDocument);
      }
      if (markDirty && !dirtyNotifiedRef.current) {
        dirtyNotifiedRef.current = true;
        onMarkDirty();
      }
    },
    [onMarkDirty, syncDocumentToStore],
  );

  const updateDocument = useCallback(
    (
      updater: (currentDocument: NotebookDocumentModel) => NotebookDocumentModel,
      options: ApplyDocumentOptions,
    ) => {
      const nextDocument = updater(documentRef.current);
      applyDocumentState(nextDocument, options);
      return nextDocument;
    },
    [applyDocumentState],
  );

  const commitDocumentUpdate = useCallback(
    (updater: (current: NotebookDocumentModel) => NotebookDocumentModel, options: CommitOptions = {}) =>
      updateDocument(updater, {
        markDirty: options.markDirty ?? true,
        syncToStore: true,
        parseError: null,
      }),
    [updateDocument],
  );
  const applyLocalDocumentUpdate = useCallback(
    (updater: (current: NotebookDocumentModel) => NotebookDocumentModel, options: CommitOptions = {}) =>
      updateDocument(updater, {
        markDirty: options.markDirty ?? true,
        syncToStore: false,
        parseError: null,
      }),
    [updateDocument],
  );
  const commitCurrentDocument = useCallback(
    () => syncDocumentToStore(documentRef.current),
    [syncDocumentToStore],
  );
  const markDocumentClean = useCallback(() => {
    dirtyNotifiedRef.current = false;
  }, []);

  return {
    applyDocumentState,
    applyLocalDocumentUpdate,
    commitCurrentDocument,
    commitDocumentUpdate,
    document,
    documentRef,
    focusCell,
    focusSequence,
    focusTargetCellId,
    markDocumentClean,
    parseError,
    selectCell,
    selectedCellId,
    setFocusTargetCellId,
    setSelectedCellId,
    setStatusMessage,
    statusMessage,
  };
}
