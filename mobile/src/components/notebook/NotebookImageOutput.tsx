import { Image, View } from "react-native";
import { formatMimeLabel, isNotebookImageMimeType } from "../../features/files/notebookMime";
import { MonospaceBlock } from "../file/MonospaceBlock";

type NotebookImageOutputProps = {
  mimeType: string | null;
  text: string;
};

export function NotebookImageOutput({
  mimeType,
  text,
}: NotebookImageOutputProps) {
  if (!isNotebookImageMimeType(mimeType) || !text.trim()) {
    return <MonospaceBlock compact text={text} />;
  }

  return (
    <View className="will-change-variable overflow-hidden rounded-lg border border-default bg-input">
      <Image
        resizeMode="contain"
        source={{ uri: `data:${mimeType};base64,${text}` }}
        style={{ width: "100%", height: 240 }}
        accessibilityLabel={`Вывод notebook (${formatMimeLabel(mimeType)})`}
      />
    </View>
  );
}
