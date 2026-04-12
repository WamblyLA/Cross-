import { Text, TextInput, View } from "react-native";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { cn } from "../../lib/utils/cn";

type AppTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  multiline?: boolean;
  editable?: boolean;
  error?: string | null;
};

export function AppTextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "sentences",
  keyboardType = "default",
  multiline = false,
  editable = true,
  error,
}: AppTextFieldProps) {
  const placeholderTextColor = useThemeVariable("--text-muted", "#8ea28f");

  return (
    <View className="gap-2">
      <Text className="text-sm text-secondary">{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        className={cn(
          "will-change-variable min-h-11 rounded-md border border-default bg-input px-3 py-3 text-sm text-primary",
          multiline ? "min-h-36" : "",
          error ? "border-error" : "",
        )}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        secureTextEntry={secureTextEntry}
        style={multiline ? { textAlignVertical: "top" } : undefined}
        value={value}
      />
      {error ? <Text className="text-xs text-error">{error}</Text> : null}
    </View>
  );
}
