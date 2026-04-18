import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { LocalFilesCard } from "../../components/account/LocalFilesCard";
import { ProfileCard } from "../../components/account/ProfileCard";
import { ThemeSettingsCard } from "../../components/account/ThemeSettingsCard";
import { AppButton } from "../../components/common/AppButton";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { fetchMe } from "../../features/auth/authApi";
import { useSession } from "../../hooks/useSession";

export function AccountScreen() {
  const { user, logout, authPending } = useSession();
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

  if (meQuery.isError && !meQuery.data && !user) {
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
        {meQuery.data ? <ProfileCard user={meQuery.data} /> : null}
        <ThemeSettingsCard />
        <LocalFilesCard />
        <AppButton
          loading={authPending}
          onPress={() => void logout()}
          title="Выйти"
          variant="danger"
        />
      </View>
    </ScreenContainer>
  );
}
