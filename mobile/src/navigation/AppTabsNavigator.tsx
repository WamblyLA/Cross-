import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useThemeVariable } from "../hooks/useThemeVariable";
import { AccountScreen } from "../screens/account/AccountScreen";
import { ProjectsStackNavigator } from "./ProjectsStackNavigator";
import type { AppTabsParamList } from "./navigationTypes";

const Tabs = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
  const accent = useThemeVariable("--accent", "#316e43");
  const muted = useThemeVariable("--text-muted", "#8ea28f");
  const panel = useThemeVariable("--bg-panel", "#172019");
  const border = useThemeVariable("--border-default", "#243228");

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: panel,
          borderTopColor: border,
        },
      }}
    >
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
