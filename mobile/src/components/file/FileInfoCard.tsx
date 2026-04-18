import { Text, View } from "react-native";
import { AppButton } from "../common/AppButton";
import { Badge } from "../common/Badge";
import { Card } from "../common/Card";

type FileInfoAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

type FileInfoCardProps = {
  fileName: string;
  statusText: string;
  badgeText: string;
  badgeTone?: "primary" | "muted";
  primaryAction?: FileInfoAction | null;
  secondaryAction?: FileInfoAction | null;
};

export function FileInfoCard({
  fileName,
  statusText,
  badgeText,
  badgeTone = "muted",
  primaryAction = null,
  secondaryAction = null,
}: FileInfoCardProps) {
  return (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="will-change-variable text-lg font-extrabold text-primary">
            {fileName}
          </Text>
          <Text className="will-change-variable text-xs text-secondary">{statusText}</Text>
        </View>
        <Badge text={badgeText} tone={badgeTone} />
      </View>

      {primaryAction || secondaryAction ? (
        <View className="gap-3">
          {primaryAction ? (
            <AppButton
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              onPress={primaryAction.onPress}
              title={primaryAction.label}
              variant={primaryAction.variant}
            />
          ) : null}
          {secondaryAction ? (
            <AppButton
              disabled={secondaryAction.disabled}
              loading={secondaryAction.loading}
              onPress={secondaryAction.onPress}
              title={secondaryAction.label}
              variant={secondaryAction.variant ?? "secondary"}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
