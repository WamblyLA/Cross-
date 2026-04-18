import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "../../lib/utils/cn";
import { AppButton } from "../common/AppButton";
import { Card } from "../common/Card";

type ProjectActionMenuItem = {
  key: string;
  label: string;
  tone?: "default" | "danger";
  onPress: () => void;
};

type ProjectActionMenuDialogProps = {
  visible: boolean;
  title: string;
  items: ProjectActionMenuItem[];
  onClose: () => void;
};

export function ProjectActionMenuDialog({
  visible,
  title,
  items,
  onClose,
}: ProjectActionMenuDialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <Pressable className="absolute inset-0" onPress={onClose} />
          <View className="w-full max-w-[420px]">
            <Card>
              <View className="gap-4">
                <Text className="will-change-variable text-lg font-extrabold text-primary">{title}</Text>
                <View className="gap-2">
                  {items.map((item) => (
                    <Pressable
                      className={cn(
                        "will-change-variable min-h-11 rounded-md border px-3 py-3 active:bg-hover",
                        item.tone === "danger" ? "border-error" : "border-default",
                      )}
                      key={item.key}
                      onPress={() => {
                        onClose();
                        item.onPress();
                      }}
                    >
                      <Text
                        className={cn(
                          "will-change-variable text-sm font-bold",
                          item.tone === "danger" ? "text-error" : "text-primary",
                        )}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <AppButton onPress={onClose} title="Закрыть" variant="ghost" />
              </View>
            </Card>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
