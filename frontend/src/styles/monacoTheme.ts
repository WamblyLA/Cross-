import type * as Monaco from "monaco-editor";
import { getMonacoThemeName } from "./tokens";

const monacoThemePalette = {
  dark: {
    base: "vs-dark",
    colors: {
      "editor.background": "#0d1410",
      "editor.foreground": "#edf5ee",
      "editor.lineHighlightBackground": "#1b261e",
      "editor.selectionBackground": "#2e5a3a",
      "editor.inactiveSelectionBackground": "#2e5a3a",
      "editorCursor.foreground": "#3d8853",
      "editorLineNumber.foreground": "#8ea28f",
      "editorLineNumber.activeForeground": "#c5d5c7",
      "editorGutter.background": "#0d1410",
      "editorIndentGuide.background1": "#243228",
      "editorIndentGuide.activeBackground1": "#334538",
      "editorBracketMatch.background": "#243328",
      "editorBracketMatch.border": "#67af7b",
      "editorWhitespace.foreground": "#243228",
      "editorWidget.background": "#172019",
      "editorWidget.border": "#243228",
      "editorHoverWidget.background": "#172019",
      "editorHoverWidget.border": "#243228",
      "editorSuggestWidget.background": "#172019",
      "editorSuggestWidget.border": "#243228",
      "editorSuggestWidget.selectedBackground": "#1b261e",
      "editorSuggestWidget.highlightForeground": "#3d8853",
      "scrollbarSlider.background": "#243228",
      "scrollbarSlider.hoverBackground": "#334538",
      "scrollbarSlider.activeBackground": "#67af7b",
      "list.hoverBackground": "#1b261e",
      "list.activeSelectionBackground": "#243328",
      "list.inactiveSelectionBackground": "#1b261e",
      "list.activeSelectionForeground": "#edf5ee",
      "list.inactiveSelectionForeground": "#edf5ee",
      "minimap.selectionHighlight": "#2e5a3a",
    },
    rules: [
      { token: "comment", foreground: "8ea28f", fontStyle: "italic" },
      { token: "keyword", foreground: "3d8853", fontStyle: "bold" },
      { token: "string", foreground: "6fbe7f" },
      { token: "number", foreground: "d2a15b" },
      { token: "type.identifier", foreground: "316e43" },
      { token: "function", foreground: "edf5ee" },
      { token: "variable", foreground: "edf5ee" },
      { token: "operator", foreground: "c5d5c7" },
      { token: "delimiter", foreground: "c5d5c7" },
      { token: "invalid", foreground: "d97979", fontStyle: "underline" },
    ],
  },
  light: {
    base: "vs",
    colors: {
      "editor.background": "#f2f7f3",
      "editor.foreground": "#142017",
      "editor.lineHighlightBackground": "#e8f0ea",
      "editor.selectionBackground": "#cfe2d4",
      "editor.inactiveSelectionBackground": "#cfe2d4",
      "editorCursor.foreground": "#3f784e",
      "editorLineNumber.foreground": "#607365",
      "editorLineNumber.activeForeground": "#2f4132",
      "editorGutter.background": "#f2f7f3",
      "editorIndentGuide.background1": "#c9d6cc",
      "editorIndentGuide.activeBackground1": "#a6baa9",
      "editorBracketMatch.background": "#d9e7dd",
      "editorBracketMatch.border": "#3d8753",
      "editorWhitespace.foreground": "#c9d6cc",
      "editorWidget.background": "#f8fbf8",
      "editorWidget.border": "#c9d6cc",
      "editorHoverWidget.background": "#f8fbf8",
      "editorHoverWidget.border": "#c9d6cc",
      "editorSuggestWidget.background": "#f8fbf8",
      "editorSuggestWidget.border": "#c9d6cc",
      "editorSuggestWidget.selectedBackground": "#e8f0ea",
      "editorSuggestWidget.highlightForeground": "#3f784e",
      "scrollbarSlider.background": "#c9d6cc",
      "scrollbarSlider.hoverBackground": "#a6baa9",
      "scrollbarSlider.activeBackground": "#3d8753",
      "list.hoverBackground": "#e8f0ea",
      "list.activeSelectionBackground": "#d9e7dd",
      "list.inactiveSelectionBackground": "#e8f0ea",
      "list.activeSelectionForeground": "#142017",
      "list.inactiveSelectionForeground": "#142017",
      "minimap.selectionHighlight": "#cfe2d4",
    },
    rules: [
      { token: "comment", foreground: "607365", fontStyle: "italic" },
      { token: "keyword", foreground: "3f784e", fontStyle: "bold" },
      { token: "string", foreground: "3d8753" },
      { token: "number", foreground: "b97b2a" },
      { token: "type.identifier", foreground: "4e8e61" },
      { token: "function", foreground: "142017" },
      { token: "variable", foreground: "142017" },
      { token: "operator", foreground: "2f4132" },
      { token: "delimiter", foreground: "2f4132" },
      { token: "invalid", foreground: "c45555", fontStyle: "underline" },
    ],
  },
} as const;

let themesRegistered = false;

export function registerMonacoThemes(monaco: typeof Monaco) {
  if (themesRegistered) {
    return;
  }

  for (const [themeName, definition] of Object.entries(monacoThemePalette)) {
    monaco.editor.defineTheme(getMonacoThemeName(themeName as "dark" | "light"), {
      base: definition.base,
      inherit: true,
      colors: definition.colors,
      rules: [...definition.rules],
    });
  }

  themesRegistered = true;
}
