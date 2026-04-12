import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useThemeVariable } from "../hooks/useThemeVariable";
import { FileScreen } from "../screens/file/FileScreen";
import { ProjectScreen } from "../screens/projects/ProjectScreen";
import { ProjectsScreen } from "../screens/projects/ProjectsScreen";
import type { ProjectsStackParamList } from "./navigationTypes";

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export function ProjectsStackNavigator() {
  const background = useThemeVariable("--bg-app", "#0a0f0b");
  const text = useThemeVariable("--text-primary", "#edf5ee");

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: background },
        headerStyle: { backgroundColor: background },
        headerTintColor: text,
        headerTitleStyle: { color: text },
      }}
    >
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
