import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import type { AuthenticatedStackParamList } from "./navigationTypes";
import { AppTabsNavigator } from "./AppTabsNavigator";

const Stack = createNativeStackNavigator<AuthenticatedStackParamList>();

export function AuthenticatedNavigator() {
  const { themeTokens } = useTheme();
  const background = themeTokens["--bg-app"];
  const text = themeTokens["--text-primary"];
  const screenOptions = useMemo(
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
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        component={AppTabsNavigator}
        name="Tabs"
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
