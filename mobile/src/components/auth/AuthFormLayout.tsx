import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils/cn";

type AuthFormLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  footer: ReactNode;
}>;

export function AuthFormLayout({
  title,
  subtitle,
  footer,
  children,
}: AuthFormLayoutProps) {
  const { themeName } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <View
        className={cn(
          "theme-root will-change-variable flex-1 bg-app",
          themeName === "dark" ? "theme-dark" : "theme-light",
        )}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <View className="min-h-full justify-center px-4 py-6">
              <View className="will-change-variable overflow-hidden rounded-md border border-default bg-panel">
                <View className="will-change-variable gap-3 border-b border-default bg-active px-6 py-6">
                  <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.8px] text-muted">
                    Авторизация через облако
                  </Text>
                  <Text className="will-change-variable text-3xl font-extrabold text-primary">{title}</Text>
                  <Text className="will-change-variable text-sm leading-6 text-secondary">{subtitle}</Text>
                </View>

                <View className="gap-4 px-6 py-6">{children}</View>
              </View>

              <View className="mt-5 items-center">{footer}</View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
