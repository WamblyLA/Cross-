import * as DocumentPicker from "expo-document-picker";
import type { LocalFileReadSource } from "./localFileTypes";

export async function pickSingleLocalDocument(): Promise<LocalFileReadSource | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const [asset] = result.assets;

  return {
    fileName: asset.name,
    workingUri: asset.uri,
    originalUri: null,
    mimeType: asset.mimeType ?? null,
    size: asset.size ?? null,
    sourceKind: "picker",
    canDirectWrite: false,
    hasPersistedReadPermission: false,
    hasPersistedWritePermission: false,
  };
}
