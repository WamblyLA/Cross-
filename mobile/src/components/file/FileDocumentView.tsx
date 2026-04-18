import { useEffect, useState } from "react";
import { View } from "react-native";
import type { FileKind } from "../../types/files";
import { InlineNotice } from "../common/InlineNotice";
import { MarkdownEditorPanel } from "../markdown/MarkdownEditorPanel";
import { NotebookEditor } from "../notebook/NotebookEditor";
import { NotebookView } from "../notebook/NotebookView";
import { FileInfoCard } from "./FileInfoCard";
import { ReadOnlyBanner } from "./ReadOnlyBanner";
import { TextFileEditor } from "./TextFileEditor";

export type FileDocumentNotice = {
  tone: "success" | "error" | "info" | "warning";
  text: string;
};

type FileDocumentAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

type FileDocumentViewProps = {
  fileName: string;
  value: string;
  kind: FileKind;
  editable: boolean;
  onChangeText: (value: string) => void;
  notice?: FileDocumentNotice | null;
  readOnlyReason?: string | null;
  fileInfo: {
    statusText: string;
    badgeText: string;
    badgeTone?: "primary" | "muted";
    primaryAction?: FileDocumentAction | null;
    secondaryAction?: FileDocumentAction | null;
  };
};

export function FileDocumentView({
  fileName,
  value,
  kind,
  editable,
  onChangeText,
  notice = null,
  readOnlyReason = null,
  fileInfo,
}: FileDocumentViewProps) {
  const [markdownMode, setMarkdownMode] = useState<"edit" | "preview">(
    editable ? "edit" : "preview",
  );

  useEffect(() => {
    setMarkdownMode(editable ? "edit" : "preview");
  }, [editable, fileName]);

  return (
    <View className="flex-1 gap-3">
      <FileInfoCard
        badgeText={fileInfo.badgeText}
        badgeTone={fileInfo.badgeTone}
        fileName={fileName}
        primaryAction={fileInfo.primaryAction}
        secondaryAction={fileInfo.secondaryAction}
        statusText={fileInfo.statusText}
      />

      {readOnlyReason ? <ReadOnlyBanner text={readOnlyReason} /> : null}
      {notice ? <InlineNotice text={notice.text} tone={notice.tone} /> : null}

      <View className="flex-1">
        {kind === "markdown" ? (
          <MarkdownEditorPanel
            editable={editable}
            mode={markdownMode}
            onChangeMode={setMarkdownMode}
            onChangeText={onChangeText}
            value={value}
          />
        ) : null}

        {kind === "text" ? (
          <TextFileEditor editable={editable} onChangeText={onChangeText} value={value} />
        ) : null}

        {kind === "notebook" ? (
          editable ? <NotebookEditor content={value} onChangeContent={onChangeText} /> : <NotebookView content={value} />
        ) : null}
      </View>
    </View>
  );
}
