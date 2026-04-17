import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { AccountScreen } from "../screens/account/AccountScreen";
import { ProjectsStackNavigator } from "./ProjectsStackNavigator";
import type { AppTabsParamList } from "./navigationTypes";

const Tabs = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  const { themeTokens } = useTheme();
  const accent = themeTokens["--accent"];
  const muted = themeTokens["--text-muted"];
  const panel = themeTokens["--bg-panel"];
  const border = themeTokens["--border-default"];
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: accent,
      tabBarInactiveTintColor: muted,
      tabBarShowLabel: true,
      tabBarStyle: {
        backgroundColor: panel,
        borderTopColor: border,
      },
    }),
    [accent, border, muted, panel],
  );

  return (
    <Tabs.Navigator screenOptions={screenOptions}>
      <Tabs.Screen
        component={ProjectsStackNavigator}
        name="ProjectsTab"
        options={{
          title: "Проекты",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              color={color}
              name={focused ? "folder-multiple" : "folder-multiple-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        component={AccountScreen}
        name="AccountTab"
        options={{
          title: "Аккаунт",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              color={color}
              name={focused ? "account-circle" : "account-circle-outline"}
              size={size}
            />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}
