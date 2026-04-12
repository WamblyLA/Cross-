import * as SecureStore from "expo-secure-store";
import type { ThemeName } from "../../types/visualSettings";

const THEME_KEY = "crossplusplus.mobile.theme";
let memoryTheme: ThemeName | null = null;

function isThemeName(value: string | null | undefined): value is ThemeName {
  return value === "dark" || value === "light";
}

export async function readStoredTheme() {
  if (memoryTheme) {
    return memoryTheme;
  }

  try {
    const theme = await SecureStore.getItemAsync(THEME_KEY);

    if (isThemeName(theme)) {
      memoryTheme = theme;
      return theme;
    }
  } catch {
    return memoryTheme;
  }

  return memoryTheme;
}

export async function writeStoredTheme(theme: ThemeName) {
  memoryTheme = theme;

  try {
    await SecureStore.setItemAsync(THEME_KEY, theme);
  } catch {
    return;
  }
}
