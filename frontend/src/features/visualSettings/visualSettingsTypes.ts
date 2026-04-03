import type { ApiError } from "../../lib/api/errorNormalization";
import type { ThemeName } from "../../styles/tokens";

export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 32;
export const TAB_SIZE_MIN = 2;
export const TAB_SIZE_MAX = 8;

export type VisualSettings = {
  theme: ThemeName;
  fontSize: number;
  tabSize: number;
};

export type VisualSettingsState = {
  current: VisualSettings;
  accountSettings: VisualSettings | null;
  syncPending: boolean;
  loadPending: boolean;
  actionError: ApiError | null;
};

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  theme: "dark",
  fontSize: 14,
  tabSize: 4,
};
