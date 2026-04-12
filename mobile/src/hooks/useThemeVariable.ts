import { useTheme } from "./useTheme";
import { THEME_VARIABLES } from "../features/visualSettings/themeVariables";

export function useThemeVariable(name: string, fallback: string) {
  const { themeName } = useTheme();
  return THEME_VARIABLES[themeName][name] ?? fallback;
}
