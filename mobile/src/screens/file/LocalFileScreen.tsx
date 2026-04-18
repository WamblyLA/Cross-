import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState } from "../../components/common/ErrorState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import type { FileDocumentNotice } from "../../components/file/FileDocumentView";
import { FileDocumentView } from "../../components/file/FileDocumentView";
import { saveLocalFile, saveLocalFileAs } from "../../features/localFiles/localFileSaveService";
import {
  getLocalOpenedFile,
  removeLocalOpenedFile,
  updateLocalOpenedFile,
} from "../../features/localFiles/localFileSession";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import type { RootStackParamList } from "../../navigation/navigationTypes";

type LocalFileScreenProps = NativeStackScreenProps<RootStackParamList, "LocalFile">;

export function LocalFileScreen({ navigation, route }: LocalFileScreenProps) {
  const sessionFile = getLocalOpenedFile(route.params.localFileId);
  const [fileSnapshot, setFileSnapshot] = useState(sessionFile);
  const [draft, setDraft] = useState(sessionFile?.content ?? "");
  const [savedBaseline, setSavedBaseline] = useState(sessionFile?.content ?? "");
  const [notice, setNotice] = useState<FileDocumentNotice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!sessionFile) {
      return;
    }

    setFileSnapshot(sessionFile);
    setDraft(sessionFile.content);
    setSavedBaseline(sessionFile.content);
  }, [sessionFile?.id]);

  useEffect(() => {
    const localFileId = route.params.localFileId;

    return () => {
      removeLocalOpenedFile(localFileId);
    };
  }, [route.params.localFileId]);

  const currentFile = fileSnapshot;
  const isDirty = draft !== savedBaseline;

  const applySaveSuccess = useCallback(
    (
      message: string,
      patch: Partial<Omit<NonNullable<typeof currentFile>, "id">> = {},
    ) => {
      if (!currentFile) {
        return;
      }

      const nextFile = updateLocalOpenedFile(currentFile.id, {
        ...patch,
        content: draft,
      });

      if (!nextFile) {
        return;
      }

      setFileSnapshot(nextFile);
      setSavedBaseline(draft);
      setNotice({ tone: "success", text: message });
      navigation.setOptions({ title: nextFile.fileName });
    },
    [currentFile, draft, navigation],
  );

  const runSaveAs = useCallback(async () => {
    if (!currentFile) {
      return false;
    }

    setIsSaving(true);

    try {
      const result = await saveLocalFileAs(currentFile, draft);

      if (result.status === "cancelled") {
        return false;
      }

      if (result.status !== "success") {
        setNotice({ tone: "error", text: result.message });
        return false;
      }

      applySaveSuccess(result.message, result.patch);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [applySaveSuccess, currentFile, draft]);

  const handleSave = useCallback(async () => {
    if (!currentFile) {
      return false;
    }

    if (!currentFile.editable) {
      setNotice({
        tone: "info",
        text: "Этот локальный файл открыт только для просмотра.",
      });
      return false;
    }

    if (!isDirty) {
      return true;
    }

    if (currentFile.saveStrategy === "save-as-required") {
      return runSaveAs();
    }

    setIsSaving(true);

    try {
      const result = await saveLocalFile(currentFile, draft);

      if (result.status === "save-as-required") {
        setNotice({ tone: "info", text: result.message });
        return runSaveAs();
      }

      if (result.status === "error") {
        setNotice({ tone: "error", text: result.message });
        return false;
      }

      if (result.status === "cancelled") {
        return false;
      }

      applySaveSuccess(result.message, result.patch);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [applySaveSuccess, currentFile, draft, isDirty, runSaveAs]);

  useUnsavedChangesGuard({
    navigation,
    enabled: Boolean(currentFile?.editable && isDirty),
    isSaving,
    onSave: handleSave,
  });

  if (!currentFile) {
    return (
      <ScreenContainer>
        <ErrorState
          actionLabel="Назад"
          description="Выбранный локальный файл больше недоступен. Откройте его снова через системный выбор файла."
          onRetry={() => {
            navigation.goBack();
          }}
          title="Не удалось открыть локальный файл"
        />
      </ScreenContainer>
    );
  }

  const readOnlyReason =
    currentFile.kind === "notebook"
      ? "Notebook открыт только для просмотра в мобильном приложении."
      : null;

  const statusText = isDirty
    ? "Есть несохранённые локальные изменения."
    : currentFile.saveStrategy === "save-as-required"
      ? "Изменения сохраняются через «Сохранить как»."
      : currentFile.sourceKind === "external-intent"
        ? "Открыт из другого Android-приложения."
        : currentFile.sourceKind === "save-as"
          ? "Сохранён как локальная копия."
          : "Открыт через системный выбор файла.";

  const canShowSaveActions = currentFile.editable;

  return (
    <ScreenContainer>
      <FileDocumentView
        editable={currentFile.editable}
        fileName={currentFile.fileName}
        fileInfo={{
          statusText,
          badgeText: "Локальный",
          badgeTone: isDirty ? "primary" : "muted",
          primaryAction: canShowSaveActions
            ? {
                label:
                  currentFile.saveStrategy === "save-as-required"
                    ? "Сохранить как"
                    : "Сохранить",
                disabled: !isDirty,
                loading: isSaving,
                onPress: () => {
                  void handleSave();
                },
              }
            : null,
          secondaryAction:
            canShowSaveActions && currentFile.saveStrategy === "direct-source"
              ? {
                  label: "Сохранить как",
                  loading: isSaving,
                  onPress: () => {
                    void runSaveAs();
                  },
                  variant: "secondary",
                }
              : null,
        }}
        kind={currentFile.kind}
        notice={notice}
        onChangeText={(value) => {
          setNotice(null);
          setDraft(value);
        }}
        readOnlyReason={readOnlyReason}
        value={draft}
      />
    </ScreenContainer>
  );
}
