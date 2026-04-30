import type { PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
        <View style={styles.overlay}>
          <Pressable onPress={onClose} style={styles.backdrop} />
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalWidth}>
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
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalWidth: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
});
