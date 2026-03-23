import type * as Monaco from "monaco-editor";
import { getMonacoThemeName, type ThemeName } from "./tokens";

function readToken(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function toRuleColor(value: string) {
  return value.replace("#", "").trim();
}

export function applyMonacoTheme(monaco: typeof Monaco, theme: ThemeName) {
  const background = readToken("--bg-editor");
  const panel = readToken("--bg-panel");
  const hover = readToken("--bg-hover");
  const active = readToken("--bg-active");
  const textPrimary = readToken("--text-primary");
  const textSecondary = readToken("--text-secondary");
  const textMuted = readToken("--text-muted");
  const borderDefault = readToken("--border-default");
  const borderStrong = readToken("--border-strong");
  const borderFocus = readToken("--border-focus");
  const accent = readToken("--accent");
  const accentStrong = readToken("--accent-strong");
  const success = readToken("--success");
  const warning = readToken("--warning");
  const error = readToken("--error");
  const selection = readToken("--selection");

  monaco.editor.defineTheme(getMonacoThemeName(theme), {
    base: theme === "dark" ? "vs-dark" : "vs",
    inherit: true,
    colors: {
      "editor.background": background,
      "editor.foreground": textPrimary,
      "editor.lineHighlightBackground": hover,
      "editor.selectionBackground": selection,
      "editor.inactiveSelectionBackground": selection,
      "editorCursor.foreground": accentStrong,
      "editorLineNumber.foreground": textMuted,
      "editorLineNumber.activeForeground": textSecondary,
      "editorGutter.background": background,
      "editorIndentGuide.background1": borderDefault,
      "editorIndentGuide.activeBackground1": borderStrong,
      "editorBracketMatch.background": active,
      "editorBracketMatch.border": borderFocus,
      "editorWhitespace.foreground": borderDefault,
      "editorWidget.background": panel,
      "editorWidget.border": borderDefault,
      "editorHoverWidget.background": panel,
      "editorHoverWidget.border": borderDefault,
      "editorSuggestWidget.background": panel,
      "editorSuggestWidget.border": borderDefault,
      "editorSuggestWidget.selectedBackground": hover,
      "editorSuggestWidget.highlightForeground": accentStrong,
      "scrollbarSlider.background": borderDefault,
      "scrollbarSlider.hoverBackground": borderStrong,
      "scrollbarSlider.activeBackground": borderFocus,
      "list.hoverBackground": hover,
      "list.activeSelectionBackground": active,
      "list.inactiveSelectionBackground": hover,
      "list.activeSelectionForeground": textPrimary,
      "list.inactiveSelectionForeground": textPrimary,
      "minimap.selectionHighlight": selection,
    },
    rules: [
      { token: "comment", foreground: toRuleColor(textMuted), fontStyle: "italic" },
      { token: "keyword", foreground: toRuleColor(accentStrong), fontStyle: "bold" },
      { token: "string", foreground: toRuleColor(success) },
      { token: "number", foreground: toRuleColor(warning) },
      { token: "type.identifier", foreground: toRuleColor(accent) },
      { token: "function", foreground: toRuleColor(textPrimary) },
      { token: "variable", foreground: toRuleColor(textPrimary) },
      { token: "operator", foreground: toRuleColor(textSecondary) },
      { token: "delimiter", foreground: toRuleColor(textSecondary) },
      { token: "invalid", foreground: toRuleColor(error), fontStyle: "underline" },
    ],
  });
}
