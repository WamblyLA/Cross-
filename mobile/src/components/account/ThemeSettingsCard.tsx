import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils/cn";
import { Card } from "../common/Card";
import { InlineNotice } from "../common/InlineNotice";

export function ThemeSettingsCard() {
  const {
    themeName,
    applyTheme,
    isThemeSyncPending,
    themeError,
    clearThemeError,
  } = useTheme();

  return (
    <Card>
      <View className="gap-4">
        <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
          Тема
        </Text>

        <View className="will-change-variable flex-row gap-2 rounded-md border border-default bg-editor p-1">
          <Pressable
            className={cn(
              "will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border px-3",
              themeName === "dark"
                ? "border-default bg-active"
                : "border-transparent bg-transparent",
            )}
            disabled={isThemeSyncPending}
            onPress={() => {
              void applyTheme("dark");
            }}
          >
            <Text
              className={cn(
                "will-change-variable text-xs font-bold uppercase tracking-[2px]",
                themeName === "dark" ? "text-primary" : "text-secondary",
              )}
            >
              Тёмная
            </Text>
          </Pressable>

          <Pressable
            className={cn(
              "will-change-variable min-h-10 flex-1 items-center justify-center rounded-sm border px-3",
              themeName === "light"
                ? "border-default bg-active"
                : "border-transparent bg-transparent",
            )}
            disabled={isThemeSyncPending}
            onPress={() => {
              void applyTheme("light");
            }}
          >
            <Text
              className={cn(
                "will-change-variable text-xs font-bold uppercase tracking-[2px]",
                themeName === "light" ? "text-primary" : "text-secondary",
              )}
            >
              Светлая
            </Text>
          </Pressable>
        </View>

        {themeError ? (
          <Pressable onPress={clearThemeError}>
            <InlineNotice text={themeError} tone="warning" />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
