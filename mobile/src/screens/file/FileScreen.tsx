import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { FileDocumentView } from "../../components/file/FileDocumentView";
import { useUpdateProjectFileMutation, fileQueryKeys, useProjectFileQuery } from "../../features/files/filesHooks";
import type { CloudRealtimeAckPayload, CloudRealtimeRemoteUpdatePayload } from "../../features/files/cloudRealtimeTypes";
import { useCloudRealtimeFile } from "../../features/files/useCloudRealtimeFile";
import { useUnsavedChangesGuard } from "../../hooks/useUnsavedChangesGuard";
import { getFileLoadErrorMessage, getFileSaveErrorMessage } from "../../lib/errors/fileMessages";
import { getFileKind } from "../../lib/utils/file";
import type { ProjectsStackParamList } from "../../navigation/navigationTypes";

type FileScreenProps = NativeStackScreenProps<ProjectsStackParamList, "File">;

type NoticeState =
  | { tone: "success" | "error" | "info" | "warning"; text: string }
  | null;

export function FileScreen({ navigation, route }: FileScreenProps) {
  const { projectId, fileId, fileName: routeFileName } = route.params;
  const queryClient = useQueryClient();
  const fileQuery = useProjectFileQuery(projectId, fileId);
  const updateFileMutation = useUpdateProjectFileMutation(projectId);
  const [draft, setDraft] = useState("");
  const [serverContent, setServerContent] = useState("");
  const [serverVersion, setServerVersion] = useState(0);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [pendingConflict, setPendingConflict] = useState<CloudRealtimeRemoteUpdatePayload | null>(null);
  const initializedFileRef = useRef<string | null>(null);

  const file = fileQuery.data;
  const actualFileName = file?.name ?? routeFileName;
  const kind = useMemo(() => getFileKind(actualFileName), [actualFileName]);
  const canWrite = file?.canWrite ?? false;
  const canEdit = canWrite;
  const isDirty = draft !== serverContent;

  const applyServerSnapshot = useCallback(
    (
      payload: {
        content: string;
        version: number;
      },
      options?: {
        notice?: NoticeState;
      },
    ) => {
      setDraft(payload.content);
      setServerContent(payload.content);
      setServerVersion(payload.version);
      setPendingConflict(null);

      if (options?.notice) {
        setNotice(options.notice);
      }
    },
    [],
  );

  useEffect(() => {
    if (!file) {
      return;
    }

    navigation.setOptions({ title: file.name });

    const isNewFile = initializedFileRef.current !== file.id;

    if (isNewFile) {
      initializedFileRef.current = file.id;
      setDraft(file.content);
      setServerContent(file.content);
      setServerVersion(file.version);
      setPendingConflict(null);
      setNotice(null);
      return;
    }

    if (!isDirty && !pendingConflict && (file.content !== serverContent || file.version !== serverVersion)) {
      setDraft(file.content);
      setServerContent(file.content);
      setServerVersion(file.version);
    }
  }, [file, isDirty, navigation, pendingConflict, serverContent, serverVersion]);

  const handleAck = useCallback(
    (payload: CloudRealtimeAckPayload) => {
      const acceptedContent = payload.acceptedContent ?? draft;
      const nextQueryData = fileQuery.data
        ? {
            ...fileQuery.data,
            content: acceptedContent,
            version: payload.version,
            updatedAt: payload.updatedAt,
          }
        : null;

      if (nextQueryData) {
        queryClient.setQueryData(fileQueryKeys.detail(projectId, fileId), nextQueryData);
      }

      setServerContent(acceptedContent);
      setServerVersion(payload.version);
      setNotice({
        tone: "success",
        text: "Изменения синхронизированы с облаком.",
      });
    },
    [draft, fileId, fileQuery.data, projectId, queryClient],
  );

  const handleRemoteUpdate = useCallback(
    (payload: CloudRealtimeRemoteUpdatePayload) => {
      const nextQueryData = fileQuery.data
        ? {
            ...fileQuery.data,
            content: payload.content,
            version: payload.version,
            updatedAt: payload.updatedAt,
          }
        : null;

      if (nextQueryData) {
        queryClient.setQueryData(fileQueryKeys.detail(projectId, fileId), nextQueryData);
      }

      applyServerSnapshot(
        {
          content: payload.content,
          version: payload.version,
        },
        {
          notice: {
            tone: "info",
            text: "Получено удалённое обновление.",
          },
        },
      );
    },
    [applyServerSnapshot, fileId, fileQuery.data, projectId, queryClient],
  );

  const handleConflict = useCallback((payload: CloudRealtimeRemoteUpdatePayload) => {
    setPendingConflict(payload);
    setNotice({
      tone: "warning",
      text: "На сервере появилась новая версия. Локальный черновик не перезаписан.",
    });
  }, []);

  const { isRealtimeSupported, syncStatus, flushPendingUpdate } = useCloudRealtimeFile({
    enabled: Boolean(file),
    fileId,
    fileName: actualFileName,
    draft,
    serverContent,
    version: serverVersion,
    hasPendingConflict: Boolean(pendingConflict),
    canWrite,
    onJoinedVersion: (version) => {
      if (version <= serverVersion) {
        return;
      }

      if (!isDirty && !pendingConflict) {
        void fileQuery.refetch();
        return;
      }

      setNotice({
        tone: "warning",
        text: "На сервере есть более новая версия файла. Сначала обновите или примите изменения.",
      });
    },
    onAck: handleAck,
    onRemoteUpdate: handleRemoteUpdate,
    onConflict: handleConflict,
  });

  const saveFallback = useCallback(async () => {
    const response = await updateFileMutation.mutateAsync({
      fileId,
      content: draft,
      expectedVersion: serverVersion,
    });

    applyServerSnapshot(
      {
        content: response.file.content,
        version: response.file.version,
      },
      {
        notice: {
          tone: "success",
          text: "Файл сохранён.",
        },
      },
    );
  }, [applyServerSnapshot, draft, fileId, serverVersion, updateFileMutation]);

  const handleSave = useCallback(async () => {
    if (!canEdit) {
      setNotice({
        tone: "info",
        text: "Недостаточно прав для редактирования.",
      });
      return false;
    }

    if (pendingConflict) {
      setNotice({
        tone: "warning",
        text: "Сохранение заблокировано: на сервере уже есть более новая версия файла.",
      });
      return false;
    }

    if (!isDirty) {
      return true;
    }

    try {
      if (isRealtimeSupported) {
        const flushed = await flushPendingUpdate();

        if (flushed) {
          return true;
        }
      }

      await saveFallback();
      return true;
    } catch (error) {
      setNotice({
        tone: "error",
        text: getFileSaveErrorMessage(error as never),
      });
      return false;
    }
  }, [canEdit, flushPendingUpdate, isDirty, isRealtimeSupported, pendingConflict, saveFallback]);

  const handleReload = useCallback(() => {
    const applyPendingConflict = () => {
      if (!pendingConflict) {
        return false;
      }

      const nextQueryData = fileQuery.data
        ? {
            ...fileQuery.data,
            content: pendingConflict.content,
            version: pendingConflict.version,
            updatedAt: pendingConflict.updatedAt,
          }
        : null;

      if (nextQueryData) {
        queryClient.setQueryData(fileQueryKeys.detail(projectId, fileId), nextQueryData);
      }

      applyServerSnapshot(
        {
          content: pendingConflict.content,
          version: pendingConflict.version,
        },
        {
          notice: {
            tone: "info",
            text: "Загружена новая серверная версия файла.",
          },
        },
      );

      return true;
    };

    if (isDirty || pendingConflict) {
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

              if (!applyPendingConflict()) {
                void fileQuery.refetch().then((result) => {
                  if (!result.data) {
                    return;
                  }

                  applyServerSnapshot({
                    content: result.data.content,
                    version: result.data.version,
                  });
                });
              }
            },
          },
        ],
      );
      return;
    }

    setNotice(null);
    void fileQuery.refetch();
  }, [applyServerSnapshot, fileId, fileQuery, isDirty, pendingConflict, projectId, queryClient]);

  useUnsavedChangesGuard({
    navigation,
    enabled: isDirty && canEdit,
    isSaving: updateFileMutation.isPending,
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

  const syncStatusText =
    pendingConflict
      ? "Конфликт версии: требуется обновление."
      : syncStatus === "syncing"
        ? "Идёт синхронизация изменений."
        : syncStatus === "connecting"
          ? "Подключаем realtime-синхронизацию."
          : syncStatus === "offline" && isRealtimeSupported
            ? "Realtime временно офлайн."
            : syncStatus === "error"
              ? "Realtime сообщил об ошибке."
              : isDirty
                ? "Есть несохранённые изменения."
                : "Изменений нет.";

  const badgeText =
    pendingConflict
      ? "Конфликт"
      : syncStatus === "syncing"
        ? "Синхронизация"
        : isDirty
          ? "Черновик"
          : isRealtimeSupported
            ? "Синхронизирован"
            : "Локально";

  const readOnlyReason = !canWrite
    ? "Недостаточно прав для редактирования. Файл открыт только для чтения."
    : null;

  return (
    <ScreenContainer>
      <FileDocumentView
        editable={canEdit}
        fileName={actualFileName}
        fileInfo={{
          statusText: syncStatusText,
          badgeText,
          badgeTone: pendingConflict || isDirty ? "primary" : "muted",
          primaryAction: canWrite
            ? {
                label: "Сохранить",
                disabled: !isDirty && !pendingConflict,
                loading: updateFileMutation.isPending,
                onPress: () => {
                  void handleSave();
                },
              }
            : null,
          secondaryAction: {
            label: pendingConflict ? "Принять серверную версию" : "Обновить с сервера",
            onPress: handleReload,
            variant: "secondary",
          },
        }}
        kind={kind}
        notice={
          notice ??
          (syncStatus === "connecting"
            ? { tone: "info", text: "Подключение к realtime..." }
            : syncStatus === "offline" && isRealtimeSupported
              ? { tone: "warning", text: "Realtime временно недоступен. Можно обновить файл вручную." }
              : null)
        }
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
