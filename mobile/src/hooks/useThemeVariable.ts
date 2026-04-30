import { useTheme } from "./useTheme";
import type { ThemeVariableName } from "../features/visualSettings/themeVariables";

export function useThemeVariable(name: ThemeVariableName, fallback: string) {
  const { resolvedThemeVariables } = useTheme();
  return resolvedThemeVariables[name] ?? fallback;
}
