import { Text, View } from "react-native";
import { formatMimeLabel } from "../../features/files/notebookMime";
import { MonospaceBlock } from "../file/MonospaceBlock";

type NotebookFallbackOutputProps = {
  mimeType: string | null;
  text: string;
};

export function NotebookFallbackOutput({
  mimeType,
  text,
}: NotebookFallbackOutputProps) {
  return (
    <View className="gap-2">
      <Text className="will-change-variable text-[11px] font-bold uppercase tracking-[1.6px] text-muted">
        {formatMimeLabel(mimeType)}
      </Text>
      <MonospaceBlock compact text={text} />
    </View>
  );
}
