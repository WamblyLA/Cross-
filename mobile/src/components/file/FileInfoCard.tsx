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
      <View className="gap-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="will-change-variable text-base font-extrabold text-primary" numberOfLines={2}>
              {fileName}
            </Text>
            <Text className="will-change-variable text-xs text-secondary">{statusText}</Text>
          </View>

          <View className="shrink-0">
            <Badge text={badgeText} tone={badgeTone} />
          </View>
        </View>

        {(primaryAction || secondaryAction) ? (
          <View className="flex-row gap-2">
            {primaryAction ? (
              <View className="flex-1">
                <AppButton
                  disabled={primaryAction.disabled}
                  loading={primaryAction.loading}
                  onPress={primaryAction.onPress}
                  title={primaryAction.label}
                  variant={primaryAction.variant}
                />
              </View>
            ) : null}
            {secondaryAction ? (
              <View className="flex-1">
                <AppButton
                  disabled={secondaryAction.disabled}
                  loading={secondaryAction.loading}
                  onPress={secondaryAction.onPress}
                  title={secondaryAction.label}
                  variant={secondaryAction.variant ?? "secondary"}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
