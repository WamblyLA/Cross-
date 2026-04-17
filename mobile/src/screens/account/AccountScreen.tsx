import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { AppButton } from "../../components/common/AppButton";
import { Card } from "../../components/common/Card";
import { ErrorState } from "../../components/common/ErrorState";
import { InlineNotice } from "../../components/common/InlineNotice";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { fetchMe } from "../../features/auth/authApi";
import { useSession } from "../../hooks/useSession";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils/cn";

export function AccountScreen() {
  const { user, logout, authPending } = useSession();
  const {
    themeName,
    applyTheme,
    isThemeSyncPending,
    themeError,
    clearThemeError,
  } = useTheme();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await fetchMe();
      return response.user;
    },
    initialData: user ?? undefined,
  });

  if (meQuery.isLoading && !meQuery.data) {
    return (
      <ScreenContainer>
        <LoadingState message="Загружаем профиль..." />
      </ScreenContainer>
    );
  }

  if (meQuery.isError && !meQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState
          description="Не удалось загрузить данные аккаунта."
          onRetry={() => void meQuery.refetch()}
          title="Профиль недоступен"
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View className="gap-5">
        <SectionTitle title="Аккаунт" />

        {meQuery.data ? (
          <Card>
            <View className="gap-4">
              <View className="gap-1">
                <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
                  Профиль
                </Text>
              </View>

              <View className="gap-1">
                <Text className="will-change-variable text-xs font-bold text-secondary">Имя пользователя</Text>
                <Text className="will-change-variable text-sm font-bold text-primary">{meQuery.data.username}</Text>
              </View>

              <View className="gap-1">
                <Text className="will-change-variable text-xs font-bold text-secondary">Email</Text>
                <Text className="will-change-variable text-sm font-bold text-primary">{meQuery.data.email}</Text>
              </View>

              <View className="gap-1">
                <Text className="will-change-variable text-xs font-bold text-secondary">ID</Text>
                <Text selectable className="will-change-variable text-xs text-secondary">
                  {meQuery.data.id}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

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

        <AppButton
          loading={authPending || isThemeSyncPending}
          onPress={() => void logout()}
          title="Выйти"
          variant="danger"
        />
      </View>
    </ScreenContainer>
  );
}
