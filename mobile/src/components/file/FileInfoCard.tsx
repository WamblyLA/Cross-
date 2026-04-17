import { Text, View } from "react-native";
import { AppButton } from "../common/AppButton";
import { Badge } from "../common/Badge";
import { Card } from "../common/Card";

type FileInfoCardProps = {
  fileName: string;
  isDirty: boolean;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
  onReload: () => void;
  showSaveAction: boolean;
};

export function FileInfoCard({
  fileName,
  isDirty,
  isSaving,
  canSave,
  onSave,
  onReload,
  showSaveAction,
}: FileInfoCardProps) {
  return (
    <Card>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="will-change-variable text-lg font-extrabold text-primary">{fileName}</Text>
          <Text className="will-change-variable text-xs text-secondary">
            {isDirty ? "Есть несохранённые изменения" : "Изменений нет"}
          </Text>
        </View>
        <Badge text={isDirty ? "Черновик" : "Синхронизирован"} tone={isDirty ? "primary" : "muted"} />
      </View>

      <View className="gap-3">
        {showSaveAction ? (
          <AppButton
            disabled={!canSave}
            loading={isSaving}
            onPress={onSave}
            title="Сохранить"
          />
        ) : null}
        <AppButton onPress={onReload} title="Обновить с сервера" variant="secondary" />
      </View>
    </Card>
  );
}
