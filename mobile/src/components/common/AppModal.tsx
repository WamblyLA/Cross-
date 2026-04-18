import type { PropsWithChildren } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "./AppButton";
import { Card } from "./Card";

type AppModalProps = PropsWithChildren<{
  visible: boolean;
  title: string;
  description?: string | null;
  confirmLabel: string;
  confirmVariant?: "primary" | "secondary" | "danger" | "ghost";
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}>;

export function AppModal({
  visible,
  title,
  description = null,
  confirmLabel,
  confirmVariant = "primary",
  confirmDisabled = false,
  confirmLoading = false,
  onConfirm,
  onClose,
  children,
}: AppModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          <Pressable className="absolute inset-0" onPress={onClose} />
          <View className="w-full max-w-[420px]">
            <Card>
              <View className="gap-4">
                <View className="gap-1">
                  <Text className="will-change-variable text-lg font-extrabold text-primary">{title}</Text>
                  {description ? (
                    <Text className="will-change-variable text-sm leading-6 text-secondary">{description}</Text>
                  ) : null}
                </View>

                {children}

                <View className="gap-3">
                  <AppButton
                    disabled={confirmDisabled}
                    loading={confirmLoading}
                    onPress={onConfirm}
                    title={confirmLabel}
                    variant={confirmVariant}
                  />
                  <AppButton onPress={onClose} title="Отмена" variant="ghost" />
                </View>
              </View>
            </Card>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
