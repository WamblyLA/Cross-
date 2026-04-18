import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { FileDocumentView } from "../../components/file/FileDocumentView";
import * as filesApi from "../../features/files/filesApi";
import { fileQueryKeys, useProjectFileQuery } from "../../features/files/filesHooks";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import { getFileLoadErrorMessage, getFileSaveErrorMessage } from "../../lib/errors/fileMessages";
import { getFileKind } from "../../lib/utils/file";
import type { ProjectsStackParamList } from "../../navigation/navigationTypes";
import type { ApiError } from "../../types/api";

type FileScreenProps = NativeStackScreenProps<ProjectsStackParamList, "File">;
type NoticeState =
  | { tone: "success" | "error" | "info" | "warning"; text: string }
  | null;

export function FileScreen({ navigation, route }: FileScreenProps) {
  const { projectId, fileId, fileName } = route.params;
  const queryClient = useQueryClient();
  const fileQuery = useProjectFileQuery(projectId, fileId);
  const [draft, setDraft] = useState("");
  const [serverContent, setServerContent] = useState("");
  const [serverVersion, setServerVersion] = useState(0);
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    const file = fileQuery.data;

    if (!file) {
      return;
    }

    setDraft(file.content);
    setServerContent(file.content);
    setServerVersion(file.version);
    setNotice(null);
  }, [fileQuery.data?.content, fileQuery.data?.id, fileQuery.data?.version, fileQuery.data?.canWrite]);

  const kind = useMemo(() => getFileKind(fileName), [fileName]);
  const canWrite = fileQuery.data?.canWrite ?? false;
  const canEdit = canWrite && kind !== "notebook";
  const isDirty = draft !== serverContent;

  const saveMutation = useMutation<
    Awaited<ReturnType<typeof filesApi.updateProjectFile>>,
    ApiError,
    void
  >({
    mutationFn: async () => {
      return filesApi.updateProjectFile(projectId, fileId, {
        content: draft,
        expectedVersion: serverVersion,
      });
    },
    onSuccess: (response) => {
      const nextFile = response.file;

      queryClient.setQueryData(fileQueryKeys.detail(projectId, fileId), nextFile);
      setDraft(nextFile.content);
      setServerContent(nextFile.content);
      setServerVersion(nextFile.version);
      setNotice({
        tone: "success",
        text: "Файл сохранён.",
      });
    },
    onError: (error) => {
      setNotice({
        tone: "error",
        text: getFileSaveErrorMessage(error),
      });
    },
  });

  const handleSave = useCallback(async () => {
    if (!canEdit) {
      setNotice({
        tone: "info",
        text: "Недостаточно прав для редактирования.",
      });
      return false;
    }

    if (!isDirty) {
      return true;
    }

    try {
      await saveMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [canEdit, isDirty, saveMutation]);

  const handleReload = () => {
    if (isDirty) {
      Alert.alert(
        "Обновить файл",
        "Локальные несохранённые изменения будут потеряны. Продолжить?",
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Обновить",
            style: "destructive",
            onPress: () => {
              setNotice(null);
              void fileQuery.refetch();
            },
          },
        ],
      );
      return;
    }

    setNotice(null);
    void fileQuery.refetch();
  };

  useUnsavedChangesGuard({
    navigation,
    enabled: isDirty && canEdit,
    isSaving: saveMutation.isPending,
    onSave: handleSave,
  });

  if (fileQuery.isLoading && !fileQuery.data) {
    return (
      <ScreenContainer>
        <LoadingState message="Загружаем файл..." />
      </ScreenContainer>
    );
  }

  if (fileQuery.isError && !fileQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState
          description={getFileLoadErrorMessage(fileQuery.error)}
          onRetry={() => void fileQuery.refetch()}
          title="Не удалось загрузить файл"
        />
      </ScreenContainer>
    );
  }

  const readOnlyReason =
    kind === "notebook"
      ? "Notebook доступен только для просмотра."
      : !canWrite
        ? "Недостаточно прав для редактирования. Файл открыт только для чтения."
        : null;

  return (
    <ScreenContainer>
      <FileDocumentView
        editable={canEdit}
        fileName={fileName}
        fileInfo={{
          statusText: isDirty ? "Есть несохранённые изменения." : "Изменений нет.",
          badgeText: isDirty ? "Черновик" : "Синхронизирован",
          badgeTone: isDirty ? "primary" : "muted",
          primaryAction:
            kind !== "notebook" && canWrite
              ? {
                  label: "Сохранить",
                  disabled: !isDirty,
                  loading: saveMutation.isPending,
                  onPress: () => {
                    void handleSave();
                  },
                }
              : null,
          secondaryAction: {
            label: "Обновить с сервера",
            onPress: handleReload,
            variant: "secondary",
          },
        }}
        kind={kind}
        notice={notice}
        onChangeText={setDraft}
        readOnlyReason={readOnlyReason}
        value={draft}
      />
    </ScreenContainer>
  );
}
