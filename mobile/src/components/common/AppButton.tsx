import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { cn } from "../../lib/utils/cn";

type AppButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  leftIcon?: ReactNode;
};

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  leftIcon,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = useThemeVariable(
    variant === "secondary" || variant === "ghost" ? "--text-secondary" : "--text-inverse",
    variant === "secondary" || variant === "ghost" ? "#c5d5c7" : "#f6fbf7",
  );

  const variantClassName =
    variant === "primary"
      ? "border-accent bg-accent"
      : variant === "secondary"
        ? "border-default bg-panel"
        : variant === "danger"
          ? "border-error bg-error"
          : "border-default bg-transparent";

  const textClassName =
    variant === "primary" || variant === "danger" ? "text-inverse" : "text-secondary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      className={cn(
        "will-change-variable min-h-11 flex-row items-center justify-center rounded-md border px-4",
        variantClassName,
        isDisabled ? "opacity-60" : "active:translate-y-px",
      )}
    >
      <View className="flex-row items-center justify-center gap-2">
        {loading ? <ActivityIndicator color={spinnerColor} size="small" /> : leftIcon}
        <Text className={cn("will-change-variable text-sm font-bold", textClassName)}>{title}</Text>
      </View>
    </Pressable>
  );
}
