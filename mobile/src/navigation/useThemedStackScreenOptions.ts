import { useMemo } from "react";
import { useTheme } from "../hooks/useTheme";

export function useThemedStackScreenOptions() {
  const { themeTokens } = useTheme();
  const background = themeTokens["--bg-app"];
  const text = themeTokens["--text-primary"];

  return useMemo(
    () => ({
      headerShadowVisible: false,
      contentStyle: { backgroundColor: background },
      headerStyle: { backgroundColor: background },
      headerTintColor: text,
      headerTitleStyle: { color: text },
    }),
    [background, text],
  );
}
