import { Text, View } from "react-native";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="will-change-variable gap-2 rounded-md border border-default bg-panel p-5">
      <Text className="will-change-variable text-lg font-bold text-primary">{title}</Text>
      <Text className="will-change-variable text-sm leading-6 text-secondary">{description}</Text>
    </View>
  );
}
