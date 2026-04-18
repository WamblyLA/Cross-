import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
