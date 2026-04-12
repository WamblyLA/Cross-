import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { LoadingState } from "../components/common/LoadingState";
import { ScreenContainer } from "../components/common/ScreenContainer";
import { useSession } from "../hooks/useSession";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/utils/cn";
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
    const { themeName } = useTheme();

    return (
      <View
        className={cn(
          "theme-root will-change-variable flex-1 bg-app",
          themeName === "dark" ? "theme-dark" : "theme-light",
        )}
      >
        <StatusBar style={themeName === "dark" ? "light" : "dark"} />
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
