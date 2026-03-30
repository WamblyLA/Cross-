import type { CloudSelectionType } from "./cloudTypes";

export type CloudSelectionKey = string;

export type CloudSelectionEntry =
  | {
      key: CloudSelectionKey;
      itemType: "project";
      projectId: string;
      name?: string;
    }
  | {
      key: CloudSelectionKey;
      itemType: "folder";
      projectId: string;
      folderId: string;
      name?: string;
      parentId?: string | null;
    }
  | {
      key: CloudSelectionKey;
      itemType: "file";
      projectId: string;
      fileId: string;
      folderId: string | null;
      name?: string;
    };

function encodeNullableSegment(value: string | null | undefined) {
  return value ?? "_";
}

function decodeNullableSegment(value: string | undefined) {
  if (!value || value === "_") {
    return null;
  }

  return value;
}

export function buildCloudSelectionKey(input: {
  itemType: Exclude<CloudSelectionType, null>;
  projectId: string;
  folderId?: string | null;
  fileId?: string | null;
}) {
  if (input.itemType === "project") {
    return `project:${input.projectId}`;
  }

  if (input.itemType === "folder") {
    return `folder:${input.projectId}:${input.folderId ?? ""}`;
  }

  return `file:${input.projectId}:${encodeNullableSegment(input.folderId)}:${input.fileId ?? ""}`;
}

export function createCloudSelectionEntry<T extends Omit<CloudSelectionEntry, "key">>(
  input: T,
): T & { key: CloudSelectionKey } {
  return {
    ...input,
    key: buildCloudSelectionKey(input),
  } as T & { key: CloudSelectionKey };
}

export function parseCloudSelectionKey(key: string): CloudSelectionEntry | null {
  const [itemType, projectId, segmentA, segmentB] = key.split(":");

  if (itemType === "project" && projectId) {
    return {
      key,
      itemType: "project",
      projectId,
    };
  }

  if (itemType === "folder" && projectId && segmentA) {
    return {
      key,
      itemType: "folder",
      projectId,
      folderId: segmentA,
    };
  }

  if (itemType === "file" && projectId && segmentB) {
    return {
      key,
      itemType: "file",
      projectId,
      folderId: decodeNullableSegment(segmentA),
      fileId: segmentB,
    };
  }

  return null;
}

export function dedupeCloudSelectionEntries(entries: CloudSelectionEntry[]) {
  const seen = new Set<string>();
  const nextEntries: CloudSelectionEntry[] = [];

  entries.forEach((entry) => {
    if (seen.has(entry.key)) {
      return;
    }

    seen.add(entry.key);
    nextEntries.push(entry);
  });

  return nextEntries;
}
