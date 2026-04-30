import { createHash } from "crypto";
import path from "path";

const MAX_SEGMENT_LENGTH = 48;

function normalizeSegment(value) {
  const source = `${value ?? ""}`
    .normalize("NFKC")
    .trim()
    .toLowerCase();

  const normalized = source
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SEGMENT_LENGTH);

  return normalized || "session";
}

function buildRuntimeIdentity(runtimeContextOrId) {
  if (typeof runtimeContextOrId === "string") {
    return {
      prefix: "session",
      hint: runtimeContextOrId,
      identity: runtimeContextOrId,
    };
  }

  if (runtimeContextOrId?.kind === "local") {
    const notebookPath = `${runtimeContextOrId.notebookPath ?? ""}`.trim();
    const notebookName = notebookPath ? path.parse(notebookPath).name : "local-notebook";

    return {
      prefix: "local",
      hint: notebookName,
      identity: `local:${runtimeContextOrId.runtimeId ?? ""}:${notebookPath}`,
    };
  }

  const projectId = `${runtimeContextOrId?.projectId ?? ""}`.trim();
  const fileId = `${runtimeContextOrId?.fileId ?? ""}`.trim();
  const notebookName = `${runtimeContextOrId?.name ?? ""}`.trim() || fileId || "cloud-notebook";

  return {
    prefix: "cloud",
    hint: notebookName,
    identity: `cloud:${runtimeContextOrId?.runtimeId ?? ""}:${projectId}:${fileId}:${runtimeContextOrId?.editorPath ?? ""}`,
  };
}

export function buildNotebookSessionDirectoryKey(runtimeContextOrId) {
  const { prefix, hint, identity } = buildRuntimeIdentity(runtimeContextOrId);
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 12);

  return `${normalizeSegment(prefix)}-${normalizeSegment(hint)}-${hash}`;
}
