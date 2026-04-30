export type NotebookRecord = Record<string, unknown>;
export type NotebookCellRecord = Record<string, unknown>;
export type NotebookCellMode = "edit" | "preview";
export type EditableNotebookCellType = "code" | "markdown";
export type NotebookCellType = EditableNotebookCellType | string;
export type NotebookStreamOutput = {
  output_type: "stream";
  name: "stdout" | "stderr";
  text: string;
};

export type NotebookErrorOutput = {
  output_type: "error";
  ename: string;
  evalue: string;
  traceback: string[];
};

export type NotebookRichOutput = {
  output_type: "display_data" | "execute_result";
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  execution_count?: number | null;
};

export type NotebookOutput = NotebookStreamOutput | NotebookErrorOutput | NotebookRichOutput;

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
};

export type NotebookDocumentModel = {
  raw: NotebookRecord;
  cells: NotebookCellModel[];
};

export type ParsedNotebookDocument = {
  document: NotebookDocumentModel;
  parseError: string | null;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneRecord(value: unknown): NotebookRecord {
  return isRecord(value) ? { ...value } : {};
}
