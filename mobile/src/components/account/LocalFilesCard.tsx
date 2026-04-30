import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { openPickedLocalFileFlow } from "../../features/localFiles/localFileCoordinator";
import { AppButton } from "../common/AppButton";
import { Card } from "../common/Card";
import { InlineNotice } from "../common/InlineNotice";

export function LocalFilesCard() {
  const [isOpeningLocalFile, setIsOpeningLocalFile] = useState(false);
  const [localFileNotice, setLocalFileNotice] = useState<string | null>(null);

  if (Platform.OS !== "android") {
    return null;
  }

  const handleOpenLocalFile = async () => {
    setLocalFileNotice(null);
    setIsOpeningLocalFile(true);

    try {
      const result = await openPickedLocalFileFlow();

      if (result.status === "error") {
        setLocalFileNotice(result.message);
      }
    } finally {
      setIsOpeningLocalFile(false);
    }
  };

  return (
    <Card>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
            Локальные файлы
          </Text>
        </View>

        <AppButton
          loading={isOpeningLocalFile}
          onPress={() => {
            void handleOpenLocalFile();
          }}
          title="Открыть файл"
          variant="secondary"
        />

        {localFileNotice ? <InlineNotice text={localFileNotice} tone="warning" /> : null}
      </View>
    </Card>
  );
}
