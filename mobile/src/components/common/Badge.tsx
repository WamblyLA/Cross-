import { Text, View } from "react-native";
import { cn } from "../../lib/utils/cn";

type BadgeProps = {
  text: string;
  tone?: "primary" | "muted";
};

export function Badge({ text, tone = "muted" }: BadgeProps) {
  return (
    <View
      className={cn(
        "will-change-variable self-start rounded-full border px-2 py-1",
        tone === "primary" ? "border-default bg-selection" : "border-default bg-active",
      )}
    >
      <Text className={cn("will-change-variable text-xs font-bold", tone === "primary" ? "text-primary" : "text-secondary")}>
        {text}
      </Text>
    </View>
  );
}
