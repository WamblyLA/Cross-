import type { LoadedLocalFile, LocalOpenedFile } from "./localFileTypes";

const localFileSession = new Map<string, LocalOpenedFile>();
let localFileCounter = 0;

export function addLocalOpenedFile(file: LoadedLocalFile): LocalOpenedFile {
  localFileCounter += 1;

  const localOpenedFile: LocalOpenedFile = {
    ...file,
    id: `local-file-${localFileCounter}`,
  };

  localFileSession.set(localOpenedFile.id, localOpenedFile);
  return localOpenedFile;
}

export function getLocalOpenedFile(id: string) {
  return localFileSession.get(id) ?? null;
}

export function updateLocalOpenedFile(id: string, patch: Partial<Omit<LocalOpenedFile, "id">>) {
  const current = localFileSession.get(id);

  if (!current) {
    return null;
  }

  const nextFile = {
    ...current,
    ...patch,
  };

  localFileSession.set(id, nextFile);
  return nextFile;
}

export function removeLocalOpenedFile(id: string) {
  localFileSession.delete(id);
}
