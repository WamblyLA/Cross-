import type { ApiError } from "../../lib/api/errorNormalization";
import type { ThemeName } from "../../styles/tokens";

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
