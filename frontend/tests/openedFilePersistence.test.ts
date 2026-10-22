import { describe, expect, test } from "bun:test";
import type { OpenedFile } from "../src/features/files/fileTypes";
import {
  persistOpenedFile,
  type OpenedFilePersistenceDependencies,
} from "../src/features/files/openedFilePersistence";

const localFile: OpenedFile = {
  kind: "local",
  tabId: "local:C:/project/main.py",
  editorPath: "C:/project/main.py",
  path: "C:/project/main.py",
  name: "main.py",
  extension: "py",
  content: "print('ok')",
  isDirty: true,
};

const cloudFile: OpenedFile = {
  kind: "cloud",
  tabId: "cloud:project-1:file-1",
  editorPath: "cloud://project-1/main.py",
  projectId: "project-1",
  fileId: "file-1",
  canWrite: true,
  name: "main.py",
  extension: "py",
  content: "print('cloud')",
  isDirty: true,
  version: 3,
  updatedAt: "2026-10-22T10:00:00.000Z",
  syncStatus: "synced",
  lastSyncedContent: "print('old')",
};

function createDependencies(overrides: Partial<OpenedFilePersistenceDependencies> = {}) {
  const events: string[] = [];
  const dependencies: OpenedFilePersistenceDependencies = {
    writeLocalFile: async (path, content) => {
      events.push(`write:${path}:${content}`);
    },
    markLocalFileSaved: (tabId) => {
      events.push(`mark:${tabId}`);
    },
    isCloudRealtimeActive: () => false,
    flushCloudRealtimeUpdate: async (fileId) => {
      events.push(`flush:${fileId}`);
      return false;
    },
    saveCloudFile: async ({ projectId, fileId, content }) => {
      events.push(`save:${projectId}:${fileId}:${content}`);
      return {
        id: fileId,
        content,
        version: 4,
        updatedAt: "2026-10-22T10:01:00.000Z",
      };
    },
    applyCloudSavedSnapshot: (snapshot) => {
      events.push(`snapshot:${snapshot.fileId}:${snapshot.version}`);
    },
    ...overrides,
  };

  return { dependencies, events };
}

describe("persistOpenedFile", () => {
  test("writes a local file before marking its tab as saved", async () => {
    const { dependencies, events } = createDependencies();

    await persistOpenedFile(localFile, dependencies);

    expect(events).toEqual([
      "write:C:/project/main.py:print('ok')",
      "mark:local:C:/project/main.py",
    ]);
  });

  test("stops after a successful realtime cloud flush", async () => {
    const { dependencies, events } = createDependencies({
      isCloudRealtimeActive: () => true,
      flushCloudRealtimeUpdate: async (fileId) => {
        events.push(`flush:${fileId}`);
        return true;
      },
    });

    await persistOpenedFile(cloudFile, dependencies);

    expect(events).toEqual(["flush:file-1"]);
  });

  test("falls back to HTTP and applies the returned cloud snapshot", async () => {
    const { dependencies, events } = createDependencies();

    await persistOpenedFile(cloudFile, dependencies);

    expect(events).toEqual([
      "save:project-1:file-1:print('cloud')",
      "snapshot:file-1:4",
    ]);
  });
});
