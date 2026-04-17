import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils/cn";

type ScreenContainerProps = PropsWithChildren<{
  scrollable?: boolean;
  footer?: ReactNode;
}>;

export function ScreenContainer({
  children,
  scrollable = false,
  footer,
}: ScreenContainerProps) {
  const { themeName } = useTheme();

  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 p-4">{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <View
        className={cn(
          "theme-root will-change-variable flex-1 bg-app",
          themeName === "dark" ? "theme-dark" : "theme-light",
        )}
      >
        {content}
        {footer ? <View className="will-change-variable bg-app px-4 pb-4">{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}
