import {
  createEmptyNotebookDocument as createEmptyDocumentState,
  createNotebookCellModel,
} from "./notebookPersistence";
import { sanitizeNotebookTextOutput } from "./notebookTextOutput";
import type {
  EditableNotebookCellType,
  NotebookCellMode,
  NotebookOutput,
  NotebookDocumentModel,
  NotebookRecord,
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

function cloneMetadata(metadata: unknown): NotebookRecord {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? { ...(metadata as NotebookRecord) }
    : {};
}

function cloneOutput(output: NotebookOutput): NotebookOutput {
  if (output.output_type === "stream") {
    return {
      output_type: "stream",
      name: output.name,
      text: sanitizeNotebookTextOutput(output.text),
    };
  }

  if (output.output_type === "error") {
    return {
      output_type: "error",
      ename: sanitizeNotebookTextOutput(output.ename),
      evalue: sanitizeNotebookTextOutput(output.evalue),
      traceback: output.traceback.map((line) => sanitizeNotebookTextOutput(line)),
    };
  }

  return {
    output_type: output.output_type,
    data: { ...output.data },
    metadata: { ...output.metadata },
    execution_count: output.execution_count ?? null,
  };
}

function cloneOutputs(outputs: NotebookOutput[]) {
  return outputs.map(cloneOutput);
}

function updateCodeCell(
  document: NotebookDocumentModel,
  localId: string,
  updater: (cell: NotebookDocumentModel["cells"][number]) => NotebookDocumentModel["cells"][number],
) {
  return {
    ...document,
    cells: document.cells.map((cell) => {
      if (cell.localId !== localId || cell.cellType !== "code") {
        return cell;
      }

      return updater(cell);
    }),
  };
}

export function replaceNotebookCellOutputs(
  document: NotebookDocumentModel,
  localId: string,
  outputs: NotebookOutput[],
  executionCount: number | null,
) {
  return updateCodeCell(document, localId, (cell) => {
    const nextOutputs = cloneOutputs(outputs);

    return {
      ...cell,
      outputs: nextOutputs,
      hasUnsupportedOutputs: false,
      executionCount,
      raw: {
        ...cell.raw,
        metadata: cloneMetadata(cell.raw.metadata),
        outputs: cloneOutputs(nextOutputs),
        execution_count: executionCount,
      },
    };
  });
}

export function clearNotebookCellExecution(
  document: NotebookDocumentModel,
  localId: string,
) {
  return replaceNotebookCellOutputs(document, localId, [], null);
}

export function appendNotebookCellOutput(
  document: NotebookDocumentModel,
  localId: string,
  output: NotebookOutput,
) {
  return updateCodeCell(document, localId, (cell) => {
    const nextOutput = cloneOutput(output);
    const existingOutputs = cloneOutputs(cell.outputs);
    const previousOutput = existingOutputs.at(-1);

    if (
      previousOutput?.output_type === "stream" &&
      nextOutput.output_type === "stream" &&
      previousOutput.name === nextOutput.name
    ) {
      previousOutput.text += nextOutput.text;
    } else {
      existingOutputs.push(nextOutput);
    }

    return {
      ...cell,
      outputs: existingOutputs,
      hasUnsupportedOutputs: false,
      raw: {
        ...cell.raw,
        metadata: cloneMetadata(cell.raw.metadata),
        outputs: cloneOutputs(existingOutputs),
        execution_count: cell.executionCount,
      },
    };
  });
}

export function patchNotebookCellOutput(
  document: NotebookDocumentModel,
  localId: string,
  outputIndex: number,
  output: NotebookOutput,
) {
  return updateCodeCell(document, localId, (cell) => {
    if (outputIndex < 0 || outputIndex >= cell.outputs.length) {
      return cell;
    }

    const nextOutputs = cloneOutputs(cell.outputs);
    nextOutputs[outputIndex] = cloneOutput(output);

    return {
      ...cell,
      outputs: nextOutputs,
      hasUnsupportedOutputs: false,
      raw: {
        ...cell.raw,
        metadata: cloneMetadata(cell.raw.metadata),
        outputs: cloneOutputs(nextOutputs),
        execution_count: cell.executionCount,
      },
    };
  });
}

export function setNotebookMetadataKernelspec(
  document: NotebookDocumentModel,
  kernelspec: {
    name: string;
    display_name: string;
    language?: string | null;
  },
) {
  const currentMetadata = cloneMetadata(document.raw.metadata);
  const currentKernelspec =
    currentMetadata.kernelspec && typeof currentMetadata.kernelspec === "object"
      ? (currentMetadata.kernelspec as NotebookRecord)
      : {};
  const currentLanguageInfo =
    currentMetadata.language_info && typeof currentMetadata.language_info === "object"
      ? (currentMetadata.language_info as NotebookRecord)
      : {};
  const nextLanguage =
    kernelspec.language && kernelspec.language.trim() ? kernelspec.language.trim() : null;

  const isSameKernelspec =
    currentKernelspec.name === kernelspec.name &&
    currentKernelspec.display_name === kernelspec.display_name &&
    (!nextLanguage || currentKernelspec.language === nextLanguage);
  const hasLanguageInfo = !nextLanguage || currentLanguageInfo.name === nextLanguage;

  if (isSameKernelspec && hasLanguageInfo) {
    return document;
  }

  const nextMetadata = currentMetadata;
  nextMetadata.kernelspec = {
    ...currentKernelspec,
    name: kernelspec.name,
    display_name: kernelspec.display_name,
    ...(nextLanguage ? { language: nextLanguage } : {}),
  };

  if (nextLanguage) {
    nextMetadata.language_info = {
      ...currentLanguageInfo,
      name: nextLanguage,
    };
  }

  return {
    ...document,
    raw: {
      ...document.raw,
      metadata: nextMetadata,
    },
  };
}
