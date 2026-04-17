import { ScrollView, Text, View } from "react-native";

type MonospaceBlockProps = {
  text: string;
  compact?: boolean;
};

export function MonospaceBlock({ text, compact = false }: MonospaceBlockProps) {
  return (
    <View
      className={
        compact
          ? "will-change-variable rounded-lg bg-editor px-4 py-3"
          : "will-change-variable rounded-lg bg-editor p-4"
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text className="will-change-variable font-mono text-sm leading-6 text-primary">{text || " "}</Text>
      </ScrollView>
    </View>
  );
}
