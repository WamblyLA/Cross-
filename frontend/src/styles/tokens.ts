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

export function readStoredTheme(): ThemeName {
  if (typeof window === "undefined") {
    return DEFAULT_THEME;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  return isThemeName(storedTheme) ? storedTheme : DEFAULT_THEME;
}

export function getNextTheme(theme: ThemeName): ThemeName {
  return theme === "dark" ? "light" : "dark";
}

export function getMonacoThemeName(theme: ThemeName) {
  return MONACO_THEME_NAMES[theme];
}
