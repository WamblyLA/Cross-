import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { FileScreen } from "../screens/file/FileScreen";
import { ProjectScreen } from "../screens/projects/ProjectScreen";
import { ProjectsScreen } from "../screens/projects/ProjectsScreen";
import type { ProjectsStackParamList } from "./navigationTypes";
import { useThemedStackScreenOptions } from "./useThemedStackScreenOptions";

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export function ProjectsStackNavigator() {
  const screenOptions = useThemedStackScreenOptions();

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
