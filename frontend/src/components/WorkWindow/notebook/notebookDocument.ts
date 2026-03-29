import {
  createEmptyNotebookDocument as createEmptyDocumentState,
  createNotebookCellModel,
} from "./notebookPersistence";
import type {
  EditableNotebookCellType,
  NotebookCellMode,
  NotebookDocumentModel,
} from "./types";

export function createEmptyNotebookDocument() {
  return createEmptyDocumentState();
}

export function createNotebookDocumentWithStarterCell(
  cellType: EditableNotebookCellType = "code",
) {
  return addNotebookCell(createEmptyDocumentState(), cellType);
}

export function addNotebookCell(
  document: NotebookDocumentModel,
  cellType: EditableNotebookCellType,
  afterIndex?: number,
) {
  const nextCell = createNotebookCellModel(cellType);
  const insertIndex =
    afterIndex == null || afterIndex < 0 || afterIndex >= document.cells.length
      ? document.cells.length
      : afterIndex + 1;

  return {
    ...document,
    cells: [
      ...document.cells.slice(0, insertIndex),
      nextCell,
      ...document.cells.slice(insertIndex),
    ],
  };
}

export function deleteNotebookCell(document: NotebookDocumentModel, localId: string) {
  return {
    ...document,
    cells: document.cells.filter((cell) => cell.localId !== localId),
  };
}

export function moveNotebookCell(
  document: NotebookDocumentModel,
  localId: string,
  direction: -1 | 1,
) {
  const currentIndex = document.cells.findIndex((cell) => cell.localId === localId);

  if (currentIndex === -1) {
    return document;
  }

  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= document.cells.length) {
    return document;
  }

  const nextCells = [...document.cells];
  const [cell] = nextCells.splice(currentIndex, 1);
  nextCells.splice(targetIndex, 0, cell);

  return {
    ...document,
    cells: nextCells,
  };
}

export function updateNotebookCellSource(
  document: NotebookDocumentModel,
  localId: string,
  source: string,
) {
  return {
    ...document,
    cells: document.cells.map((cell) =>
      cell.localId === localId
        ? {
            ...cell,
            source,
          }
        : cell,
    ),
  };
}

export function setNotebookCellMode(
  document: NotebookDocumentModel,
  localId: string,
  mode: NotebookCellMode,
) {
  return {
    ...document,
    cells: document.cells.map((cell) =>
      cell.localId === localId
        ? {
            ...cell,
            mode,
          }
        : cell,
    ),
  };
}
