import { ActivityIndicator, Text, View } from "react-native";
import { useThemeVariable } from "../../hooks/useThemeVariable";

type LoadingStateProps = {
  message: string;
};

export function LoadingState({ message }: LoadingStateProps) {
  const tintColor = useThemeVariable("--accent", "#316e43");

  return (
    <View className="flex-1 items-center justify-center gap-3 px-5">
      <ActivityIndicator color={tintColor} size="large" />
      <Text className="text-center text-sm text-secondary">{message}</Text>
    </View>
  );
}
