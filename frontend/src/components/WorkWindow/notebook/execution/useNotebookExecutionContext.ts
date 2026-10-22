import { useCallback } from "react";
import * as cloudApi from "../../../../features/cloud/cloudApi";
import { selectOpenedFiles } from "../../../../features/files/filesSelectors";
import { useAppSelector } from "../../../../store/hooks";
import type { NotebookRuntimeContext } from "./types";

export function useNotebookExecutionContext(runtimeContext: NotebookRuntimeContext) {
  const openedFiles = useAppSelector(selectOpenedFiles);

  const buildCloudSnapshot = useCallback(async () => {
    if (runtimeContext.kind !== "cloud") {
      throw new Error("Cloud snapshot requested for local notebook runtime.");
    }

    const response = await cloudApi.getProjectRunSnapshot(runtimeContext.projectId);
    const dirtyCloudFiles = new Map(
      openedFiles
        .filter(
          (file): file is Extract<(typeof openedFiles)[number], { kind: "cloud" }> =>
            file.kind === "cloud" && file.projectId === runtimeContext.projectId,
        )
        .map((file) => [file.fileId, file.content]),
    );

    return {
      ...response.snapshot,
      files: response.snapshot.files.map((file) =>
        dirtyCloudFiles.has(file.id)
          ? { ...file, content: dirtyCloudFiles.get(file.id) ?? file.content }
          : file,
      ),
    };
  }, [openedFiles, runtimeContext]);

  return useCallback(async (): Promise<NotebookExecutionContext> => {
    if (runtimeContext.kind === "local") {
      return {
        kind: "local",
        runtimeId: runtimeContext.runtimeId,
        notebookPath: runtimeContext.notebookPath,
        workspaceRootPath: runtimeContext.workspaceRootPath ?? null,
      };
    }

    return {
      kind: "cloud",
      runtimeId: runtimeContext.runtimeId,
      editorPath: runtimeContext.editorPath,
      projectId: runtimeContext.projectId,
      fileId: runtimeContext.fileId,
      name: runtimeContext.name,
      cloudSnapshot: await buildCloudSnapshot(),
    };
  }, [buildCloudSnapshot, runtimeContext]);
}
