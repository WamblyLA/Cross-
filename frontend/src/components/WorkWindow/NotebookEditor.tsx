import type * as Monaco from "monaco-editor";
import { type ThemeName } from "../../styles/tokens";
import NotebookEditorHost from "./notebook/NotebookEditorHost";

type NotebookEditorProps = {
  filePath: string;
  content: string;
  isDirty: boolean;
  theme: ThemeName;
  beforeMount: (monaco: typeof Monaco) => void;
  onCommitContent: (nextContent: string) => void;
  onMarkDirty: () => void;
  onSaveContent: (nextContent: string) => Promise<void>;
};

export default function NotebookEditor(props: NotebookEditorProps) {
  return <NotebookEditorHost {...props} />;
}
