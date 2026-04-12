import { Text, View } from "react-native";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <View className="gap-1">
      <Text className="text-2xl font-extrabold text-primary">{title}</Text>
      {subtitle ? <Text className="text-sm leading-6 text-secondary">{subtitle}</Text> : null}
    </View>
  );
}
