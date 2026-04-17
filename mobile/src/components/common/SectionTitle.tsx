import { Text, View } from "react-native";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <View className="gap-1">
      <Text className="will-change-variable text-2xl font-extrabold text-primary">{title}</Text>
      {subtitle ? <Text className="will-change-variable text-sm leading-6 text-secondary">{subtitle}</Text> : null}
    </View>
  );
}
