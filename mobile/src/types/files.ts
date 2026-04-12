import type { CloudFileSummary } from "./projects";

export type CloudFile = CloudFileSummary & {
  content: string;
  canWrite: boolean;
};

export type FileKind = "text" | "markdown" | "notebook";
