export type ThemeName = "dark" | "light";

export const THEME_STORAGE_KEY = "crosspp-theme";

export const DEFAULT_THEME: ThemeName = "dark";

export const MONACO_THEME_NAMES: Record<ThemeName, string> = {
  dark: "crosspp-dark",
  light: "crosspp-light",
};

export function isThemeName(value: string | null | undefined): value is ThemeName {
  return value === "dark" || value === "light";
}

export function getMonacoThemeName(theme: ThemeName) {
  return MONACO_THEME_NAMES[theme];
}
