import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./navigationTypes";

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToLocalFile(params: RootStackParamList["LocalFile"]) {
  if (!rootNavigationRef.isReady()) {
    throw new Error("Root navigation is not ready");
  }

  rootNavigationRef.navigate("LocalFile", params);
}
