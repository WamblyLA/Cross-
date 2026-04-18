import type {
  EditableNotebookCellType,
  NotebookCellMode,
  NotebookCellModel,
  NotebookDocumentModel,
  NotebookOutput,
  NotebookRecord,
} from "../../types/notebook";
import { cloneRecord } from "../../types/notebook";
import { createNotebookCellModel } from "./notebookParser";

function cloneMetadata(metadata: unknown): NotebookRecord {
  return cloneRecord(metadata);
}

function cloneOutput(output: NotebookOutput): NotebookOutput {
  if (output.outputType === "stream") {
    return {
      outputType: "stream",
      name: output.name,
      text: output.text,
    };
  }

  if (output.outputType === "error") {
    return {
      outputType: "error",
      ename: output.ename,
      evalue: output.evalue,
      traceback: [...output.traceback],
    };
  }

  return {
    outputType: "rich",
    mimeType: output.mimeType,
    text: output.text,
    data: { ...output.data },
    metadata: { ...output.metadata },
    executionCount: output.executionCount,
  };
}

function cloneOutputs(outputs: NotebookOutput[]) {
  return outputs.map(cloneOutput);
}

function updateCell(
  document: NotebookDocumentModel,
  localId: string,
  updater: (cell: NotebookCellModel) => NotebookCellModel,
) {
  return {
    ...document,
    cells: document.cells.map((cell) => (cell.localId === localId ? updater(cell) : cell)),
  };
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
  return updateCell(document, localId, (cell) => {
    if (cell.source === source) {
      return cell;
    }

    const hasOutdatedOutputs =
      cell.cellType === "code" &&
      (cell.outputs.length > 0 || cell.hasUnsupportedOutputs || cell.hasOutdatedOutputs);

    return {
      ...cell,
      source,
      hasOutdatedOutputs,
    };
  });
}

export function setNotebookCellMode(
  document: NotebookDocumentModel,
  localId: string,
  mode: NotebookCellMode,
) {
  return updateCell(document, localId, (cell) => ({
    ...cell,
    mode,
  }));
}

export function switchNotebookCellType(
  document: NotebookDocumentModel,
  localId: string,
  cellType: EditableNotebookCellType,
) {
  return updateCell(document, localId, (cell) => {
    if (cell.cellType === cellType) {
      return cell;
    }

    const nextMode: NotebookCellMode = cellType === "markdown" ? "preview" : "edit";
    const nextRaw = {
      ...cell.raw,
      cell_type: cellType,
      metadata: cloneMetadata(cell.raw.metadata),
    };

    return {
      ...cell,
      cellType,
      raw: nextRaw,
      outputs: cellType === "code" ? cloneOutputs(cell.outputs) : [],
      hasUnsupportedOutputs: cellType === "code" ? cell.hasUnsupportedOutputs : false,
      executionCount: cellType === "code" ? cell.executionCount : null,
      mode: nextMode,
      isEditable: true,
      hasOutdatedOutputs:
        cellType === "code" ? cell.hasOutdatedOutputs && cell.outputs.length > 0 : false,
    };
  });
}

export function hasNotebookOutdatedOutputs(document: NotebookDocumentModel) {
  return document.cells.some((cell) => cell.hasOutdatedOutputs);
}
