import { File } from "expo-file-system";
import { parseNotebookContent } from "../files/notebookParser";
import { LocalFileLoadError } from "./localFileErrors";
import { getSupportedLocalFileKind, resolveLocalFileName } from "./localFileRouting";
import type { LoadedLocalFile, LocalFileReadSource } from "./localFileTypes";

export async function loadLocalFile(source: LocalFileReadSource): Promise<LoadedLocalFile> {
  const fileName = resolveLocalFileName(source.fileName, source.originalUri ?? source.workingUri, source.mimeType);
  const kind = getSupportedLocalFileKind(fileName);

  if (!kind) {
    throw new LocalFileLoadError(
      "unsupported-extension",
      "Этот тип файла пока не поддерживается. Откройте .md, .ipynb, .py, .cpp, .txt, .json или .csv.",
    );
  }

  let content: string;

  try {
    content = await new File(source.workingUri).text();
  } catch {
    throw new LocalFileLoadError(
      "unreadable-file",
      "Не удалось прочитать выбранный файл. Попробуйте открыть его снова.",
    );
  }

  if (!content.trim()) {
    throw new LocalFileLoadError(
      "empty-file",
      "Выбранный файл пуст. Откройте файл, в котором есть содержимое.",
    );
  }

  if (kind === "notebook") {
    const notebook = parseNotebookContent(content);

    if (!notebook.isRecognizedNotebook) {
      throw new LocalFileLoadError(
        "invalid-notebook",
        notebook.parseError ?? "Не удалось открыть notebook.",
      );
    }
  }

  const saveStrategy =
    source.originalUri && source.canDirectWrite ? "direct-source" : "save-as-required";

  return {
    fileName,
    originalUri: source.originalUri,
    workingUri: source.workingUri,
    mimeType: source.mimeType,
    size: source.size,
    content,
    kind,
    source: "local",
    sourceKind: source.sourceKind,
    saveStrategy,
    editable: true,
    canDirectWrite: source.canDirectWrite,
    hasPersistedReadPermission: source.hasPersistedReadPermission,
    hasPersistedWritePermission: source.hasPersistedWritePermission,
  };
}
