import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { ErrorState } from "../../components/common/ErrorState";
import { InlineNotice } from "../../components/common/InlineNotice";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { FileInfoCard } from "../../components/file/FileInfoCard";
import { ReadOnlyBanner } from "../../components/file/ReadOnlyBanner";
import { TextFileEditor } from "../../components/file/TextFileEditor";
import { MarkdownEditorPanel } from "../../components/markdown/MarkdownEditorPanel";
import { NotebookView } from "../../components/notebook/NotebookView";
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
  const [markdownMode, setMarkdownMode] = useState<"edit" | "preview">("edit");
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    const file = fileQuery.data;

    if (!file) {
      return;
    }

    setDraft(file.content);
    setServerContent(file.content);
    setServerVersion(file.version);
    setMarkdownMode(file.canWrite ? "edit" : "preview");
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
      <View className="flex-1 gap-3">
        <FileInfoCard
          canSave={canEdit && isDirty}
          fileName={fileName}
          isDirty={isDirty}
          isSaving={saveMutation.isPending}
          onReload={handleReload}
          onSave={() => {
            void handleSave();
          }}
          showSaveAction={kind !== "notebook" && canWrite}
        />

        {readOnlyReason ? <ReadOnlyBanner text={readOnlyReason} /> : null}
        {notice ? <InlineNotice text={notice.text} tone={notice.tone} /> : null}

        <View className="flex-1">
          {kind === "markdown" ? (
            <MarkdownEditorPanel
              editable={canEdit}
              mode={markdownMode}
              onChangeMode={setMarkdownMode}
              onChangeText={setDraft}
              value={draft}
            />
          ) : null}

          {kind === "text" ? (
            <TextFileEditor editable={canEdit} onChangeText={setDraft} value={draft} />
          ) : null}

          {kind === "notebook" ? (
            <NotebookView content={draft} />
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}
