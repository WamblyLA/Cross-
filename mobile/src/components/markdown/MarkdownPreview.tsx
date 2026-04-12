import { useMemo } from "react";
import Markdown from "react-native-markdown-display";
import { ScrollView, View } from "react-native";
import { Card } from "../common/Card";
import { useThemeVariable } from "../../hooks/useThemeVariable";

type MarkdownPreviewProps = {
  content: string;
  scrollable?: boolean;
};

export function MarkdownPreview({
  content,
  scrollable = true,
}: MarkdownPreviewProps) {
  const text = useThemeVariable("--text-primary", "#edf5ee");
  const secondary = useThemeVariable("--text-secondary", "#c5d5c7");
  const accent = useThemeVariable("--accent", "#316e43");
  const border = useThemeVariable("--border-default", "#243228");
  const codeBackground = useThemeVariable("--bg-input", "#101913");
  const markdownCodeBackground = useThemeVariable("--bg-editor", "#0d1410");
  const markdownStyles = useMemo(
    () => ({
      body: {
        color: text,
        fontSize: 14,
        lineHeight: 24,
      },
      heading1: {
        color: text,
        fontSize: 28,
        fontWeight: "800" as const,
        marginBottom: 12,
      },
      heading2: {
        color: text,
        fontSize: 24,
        fontWeight: "800" as const,
        marginBottom: 12,
      },
      heading3: {
        color: text,
        fontSize: 20,
        fontWeight: "700" as const,
        marginBottom: 8,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 12,
      },
      blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: accent,
        paddingLeft: 12,
        color: secondary,
      },
      code_inline: {
        backgroundColor: markdownCodeBackground,
        color: text,
        borderRadius: 6,
        paddingHorizontal: 4,
        paddingVertical: 2,
      },
      code_block: {
        backgroundColor: codeBackground,
        color: text,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        fontFamily: "monospace",
      },
      fence: {
        backgroundColor: codeBackground,
        color: text,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
        padding: 16,
        fontFamily: "monospace",
      },
      bullet_list: {
        marginBottom: 12,
      },
      ordered_list: {
        marginBottom: 12,
      },
    }),
    [accent, border, codeBackground, markdownCodeBackground, secondary, text],
  );

  const body = (
    <Card>
      <Markdown style={markdownStyles}>{content || "_Пустой Markdown-файл_"}</Markdown>
    </Card>
  );

  if (!scrollable) {
    return <>{body}</>;
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {body}
    </ScrollView>
  );
}
