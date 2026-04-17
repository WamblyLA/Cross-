import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { useTheme } from "../hooks/useTheme";
import { FileScreen } from "../screens/file/FileScreen";
import { ProjectScreen } from "../screens/projects/ProjectScreen";
import { ProjectsScreen } from "../screens/projects/ProjectsScreen";
import type { ProjectsStackParamList } from "./navigationTypes";

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export function ProjectsStackNavigator() {
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
        component={ProjectsScreen}
        name="ProjectsHome"
        options={{ title: "Проекты" }}
      />
      <Stack.Screen
        component={ProjectScreen}
        name="Project"
        options={({ route }) => ({ title: route.params.projectName })}
      />
      <Stack.Screen
        component={FileScreen}
        name="File"
        options={({ route }) => ({ title: route.params.fileName })}
      />
    </Stack.Navigator>
  );
}
