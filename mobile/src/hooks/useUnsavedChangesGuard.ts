import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

type UseUnsavedChangesGuardOptions = {
  navigation: NavigationProp<ParamListBase>;
  enabled: boolean;
  isSaving: boolean;
  onSave: () => Promise<boolean>;
};

export function useUnsavedChangesGuard({
  navigation,
  enabled,
  isSaving,
  onSave,
}: UseUnsavedChangesGuardOptions) {
  const bypassRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (bypassRef.current || !enabled) {
        return;
      }

      event.preventDefault();

      if (isSaving) {
        Alert.alert(
          "Сохранение не завершено",
          "Подождите, пока файл сохранится, и попробуйте снова.",
        );
        return;
      }

      Alert.alert(
        "Есть несохранённые изменения",
        "Сохранить файл перед выходом?",
        [
          {
            text: "Остаться",
            style: "cancel",
          },
          {
            text: "Не сохранять",
            style: "destructive",
            onPress: () => {
              bypassRef.current = true;
              navigation.dispatch(event.data.action);
              setTimeout(() => {
                bypassRef.current = false;
              }, 0);
            },
          },
          {
            text: "Сохранить",
            onPress: () => {
              void onSave().then((didSave) => {
                if (!didSave) {
                  return;
                }

                bypassRef.current = true;
                navigation.dispatch(event.data.action);
                setTimeout(() => {
                  bypassRef.current = false;
                }, 0);
              });
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [enabled, isSaving, navigation, onSave]);
}
