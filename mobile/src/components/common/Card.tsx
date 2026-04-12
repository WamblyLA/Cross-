import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function Card({ children }: PropsWithChildren) {
  return <View className="will-change-variable rounded-md border border-default bg-panel p-4">{children}</View>;
}
