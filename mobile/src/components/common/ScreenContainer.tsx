import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenContainerProps = PropsWithChildren<{
  scrollable?: boolean;
  footer?: ReactNode;
}>;

export function ScreenContainer({
  children,
  scrollable = false,
  footer,
}: ScreenContainerProps) {
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
      <View className="flex-1 bg-app">
        {content}
        {footer ? <View className="bg-app px-4 pb-4">{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}
