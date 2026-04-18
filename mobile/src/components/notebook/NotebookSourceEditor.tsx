import { TextInput } from "react-native";
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

  return (
    <TextInput
      className="will-change-variable min-h-32 rounded-md border border-default bg-input p-3 text-sm leading-6 text-primary"
      editable={editable}
      multiline
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      scrollEnabled={false}
      textAlignVertical="top"
      value={value}
    />
  );
}
