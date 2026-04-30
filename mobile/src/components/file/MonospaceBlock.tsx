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
          ? "will-change-variable rounded-md bg-editor px-3 py-2"
          : "will-change-variable rounded-md bg-editor px-3 py-2.5"
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text className="will-change-variable font-mono text-sm leading-5 text-primary">{text || " "}</Text>
      </ScrollView>
    </View>
  );
}
