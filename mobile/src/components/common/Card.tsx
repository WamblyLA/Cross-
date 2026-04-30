import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { cn } from "../../lib/utils/cn";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <View
      className={cn(
        "will-change-variable rounded-md border border-default bg-panel p-3",
        className,
      )}
    >
      {children}
    </View>
  );
}
