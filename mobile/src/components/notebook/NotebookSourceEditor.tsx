import { TextInput } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { useThemeVariable } from "../../hooks/useThemeVariable";

type NotebookSourceEditorProps = {
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  placeholder: string;
};

export function NotebookSourceEditor({
  value,
  onChangeText,
  editable,
  placeholder,
}: NotebookSourceEditorProps) {
  const placeholderTextColor = useThemeVariable("--text-muted", "#8ea28f");
  const { visualSettings } = useTheme();
  const fontSize = visualSettings.fontSize;

  return (
    <TextInput
      className="will-change-variable min-h-24 rounded-md border border-default bg-input px-3 py-2.5 text-sm leading-6 text-primary"
      editable={editable}
      multiline
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      scrollEnabled={false}
      style={{ fontSize, lineHeight: Math.round(fontSize * 1.6) }}
      textAlignVertical="top"
      value={value}
    />
  );
}
