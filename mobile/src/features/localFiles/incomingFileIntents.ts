import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import type { IncomingLocalFileIntent } from "./localFileTypes";

type IncomingFileIntentsModuleShape = {
  getInitialIncomingFileIntentAsync(): Promise<IncomingLocalFileIntent | null>;
  addListener(
    eventName: "onIncomingFileIntent",
    listener: (intent: IncomingLocalFileIntent) => void,
  ): { remove(): void };
};

const incomingFileIntentsModule =
  Platform.OS === "android"
    ? requireOptionalNativeModule<IncomingFileIntentsModuleShape>("IncomingFileIntents")
    : null;

export async function getInitialIncomingFileIntentAsync() {
  if (!incomingFileIntentsModule) {
    return null;
  }

  return incomingFileIntentsModule.getInitialIncomingFileIntentAsync();
}

export function addIncomingFileIntentListener(
  listener: (intent: IncomingLocalFileIntent) => void,
) {
  if (!incomingFileIntentsModule) {
    return () => undefined;
  }

  const subscription = incomingFileIntentsModule.addListener("onIncomingFileIntent", listener);

  return () => {
    subscription.remove();
  };
}
