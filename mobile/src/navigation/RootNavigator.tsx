import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { useMemo } from "react";
import { AuthNavigator } from "./AuthNavigator";
import { AppTabsNavigator } from "./AppTabsNavigator";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";

export function RootNavigator() {
  const { sessionStatus } = useSession();
  const { colorScheme, themeTokens } = useTheme();
  const background = themeTokens["--bg-app"];
  const panel = themeTokens["--bg-panel"];
  const text = themeTokens["--text-primary"];
  const accent = themeTokens["--accent"];
  const border = themeTokens["--border-default"];
  const navigationTheme = useMemo(() => {
    const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background,
        card: panel,
        text,
        primary: accent,
        border,
        notification: accent,
      },
    };
  }, [accent, background, border, colorScheme, panel, text]);

  return (
    <NavigationContainer theme={navigationTheme}>
      {sessionStatus === "authenticated" ? <AppTabsNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
