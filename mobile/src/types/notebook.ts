export type NotebookRecord = Record<string, unknown>;
export type NotebookCellRecord = Record<string, unknown>;
export type NotebookMimeBundle = Record<string, unknown>;
export type NotebookCellMode = "edit" | "preview";
export type EditableNotebookCellType = "code" | "markdown";
export type NotebookCellType = EditableNotebookCellType | string;

export type NotebookOutput =
  | {
      outputType: "stream";
      name: "stdout" | "stderr";
      text: string;
    }
  | {
      outputType: "error";
      ename: string;
      evalue: string;
      traceback: string[];
    }
  | {
      outputType: "rich";
      mimeType: string | null;
      text: string;
      data: NotebookMimeBundle;
      metadata: NotebookRecord;
      executionCount: number | null;
    };

export type NotebookCellModel = {
  localId: string;
  cellType: NotebookCellType;
  source: string;
  raw: NotebookCellRecord;
  outputs: NotebookOutput[];
  hasUnsupportedOutputs: boolean;
  executionCount: number | null;
  mode: NotebookCellMode;
  isEditable: boolean;
  hasOutdatedOutputs: boolean;
};

export type NotebookDocumentModel = {
  raw: NotebookRecord;
  cells: NotebookCellModel[];
};

export type ParsedNotebookDocument = {
  document: NotebookDocumentModel;
  parseError: string | null;
  isRecognizedNotebook: boolean;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneRecord(value: unknown): NotebookRecord {
  return isRecord(value) ? { ...value } : {};
}
