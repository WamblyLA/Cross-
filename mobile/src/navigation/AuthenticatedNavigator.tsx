import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthenticatedStackParamList } from "./navigationTypes";
import { AppTabsNavigator } from "./AppTabsNavigator";
import { useThemedStackScreenOptions } from "./useThemedStackScreenOptions";

const Stack = createNativeStackNavigator<AuthenticatedStackParamList>();

export function AuthenticatedNavigator() {
  const screenOptions = useThemedStackScreenOptions();

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
