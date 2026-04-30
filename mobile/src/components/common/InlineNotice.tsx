import { Text, View } from "react-native";
import { cn } from "../../lib/utils/cn";

type InlineNoticeProps = {
  tone: "info" | "success" | "error" | "warning";
  text: string;
};

export function InlineNotice({ tone, text }: InlineNoticeProps) {
  return (
    <View
      className={cn(
        "will-change-variable rounded-md border px-3 py-2",
        tone === "info"
          ? "border-default bg-active"
          : tone === "success"
            ? "border-success bg-active"
            : tone === "error"
              ? "border-error bg-active"
              : "border-warning bg-active",
      )}
    >
      <Text className="will-change-variable text-sm leading-5 text-primary">{text}</Text>
    </View>
  );
}
