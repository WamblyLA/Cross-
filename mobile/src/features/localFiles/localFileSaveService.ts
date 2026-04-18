import { File } from "expo-file-system";
import {
  StorageAccessFramework,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import { getLocalFileMimeType } from "./localFileRouting";
import type { LocalOpenedFile } from "./localFileTypes";

type SaveSuccess = {
  status: "success";
  message: string;
  patch?: Partial<Omit<LocalOpenedFile, "id">>;
};

type SaveCancelled = {
  status: "cancelled";
};

type SaveError = {
  status: "error";
  message: string;
  shouldOfferSaveAs?: boolean;
};

type SaveRequiresSaveAs = {
  status: "save-as-required";
  message: string;
};

export type LocalFileSaveResult = SaveSuccess | SaveCancelled | SaveError | SaveRequiresSaveAs;

function isContentUri(uri: string | null | undefined) {
  return Boolean(uri?.startsWith("content://"));
}

function syncWorkingCopy(workingUri: string, content: string) {
  try {
    new File(workingUri).write(content);
  } catch {
    // working copy sync is best-effort
  }
}

function getWritableUri(file: LocalOpenedFile) {
  if (!file.originalUri) {
    return null;
  }

  if (file.saveStrategy !== "direct-source") {
    return null;
  }

  return file.originalUri;
}

export async function saveLocalFile(
  file: LocalOpenedFile,
  content: string,
): Promise<LocalFileSaveResult> {
  const writableUri = getWritableUri(file);

  if (!writableUri) {
    return {
      status: "save-as-required",
      message: "Для этого файла изменения сохраняются через «Сохранить как».",
    };
  }

  try {
    if (isContentUri(writableUri)) {
      await writeAsStringAsync(writableUri, content);
    } else {
      new File(writableUri).write(content);
    }
  } catch {
    return {
      status: "error",
      message:
        "Не удалось сохранить изменения в исходный файл. Проверьте разрешения или используйте «Сохранить как».",
      shouldOfferSaveAs: true,
    };
  }

  syncWorkingCopy(file.workingUri, content);

  return {
    status: "success",
    message: "Локальный файл сохранён.",
    patch: { content },
  };
}

export async function saveLocalFileAs(
  file: LocalOpenedFile,
  content: string,
): Promise<LocalFileSaveResult> {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permission.granted || !permission.directoryUri) {
    return { status: "cancelled" };
  }

  let targetUri: string;

  try {
    targetUri = await StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      file.fileName,
      getLocalFileMimeType(file.fileName, file.mimeType),
    );
    await writeAsStringAsync(targetUri, content);
  } catch {
    return {
      status: "error",
      message: "Не удалось сохранить копию файла. Попробуйте выбрать другую папку и повторить.",
    };
  }

  syncWorkingCopy(file.workingUri, content);

  return {
    status: "success",
    message: "Файл сохранён как локальная копия.",
    patch: {
      originalUri: targetUri,
      mimeType: getLocalFileMimeType(file.fileName, file.mimeType),
      content,
      sourceKind: "save-as",
      saveStrategy: "direct-source",
      canDirectWrite: true,
      hasPersistedReadPermission: true,
      hasPersistedWritePermission: true,
    },
  };
}
