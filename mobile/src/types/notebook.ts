export type NotebookMimeBundle = Record<string, unknown>;

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
    };

export type NotebookCell =
  | {
      id: string;
      cellType: "markdown";
      source: string;
    }
  | {
      id: string;
      cellType: "code";
      source: string;
      executionCount: number | null;
      outputs: NotebookOutput[];
      hasUnsupportedOutputs: boolean;
    }
  | {
      id: string;
      cellType: string;
      source: string;
    };

export type NotebookDocument = {
  cells: NotebookCell[];
  parseError: string | null;
  isRecognizedNotebook: boolean;
};
