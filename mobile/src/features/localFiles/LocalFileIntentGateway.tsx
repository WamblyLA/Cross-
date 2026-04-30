import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { addIncomingFileIntentListener, getInitialIncomingFileIntentAsync } from "./incomingFileIntents";
import { openIncomingLocalFileIntent } from "./localFileCoordinator";
import type { IncomingLocalFileIntent } from "./localFileTypes";

type LocalFileIntentGatewayProps = {
  enabled: boolean;
};

function getIntentSignature(intent: IncomingLocalFileIntent) {
  return `${intent.action}|${intent.uri}|${intent.workingUri}|${intent.fileName ?? ""}`;
}

export function LocalFileIntentGateway({ enabled }: LocalFileIntentGatewayProps) {
  const lastHandledIntentRef = useRef<{ signature: string; timestamp: number } | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") {
      return;
    }

    let isActive = true;

    const handleIntent = async (intent: IncomingLocalFileIntent) => {
      const signature = getIntentSignature(intent);
      const now = Date.now();

      if (
        lastHandledIntentRef.current &&
        lastHandledIntentRef.current.signature === signature &&
        now - lastHandledIntentRef.current.timestamp < 1500
      ) {
        return;
      }

      lastHandledIntentRef.current = { signature, timestamp: now };

      const result = await openIncomingLocalFileIntent(intent);

      if (!isActive || result.status !== "error") {
        return;
      }

      Alert.alert("Не удалось открыть файл", result.message);
    };

    void getInitialIncomingFileIntentAsync().then((intent) => {
      if (!intent || !isActive) {
        return;
      }

      void handleIntent(intent);
    });

    const unsubscribe = addIncomingFileIntentListener((intent) => {
      void handleIntent(intent);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [enabled]);

  return null;
}
