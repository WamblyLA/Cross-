import { Text, View } from "react-native";
import { Card } from "../common/Card";
import { MonospaceBlock } from "../file/MonospaceBlock";

type NotebookRawFallbackProps = {
  content: string;
  reason: string;
};

export function NotebookRawFallback({
  content,
  reason,
}: NotebookRawFallbackProps) {
  return (
    <View className="flex-1">
      <Card>
        <Text className="text-lg font-extrabold text-primary">
          Notebook отображается в упрощённом режиме
        </Text>
        <Text className="text-sm leading-6 text-secondary">{reason}</Text>
        <MonospaceBlock text={content} />
      </Card>
    </View>
  );
}
