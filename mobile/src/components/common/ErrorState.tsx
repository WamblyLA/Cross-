import { Text, View } from "react-native";
import { AppButton } from "./AppButton";

type ErrorStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title,
  description,
  actionLabel = "Повторить",
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="will-change-variable gap-3 rounded-md border border-default bg-panel p-5">
      <Text className="text-lg font-bold text-primary">{title}</Text>
      <Text className="text-sm leading-6 text-secondary">{description}</Text>
      {onRetry ? <AppButton onPress={onRetry} title={actionLabel} variant="secondary" /> : null}
    </View>
  );
}
