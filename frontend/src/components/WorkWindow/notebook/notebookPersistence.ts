import {
  cloneRecord,
  isRecord,
  type EditableNotebookCellType,
  type NotebookCellModel,
  type NotebookCellRecord,
  type NotebookDocumentModel,
  type NotebookOutput,
  type NotebookRecord,
  type ParsedNotebookDocument,
} from "./types";
import { sanitizeNotebookTextOutput } from "./notebookTextOutput";

const DEFAULT_NBFORMAT = 4;
const DEFAULT_NBFORMAT_MINOR = 5;

export function createCellId() {
  return `cell-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSource(source: unknown) {
  if (Array.isArray(source)) {
    return source.map((part) => `${part ?? ""}`).join("");
  }

  return typeof source === "string" ? source : "";
}

export function toNotebookSource(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");

  if (!normalized) {
    return [];
  }

  const parts = normalized.split("\n");
  return parts.map((line, index) => (index < parts.length - 1 ? `${line}\n` : line));
}

function normalizeOutput(output: unknown): NotebookOutput | null {
  if (!isRecord(output) || typeof output.output_type !== "string") {
    return null;
  }

  if (output.output_type === "stream") {
    return {
      output_type: "stream",
      name: output.name === "stderr" ? "stderr" : "stdout",
      text: sanitizeNotebookTextOutput(normalizeSource(output.text)),
    };
  }

  if (output.output_type === "error") {
    return {
      output_type: "error",
      ename: sanitizeNotebookTextOutput(String(output.ename ?? "Error")),
      evalue: sanitizeNotebookTextOutput(String(output.evalue ?? "")),
      traceback: Array.isArray(output.traceback)
        ? output.traceback.map((line) => sanitizeNotebookTextOutput(String(line ?? "")))
        : [],
    };
  }

  if (output.output_type === "display_data" || output.output_type === "execute_result") {
    return {
      output_type: output.output_type,
      data: cloneRecord(output.data),
      metadata: cloneRecord(output.metadata),
      execution_count:
        output.output_type === "execute_result" && typeof output.execution_count === "number"
          ? output.execution_count
          : null,
    };
  }

  return null;
}

function normalizeOutputs(outputs: unknown) {
  if (!Array.isArray(outputs)) {
    return [];
  }

  return outputs.map(normalizeOutput).filter((output): output is NotebookOutput => Boolean(output));
}

export function createEmptyNotebookDocument(): NotebookDocumentModel {
  return {
    raw: {
      cells: [],
      metadata: {},
      nbformat: DEFAULT_NBFORMAT,
      nbformat_minor: DEFAULT_NBFORMAT_MINOR,
    },
    cells: [],
  };
}

export function createNotebookCellModel(cellType: EditableNotebookCellType): NotebookCellModel {
  const localId = createCellId();
  const raw: NotebookCellRecord =
    cellType === "code"
      ? {
          id: localId,
          cell_type: "code",
          metadata: {},
          execution_count: null,
          outputs: [],
          source: [],
        }
      : {
          id: localId,
          cell_type: "markdown",
          metadata: {},
          source: [],
        };

  return {
    localId,
    cellType,
    source: "",
    raw,
    outputs: [],
    hasUnsupportedOutputs: false,
    executionCount: null,
    mode: "edit",
    isEditable: true,
  };
}

function parseNotebookCell(rawCell: unknown): NotebookCellModel {
  const cell = cloneRecord(rawCell);
  const cellType =
    typeof cell.cell_type === "string" && cell.cell_type.trim() ? cell.cell_type.trim() : "code";
  const localId = typeof cell.id === "string" && cell.id.trim() ? cell.id : createCellId();
  const outputs = cellType === "code" ? normalizeOutputs(cell.outputs) : [];
  const rawOutputs = Array.isArray(cell.outputs) ? cell.outputs : [];

  return {
    localId,
    cellType,
    source: normalizeSource(cell.source),
    raw: {
      ...cell,
      id: typeof cell.id === "string" ? cell.id : localId,
      cell_type: cellType,
      metadata: cloneRecord(cell.metadata),
    },
    outputs,
    hasUnsupportedOutputs: rawOutputs.length > outputs.length,
    executionCount:
      typeof cell.execution_count === "number" || cell.execution_count === null
        ? (cell.execution_count as number | null)
        : null,
    mode: cellType === "markdown" ? "preview" : "edit",
    isEditable: cellType === "code" || cellType === "markdown",
  };
}

export function parseNotebookContent(content: string): ParsedNotebookDocument {
  try {
    const parsed = JSON.parse(content || "{}");
    const raw = cloneRecord(parsed);
    const rawCells = Array.isArray(raw.cells) ? raw.cells : [];

    return {
      document: {
        raw: {
          ...raw,
          metadata: cloneRecord(raw.metadata),
        },
        cells: rawCells.map(parseNotebookCell),
      },
      parseError: null,
    };
  } catch (error) {
    return {
      document: createEmptyNotebookDocument(),
      parseError:
        error instanceof Error
          ? error.message
          : "Ошибка JSON ноутбука",
    };
  }
}

function serializeCell(cell: NotebookCellModel): NotebookCellRecord {
  const nextCell: NotebookCellRecord = {
    ...cell.raw,
    cell_type: cell.cellType,
    metadata: cloneRecord(cell.raw.metadata),
    source: toNotebookSource(cell.source),
  };

  if (typeof cell.raw.id === "string" && cell.raw.id.trim()) {
    nextCell.id = cell.raw.id;
  } else if (cell.isEditable) {
    nextCell.id = cell.localId;
  }

  if (cell.cellType === "code") {
    nextCell.outputs = Array.isArray(cell.raw.outputs) ? cell.raw.outputs : [];
    nextCell.execution_count =
      typeof cell.raw.execution_count === "number" || cell.raw.execution_count === null
        ? cell.raw.execution_count
        : cell.executionCount ?? null;
    return nextCell;
  }

  if (cell.cellType === "markdown") {
    delete nextCell.outputs;
    delete nextCell.execution_count;
  }

  return nextCell;
}

export function serializeNotebookDocument(document: NotebookDocumentModel) {
  const nextDocument: NotebookRecord = {
    ...document.raw,
    nbformat:
      typeof document.raw.nbformat === "number" ? document.raw.nbformat : DEFAULT_NBFORMAT,
    nbformat_minor:
      typeof document.raw.nbformat_minor === "number"
        ? document.raw.nbformat_minor
        : DEFAULT_NBFORMAT_MINOR,
    metadata: cloneRecord(document.raw.metadata),
    cells: document.cells.map(serializeCell),
  };

  return `${JSON.stringify(nextDocument, null, 2)}\n`;
}
