import type * as Monaco from "monaco-editor";
import { type ThemeName } from "../../styles/tokens";
import NotebookEditorHost from "./notebook/NotebookEditorHost";

type NotebookEditorProps = {
  filePath: string;
  content: string;
  isDirty: boolean;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  runtimeContext:
    | {
        kind: "local";
        runtimeId: string;
        notebookPath: string;
        workspaceRootPath?: string | null;
      }
    | {
        kind: "cloud";
        runtimeId: string;
        editorPath: string;
        projectId: string;
        fileId: string;
        name: string;
      };
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

export default function NotebookEditor(props: NotebookEditorProps) {
  return <NotebookEditorHost {...props} />;
}
