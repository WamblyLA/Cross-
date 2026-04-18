import { Pressable, Text } from "react-native";
import { cn } from "../../lib/utils/cn";

type NotebookCellActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

export function NotebookCellActionButton({
  label,
  onPress,
  disabled = false,
  tone = "default",
}: NotebookCellActionButtonProps) {
  return (
    <Pressable
      className={cn(
        "will-change-variable min-h-9 rounded-md border px-3 py-2",
        tone === "danger" ? "border-error bg-transparent" : "border-default bg-transparent",
        disabled ? "opacity-50" : "active:bg-hover",
      )}
      disabled={disabled}
      onPress={onPress}
    >
      <Text
        className={cn(
          "will-change-variable text-xs font-bold",
          tone === "danger" ? "text-error" : "text-secondary",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
