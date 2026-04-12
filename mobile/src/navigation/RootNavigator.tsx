import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { AuthNavigator } from "./AuthNavigator";
import { AppTabsNavigator } from "./AppTabsNavigator";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";
import { useThemeVariable } from "../hooks/useThemeVariable";

export function RootNavigator() {
  const { sessionStatus } = useSession();
  const { themeName } = useTheme();
  const background = useThemeVariable("--bg-app", "#0a0f0b");
  const panel = useThemeVariable("--bg-panel", "#172019");
  const text = useThemeVariable("--text-primary", "#edf5ee");
  const accent = useThemeVariable("--accent", "#316e43");
  const border = useThemeVariable("--border-default", "#243228");
  const baseTheme = themeName === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
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

  return (
    <NavigationContainer theme={navigationTheme}>
      {sessionStatus === "authenticated" ? <AppTabsNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
