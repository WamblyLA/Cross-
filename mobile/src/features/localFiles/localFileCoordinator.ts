import { isLocalFileLoadError } from "./localFileErrors";
import { loadLocalFile } from "./localFileLoader";
import { pickSingleLocalDocument } from "./localFilePicker";
import { addLocalOpenedFile } from "./localFileSession";
import type { IncomingLocalFileIntent, LocalFileReadSource } from "./localFileTypes";
import { navigateToLocalFile } from "../../navigation/rootNavigation";

type OpenLocalFileResult =
  | { status: "success"; localFileId: string; fileName: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

async function openLocalFileSource(source: LocalFileReadSource | null): Promise<OpenLocalFileResult> {
  if (!source) {
    return { status: "cancelled" };
  }

  try {
    const loadedFile = await loadLocalFile(source);
    const localOpenedFile = addLocalOpenedFile(loadedFile);

    navigateToLocalFile({
      localFileId: localOpenedFile.id,
      fileName: localOpenedFile.fileName,
    });

    return {
      status: "success",
      localFileId: localOpenedFile.id,
      fileName: localOpenedFile.fileName,
    };
  } catch (error) {
    if (isLocalFileLoadError(error)) {
      return { status: "error", message: error.userMessage };
    }

    return {
      status: "error",
      message: "Не удалось открыть файл. Попробуйте ещё раз.",
    };
  }
}

export async function openPickedLocalFileFlow(): Promise<OpenLocalFileResult> {
  const pickedDocument = await pickSingleLocalDocument();
  return openLocalFileSource(pickedDocument);
}

export async function openIncomingLocalFileIntent(
  intent: IncomingLocalFileIntent,
): Promise<OpenLocalFileResult> {
  const source: LocalFileReadSource = {
    fileName: intent.fileName,
    workingUri: intent.workingUri,
    originalUri: intent.uri,
    mimeType: intent.mimeType,
    size: intent.size,
    sourceKind: "external-intent",
    canDirectWrite: intent.hasWritePermission || intent.hasPersistedWritePermission,
    hasPersistedReadPermission: intent.hasPersistedReadPermission,
    hasPersistedWritePermission: intent.hasPersistedWritePermission,
  };

  return openLocalFileSource(source);
}
