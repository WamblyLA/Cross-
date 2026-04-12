import type { NotebookCell, NotebookDocument, NotebookOutput } from "../../types/notebook";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSource(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((part) => `${part ?? ""}`).join("");
  }

  return typeof value === "string" ? value : "";
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

function coerceMimeText(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((part) => `${part ?? ""}`).join("");
  }

  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return `${value}`;
}

function pickPreferredMimeType(data: Record<string, unknown>) {
  const priority = ["text/markdown", "application/json", "text/plain"];

  for (const mimeType of priority) {
    if (data[mimeType] != null) {
      return mimeType;
    }
  }

  return Object.keys(data).find((key) => data[key] != null) ?? null;
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
    };
  }

  return null;
}

function parseCell(cell: unknown, index: number): NotebookCell {
  const record = isRecord(cell) ? cell : {};
  const id = typeof record.id === "string" && record.id.trim() ? record.id : `cell-${index + 1}`;
  const cellType = typeof record.cell_type === "string" ? record.cell_type : "unknown";
  const source = normalizeSource(record.source);

  if (cellType === "markdown") {
    return {
      id,
      cellType: "markdown",
      source,
    };
  }

  if (cellType === "code") {
    const rawOutputs = Array.isArray(record.outputs) ? record.outputs : [];
    const outputs = rawOutputs
      .map((output) => normalizeOutput(output))
      .filter((output): output is NotebookOutput => output !== null);

    return {
      id,
      cellType: "code",
      source,
      executionCount:
        typeof record.execution_count === "number" || record.execution_count === null
          ? (record.execution_count as number | null)
          : null,
      outputs,
      hasUnsupportedOutputs: rawOutputs.length > outputs.length,
    };
  }

  return {
    id,
    cellType,
    source,
  };
}

export function parseNotebookContent(content: string): NotebookDocument {
  try {
    const parsed = JSON.parse(content || "{}");

    if (!isRecord(parsed) || !Array.isArray(parsed.cells)) {
      return {
        cells: [],
        parseError: "Файл не похож на notebook.",
        isRecognizedNotebook: false,
      };
    }

    return {
      cells: parsed.cells.map((cell, index) => parseCell(cell, index)),
      parseError: null,
      isRecognizedNotebook: true,
    };
  } catch {
    return {
      cells: [],
      parseError: "Не удалось разобрать JSON notebook.",
      isRecognizedNotebook: false,
    };
  }
}
