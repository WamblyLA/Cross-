import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { LocalFileIntentGateway } from "../features/localFiles/LocalFileIntentGateway";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";
import { LocalFileScreen } from "../screens/file/LocalFileScreen";
import { AuthenticatedNavigator } from "./AuthenticatedNavigator";
import { AuthNavigator } from "./AuthNavigator";
import type { RootStackParamList } from "./navigationTypes";
import { rootNavigationRef } from "./rootNavigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { sessionStatus } = useSession();
  const { colorScheme, themeTokens } = useTheme();
  const [navigationReady, setNavigationReady] = useState(false);
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
  const stackScreenOptions = useMemo(
    () => ({
      headerShadowVisible: false,
      contentStyle: { backgroundColor: background },
      headerStyle: { backgroundColor: background },
      headerTintColor: text,
      headerTitleStyle: { color: text },
    }),
    [background, text],
  );

  return (
    <NavigationContainer
      onReady={() => setNavigationReady(true)}
      ref={rootNavigationRef}
      theme={navigationTheme}
    >
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen
          component={sessionStatus === "authenticated" ? AuthenticatedNavigator : AuthNavigator}
          name="Shell"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          component={LocalFileScreen}
          name="LocalFile"
          options={({ route }) => ({ title: route.params.fileName })}
        />
      </Stack.Navigator>
      <LocalFileIntentGateway enabled={navigationReady} />
    </NavigationContainer>
  );
}
