import { TextInput } from "react-native";
import { useTheme } from "../../hooks/useTheme";
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
  const { visualSettings } = useTheme();
  const fontSize = visualSettings.fontSize;

  return (
    <TextInput
      className="will-change-variable flex-1 min-h-48 rounded-md border border-default bg-input px-3 py-2.5 font-mono text-sm leading-6 text-primary"
      editable={editable}
      multiline
      onChangeText={onChangeText}
      placeholder="Файл пуст"
      placeholderTextColor={placeholderTextColor}
      scrollEnabled
      style={{ fontSize, lineHeight: Math.round(fontSize * 1.6) }}
      textAlignVertical="top"
      value={value}
    />
  );
}
