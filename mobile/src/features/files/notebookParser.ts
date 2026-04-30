import type {
  EditableNotebookCellType,
  NotebookCellModel,
  NotebookCellRecord,
  NotebookDocumentModel,
  NotebookOutput,
  NotebookRecord,
  ParsedNotebookDocument,
} from "../../types/notebook";
import { cloneRecord, isRecord } from "../../types/notebook";
import { coerceMimeText, pickPreferredMimeType } from "./notebookMime";

const DEFAULT_NBFORMAT = 4;
const DEFAULT_NBFORMAT_MINOR = 5;

export function createCellId() {
  return `cell-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSource(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((part) => `${part ?? ""}`).join("");
  }

  return typeof value === "string" ? value : "";
}

export function toNotebookSource(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");

  if (!normalized) {
    return [];
  }

  const parts = normalized.split("\n");
  return parts.map((line, index) => (index < parts.length - 1 ? `${line}\n` : line));
}

function sanitizeText(value: string) {
  return value
    .replace(
      // eslint-disable-next-line no-control-regex
      /\u001b(?:\][^\u0007]*(?:\u0007|\u001b\\)|[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
      "",
    )
    .replace(/\r\n/g, "\n");
}

function normalizeOutput(output: unknown): NotebookOutput | null {
  if (!isRecord(output) || typeof output.output_type !== "string") {
    return null;
  }

  if (output.output_type === "stream") {
    return {
      outputType: "stream",
      name: output.name === "stderr" ? "stderr" : "stdout",
      text: sanitizeText(normalizeSource(output.text)),
    };
  }

  if (output.output_type === "error") {
    return {
      outputType: "error",
      ename: sanitizeText(String(output.ename ?? "Error")),
      evalue: sanitizeText(String(output.evalue ?? "")),
      traceback: Array.isArray(output.traceback)
        ? output.traceback.map((line) => sanitizeText(String(line ?? "")))
        : [],
    };
  }

  if (
    (output.output_type === "display_data" || output.output_type === "execute_result") &&
    isRecord(output.data)
  ) {
    const mimeType = pickPreferredMimeType(output.data);

    return {
      outputType: "rich",
      mimeType,
      text: sanitizeText(mimeType ? coerceMimeText(output.data[mimeType]) : "Неподдерживаемый вывод"),
      data: output.data,
      metadata: cloneRecord(output.metadata),
      executionCount:
        output.output_type === "execute_result" &&
        (typeof output.execution_count === "number" || output.execution_count === null)
          ? (output.execution_count as number | null)
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

function parseNotebookCell(rawCell: unknown, index: number): NotebookCellModel {
  const cell = cloneRecord(rawCell);
  const cellType =
    typeof cell.cell_type === "string" && cell.cell_type.trim() ? cell.cell_type.trim() : "code";
  const localId = typeof cell.id === "string" && cell.id.trim() ? cell.id : createCellId();
  const outputs = cellType === "code" ? normalizeOutputs(cell.outputs) : [];
  const rawOutputs = Array.isArray(cell.outputs) ? cell.outputs : [];
  const isEditable = cellType === "code" || cellType === "markdown";

  return {
    localId,
    cellType,
    source: normalizeSource(cell.source),
    raw: {
      ...cell,
      id: typeof cell.id === "string" && cell.id.trim() ? cell.id : localId,
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
    isEditable,
    hasOutdatedOutputs: false,
  };
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
    mode: cellType === "markdown" ? "preview" : "edit",
    isEditable: true,
    hasOutdatedOutputs: false,
  };
}

export function parseNotebookContent(content: string): ParsedNotebookDocument {
  try {
    const parsed = JSON.parse(content || "{}");
    const raw = cloneRecord(parsed);

    if (!isRecord(parsed) || !Array.isArray(raw.cells)) {
      return {
        document: createEmptyNotebookDocument(),
        parseError: "Файл не похож на notebook.",
        isRecognizedNotebook: false,
      };
    }

    return {
      document: {
        raw: {
          ...raw,
          metadata: cloneRecord(raw.metadata),
        },
        cells: raw.cells.map((cell, index) => parseNotebookCell(cell, index)),
      },
      parseError: null,
      isRecognizedNotebook: true,
    };
  } catch {
    return {
      document: createEmptyNotebookDocument(),
      parseError: "Не удалось разобрать JSON notebook.",
      isRecognizedNotebook: false,
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
