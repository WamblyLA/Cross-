import { TextInput } from "react-native";
import { useThemeVariable } from "../../hooks/useThemeVariable";

type TextFileEditorProps = {
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
};

export function TextFileEditor({
  value,
  onChangeText,
  editable,
}: TextFileEditorProps) {
  const placeholderTextColor = useThemeVariable("--text-muted", "#8ea28f");

  return (
    <TextInput
      className="will-change-variable flex-1 min-h-56 rounded-lg border border-default bg-input p-4 font-mono text-sm leading-6 text-primary"
      editable={editable}
      multiline
      onChangeText={onChangeText}
      placeholder="Файл пуст"
      placeholderTextColor={placeholderTextColor}
      scrollEnabled
      textAlignVertical="top"
      value={value}
    />
  );
}
