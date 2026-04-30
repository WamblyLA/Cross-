import {
  DEFAULT_VISUAL_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  TAB_SIZE_MAX,
  TAB_SIZE_MIN,
  type VisualSettings,
} from "./visualSettingsTypes";
import { isThemeName } from "../../styles/tokens";

export const VISUAL_SETTINGS_STORAGE_KEY = "crosspp-visual-settings";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeVisualSettings(
  value: Partial<VisualSettings> | null | undefined,
): VisualSettings {
  const rawFontSize = value?.fontSize;
  const rawTabSize = value?.tabSize;
  const theme = isThemeName(value?.theme) ? value.theme : DEFAULT_VISUAL_SETTINGS.theme;
  const fontSize =
    typeof rawFontSize === "number" && Number.isFinite(rawFontSize)
      ? clamp(Math.round(rawFontSize), FONT_SIZE_MIN, FONT_SIZE_MAX)
      : DEFAULT_VISUAL_SETTINGS.fontSize;
  const tabSize =
    typeof rawTabSize === "number" && Number.isFinite(rawTabSize)
      ? clamp(Math.round(rawTabSize), TAB_SIZE_MIN, TAB_SIZE_MAX)
      : DEFAULT_VISUAL_SETTINGS.tabSize;

  return {
    theme,
    fontSize,
    tabSize,
  };
}

export function readStoredVisualSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_VISUAL_SETTINGS;
  }

  const rawValue = window.localStorage.getItem(VISUAL_SETTINGS_STORAGE_KEY);

  if (!rawValue) {
    return DEFAULT_VISUAL_SETTINGS;
  }

  try {
    return normalizeVisualSettings(JSON.parse(rawValue) as Partial<VisualSettings>);
  } catch {
    return DEFAULT_VISUAL_SETTINGS;
  }
}

export function writeStoredVisualSettings(settings: VisualSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(VISUAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
