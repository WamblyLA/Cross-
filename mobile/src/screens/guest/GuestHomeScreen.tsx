import { View } from "react-native";
import { BugReportCard } from "../../components/account/BugReportCard";
import { AuthActionsCard } from "../../components/account/AuthActionsCard";
import { LocalFilesCard } from "../../components/account/LocalFilesCard";
import { ThemeSettingsCard } from "../../components/account/ThemeSettingsCard";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";

export function GuestHomeScreen() {
  return (
    <ScreenContainer scrollable>
      <View className="gap-5">
        <SectionTitle
          subtitle="Откройте локальный файл без входа или войдите в аккаунт, чтобы работать с проектами."
          title="CROSS++"
        />
        <ThemeSettingsCard />
        <BugReportCard />
        <LocalFilesCard />
        <AuthActionsCard />
      </View>
    </ScreenContainer>
  );
}
