export type NotebookCellRecord = Record<string, unknown>;
export type NotebookRecord = Record<string, unknown>;
export type NotebookCellType = "code" | "markdown";
export type NotebookCellMode = "edit" | "preview";

export type NotebookCell = {
  localId: string;
  cellType: NotebookCellType;
  source: string;
  outputs: NotebookOutput[];
  executionCount: number | null;
  data: NotebookCellRecord;
  mode: NotebookCellMode;
  isRunning: boolean;
};

export type ParsedNotebook = {
  doc: NotebookRecord;
  cells: NotebookCell[];
  parseError: string | null;
};

export function createCellId() {
  return `cell-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

export function normalizeOutput(output: unknown): NotebookOutput | null {
  if (!isRecord(output) || typeof output.output_type !== "string") {
    return null;
  }

  if (output.output_type === "stream") {
    return {
      output_type: "stream",
      name: output.name === "stderr" ? "stderr" : "stdout",
      text: normalizeSource(output.text),
    };
  }

  if (output.output_type === "error") {
    return {
      output_type: "error",
      ename: `${output.ename ?? "Error"}`,
      evalue: `${output.evalue ?? ""}`,
      traceback: Array.isArray(output.traceback)
        ? output.traceback.map((line) => `${line ?? ""}`)
        : [],
    };
  }

  if (output.output_type === "display_data" || output.output_type === "execute_result") {
    return {
      output_type: output.output_type,
      data: isRecord(output.data) ? output.data : {},
      metadata: isRecord(output.metadata) ? output.metadata : {},
      execution_count:
        output.output_type === "execute_result" && typeof output.execution_count === "number"
          ? output.execution_count
          : null,
    };
  }

  return null;
}

export function normalizeOutputs(outputs: unknown) {
  if (!Array.isArray(outputs)) {
    return [];
  }

  return outputs.map(normalizeOutput).filter((output): output is NotebookOutput => Boolean(output));
}

export function appendOutput(outputs: NotebookOutput[], nextOutput: NotebookOutput) {
  const previousOutput = outputs.at(-1);

  if (
    previousOutput?.output_type === "stream" &&
    nextOutput.output_type === "stream" &&
    previousOutput.name === nextOutput.name
  ) {
    return [
      ...outputs.slice(0, -1),
      {
        ...previousOutput,
        text: previousOutput.text + nextOutput.text,
      },
    ];
  }

  return [...outputs, nextOutput];
}

export function parseNotebookContent(content: string): ParsedNotebook {
  try {
    const parsed = JSON.parse(content || "{}");
    const doc = isRecord(parsed) ? ({ ...parsed } as NotebookRecord) : {};
    const rawCells = Array.isArray(doc.cells) ? doc.cells : [];
    const cells = rawCells.map((rawCell) => {
      const cellData = isRecord(rawCell) ? ({ ...rawCell } as NotebookCellRecord) : {};
      const localId = typeof cellData.id === "string" ? cellData.id : createCellId();
      const cellType: NotebookCellType = cellData.cell_type === "markdown" ? "markdown" : "code";

      return {
        localId,
        cellType,
        source: normalizeSource(cellData.source),
        outputs: cellType === "code" ? normalizeOutputs(cellData.outputs) : [],
        executionCount:
          typeof cellData.execution_count === "number" || cellData.execution_count === null
            ? (cellData.execution_count as number | null)
            : null,
        data: {
          ...cellData,
          id: localId,
          cell_type: cellType,
          metadata: isRecord(cellData.metadata) ? { ...cellData.metadata } : {},
        },
        mode: cellType === "markdown" ? "preview" : "edit",
        isRunning: false,
      } satisfies NotebookCell;
    });

    return {
      doc: {
        ...doc,
        metadata: isRecord(doc.metadata) ? { ...doc.metadata } : {},
      },
      cells,
      parseError: null,
    };
  } catch (error) {
    return {
      doc: {
        cells: [],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      },
      cells: [],
      parseError: error instanceof Error ? error.message : "Некорректный JSON notebook-файла.",
    };
  }
}

export function serializeNotebook(doc: NotebookRecord, cells: NotebookCell[]) {
  const nextDoc: NotebookRecord = {
    ...doc,
    nbformat: typeof doc.nbformat === "number" ? doc.nbformat : 4,
    nbformat_minor: typeof doc.nbformat_minor === "number" ? doc.nbformat_minor : 5,
    metadata: isRecord(doc.metadata) ? doc.metadata : {},
    cells: cells.map((cell) => {
      const nextCell: NotebookCellRecord = {
        ...cell.data,
        id: cell.localId,
        cell_type: cell.cellType,
        metadata: isRecord(cell.data.metadata) ? cell.data.metadata : {},
        source: toNotebookSource(cell.source),
      };

      if (cell.cellType === "code") {
        nextCell.outputs = cell.outputs;
        nextCell.execution_count = cell.executionCount ?? null;
      } else {
        delete nextCell.outputs;
        delete nextCell.execution_count;
      }

      return nextCell;
    }),
  };

  return `${JSON.stringify(nextDoc, null, 2)}\n`;
}

export function createNewCell(cellType: NotebookCellType): NotebookCell {
  const localId = createCellId();

  return {
    localId,
    cellType,
    source: "",
    outputs: [],
    executionCount: null,
    data:
      cellType === "code"
        ? {
            id: localId,
            cell_type: "code",
            metadata: {},
            execution_count: null,
            outputs: [],
          }
        : {
            id: localId,
            cell_type: "markdown",
            metadata: {},
          },
    mode: "edit",
    isRunning: false,
  };
}

export function extractMetadata(doc: NotebookRecord) {
  return isRecord(doc.metadata) ? doc.metadata : {};
}

export function buildDocWithKernel(doc: NotebookRecord, kernel: NotebookKernelDescriptor | null) {
  const metadata = extractMetadata(doc);
  const nextMetadata: NotebookCellRecord = { ...metadata };
  const nextCrosspp = isRecord(metadata.crosspp) ? { ...metadata.crosspp } : {};

  if (!kernel) {
    delete nextMetadata.kernelspec;
    delete nextCrosspp.interpreterPath;

    if (Object.keys(nextCrosspp).length > 0) {
      nextMetadata.crosspp = nextCrosspp;
    } else {
      delete nextMetadata.crosspp;
    }

    return { ...doc, metadata: nextMetadata };
  }

  nextMetadata.kernelspec = {
    ...(isRecord(metadata.kernelspec) ? metadata.kernelspec : {}),
    display_name: kernel.displayName,
    language: "python",
    name: kernel.envName || "python3",
  };
  nextMetadata.language_info = {
    ...(isRecord(metadata.language_info) ? metadata.language_info : {}),
    name: "python",
    ...(kernel.version ? { version: kernel.version } : {}),
  };
  nextMetadata.crosspp = {
    ...nextCrosspp,
    interpreterPath: kernel.interpreterPath,
  };

  return { ...doc, metadata: nextMetadata };
}

export function resolveKernelFromMetadata(
  doc: NotebookRecord,
  kernels: NotebookKernelDescriptor[],
) {
  const metadata = extractMetadata(doc);
  const crosspp = isRecord(metadata.crosspp) ? metadata.crosspp : {};

  if (typeof crosspp.interpreterPath === "string") {
    const exactMatch = kernels.find((kernel) => kernel.interpreterPath === crosspp.interpreterPath);
    if (exactMatch) {
      return exactMatch.interpreterPath;
    }
  }

  const kernelspec = isRecord(metadata.kernelspec) ? metadata.kernelspec : {};

  if (typeof kernelspec.display_name === "string") {
    const displayMatch = kernels.find((kernel) => kernel.displayName === kernelspec.display_name);
    if (displayMatch) {
      return displayMatch.interpreterPath;
    }
  }

  return (
    kernels.find((kernel) => kernel.isRecommended)?.interpreterPath ??
    kernels[0]?.interpreterPath ??
    null
  );
}

export function getFocusTarget(cell: NotebookCell): "editor" | "preview" {
  return cell.cellType === "markdown" && cell.mode === "preview" ? "preview" : "editor";
}
