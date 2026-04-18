import { useMemo } from "react";
import { ScrollView } from "react-native";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { Card } from "../common/Card";
import { AutoHeightHtmlWebView } from "../common/AutoHeightHtmlWebView";
import { buildMarkdownHtmlDocument } from "./markdownHtmlDocument";
import { renderMarkdownToHtml } from "./markdownRenderer";

type MarkdownPreviewProps = {
  content: string;
  scrollable?: boolean;
};

export function MarkdownPreview({
  content,
  scrollable = true,
}: MarkdownPreviewProps) {
  const background = useThemeVariable("--bg-input", "#101913");
  const panelBackground = useThemeVariable("--bg-panel", "#16201a");
  const text = useThemeVariable("--text-primary", "#edf5ee");
  const secondary = useThemeVariable("--text-secondary", "#c5d5c7");
  const accent = useThemeVariable("--accent", "#316e43");
  const border = useThemeVariable("--border-default", "#243228");
  const codeBackground = useThemeVariable("--bg-input", "#101913");
  const editorBackground = useThemeVariable("--bg-editor", "#0d1410");

  const html = useMemo(() => {
    const safeContent = content.trim() ? content : "_Пустой Markdown-файл_";
    const contentHtml = renderMarkdownToHtml(safeContent);

    return buildMarkdownHtmlDocument({
      contentHtml,
      background,
      panelBackground,
      text,
      secondary,
      accent,
      border,
      codeBackground,
      editorBackground,
    });
  }, [accent, background, border, codeBackground, content, editorBackground, panelBackground, secondary, text]);

  const body = (
    <Card>
      <AutoHeightHtmlWebView html={html} maxHeight={scrollable ? 3200 : 20000} minHeight={120} />
    </Card>
  );

  if (!scrollable) {
    return body;
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {body}
    </ScrollView>
  );
}
