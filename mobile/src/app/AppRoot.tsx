import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { LoadingState } from "../components/common/LoadingState";
import { ScreenContainer } from "../components/common/ScreenContainer";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";
import { RootNavigator } from "../navigation/RootNavigator";
import { AppProviders } from "./AppProviders";

function AppContent() {
  const { sessionStatus } = useSession();
  const { isThemeReady } = useTheme();

  if (!isThemeReady || sessionStatus === "idle" || sessionStatus === "checking") {
    return (
      <ScreenContainer>
        <LoadingState message="Подготавливаем приложение..." />
      </ScreenContainer>
    );
  }

  return <RootNavigator />;
}

export function AppRoot() {
  function RootShell() {
    const { colorScheme } = useTheme();

    return (
      <View className="flex-1 bg-app">
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <AppContent />
      </View>
    );
  }

  return (
    <AppProviders>
      <RootShell />
    </AppProviders>
  );
}
