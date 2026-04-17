import type { ThemeName, VisualSettings } from "../../types/visualSettings";

export const DEFAULT_VISUAL_SETTINGS = {
  theme: "dark",
  fontSize: 14,
  tabSize: 4,
} satisfies VisualSettings;

export type ThemeVariableName =
  | "--bg-app"
  | "--bg-chrome"
  | "--bg-panel"
  | "--bg-editor"
  | "--bg-input"
  | "--bg-hover"
  | "--bg-active"
  | "--text-primary"
  | "--text-secondary"
  | "--text-muted"
  | "--text-inverse"
  | "--border-default"
  | "--border-strong"
  | "--border-focus"
  | "--accent"
  | "--accent-strong"
  | "--success"
  | "--warning"
  | "--error"
  | "--selection";

export type ThemeTokens = Record<ThemeVariableName, string>;

export const THEME_VARIABLES = {
  dark: {
    "--bg-app": "#0a0f0b",
    "--bg-chrome": "#121a14",
    "--bg-panel": "#172019",
    "--bg-editor": "#0d1410",
    "--bg-input": "#101913",
    "--bg-hover": "#1b261e",
    "--bg-active": "#243328",
    "--text-primary": "#edf5ee",
    "--text-secondary": "#c5d5c7",
    "--text-muted": "#8ea28f",
    "--text-inverse": "#f6fbf7",
    "--border-default": "#243228",
    "--border-strong": "#334538",
    "--border-focus": "#67af7b",
    "--accent": "#316e43",
    "--accent-strong": "#3d8853",
    "--success": "#6fbe7f",
    "--warning": "#d2a15b",
    "--error": "#d97979",
    "--selection": "#2e5a3a",
  },
  light: {
    "--bg-app": "#edf2ee",
    "--bg-chrome": "#dde7df",
    "--bg-panel": "#f8fbf8",
    "--bg-editor": "#f2f7f3",
    "--bg-input": "#ffffff",
    "--bg-hover": "#e8f0ea",
    "--bg-active": "#d9e7dd",
    "--text-primary": "#142017",
    "--text-secondary": "#2f4132",
    "--text-muted": "#607365",
    "--text-inverse": "#f7fbf8",
    "--border-default": "#c9d6cc",
    "--border-strong": "#a6baa9",
    "--border-focus": "#3d8753",
    "--accent": "#4e8e61",
    "--accent-strong": "#3f784e",
    "--success": "#3d8753",
    "--warning": "#b97b2a",
    "--error": "#c45555",
    "--selection": "#cfe2d4",
  },
} satisfies Record<ThemeName, ThemeTokens>;

export function getThemeTokens(themeName: ThemeName): ThemeTokens {
  return THEME_VARIABLES[themeName];
}
