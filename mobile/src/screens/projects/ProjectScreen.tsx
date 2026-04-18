import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, View } from "react-native";
import { Badge } from "../../components/common/Badge";
import { AppButton } from "../../components/common/AppButton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { InlineNotice } from "../../components/common/InlineNotice";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { ProjectActionMenuDialog } from "../../components/projects/ProjectActionMenuDialog";
import { ProjectItemNameDialog } from "../../components/projects/ProjectItemNameDialog";
import { ProjectMembersCard } from "../../components/projects/ProjectMembersCard";
import { ProjectMoveDialog } from "../../components/projects/ProjectMoveDialog";
import { ProjectTreeList } from "../../components/projects/ProjectTreeList";
import { createEmptyNotebookDocument, serializeNotebookDocument } from "../../features/files/notebookParser";
import {
  useCreateProjectFileMutation,
  useDeleteProjectFileMutation,
  useMoveProjectFileMutation,
  useUpdateProjectFileMutation,
} from "../../features/files/filesHooks";
import {
  useCreateProjectFolderMutation,
  useDeleteProjectFolderMutation,
  useMoveProjectFolderMutation,
  useUpdateProjectFolderMutation,
} from "../../features/folders/foldersHooks";
import {
  createInitialExpandedFolders,
  flattenProjectTree,
} from "../../features/projects/projectTree";
import {
  useProjectMembersQuery,
  useProjectQuery,
  useProjectsQuery,
  useProjectTreeQuery,
} from "../../features/projects/projectsHooks";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import {
  getMembersErrorMessage,
  getProjectErrorMessage,
} from "../../lib/errors/projectMessages";
import { formatDateTime } from "../../lib/utils/date";
import { formatRoleLabel } from "../../lib/utils/file";
import type { ProjectsStackParamList } from "../../navigation/navigationTypes";
import type { CloudFileSummary, CloudFolderSummary, CloudFolderTreeNode, CloudProjectTree } from "../../types/projects";

type ProjectScreenProps = NativeStackScreenProps<ProjectsStackParamList, "Project">;

type NoticeState =
  | {
      tone: "success" | "error" | "info" | "warning";
      text: string;
    }
  | null;

type NameDialogState =
  | null
  | {
      kind: "create-file";
      folderId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue?: string;
    }
  | {
      kind: "rename-file";
      fileId: string;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue: string;
    }
  | {
      kind: "create-folder";
      parentId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue?: string;
    }
  | {
      kind: "rename-folder";
      folderId: string;
      title: string;
      description: string;
      confirmLabel: string;
      initialValue: string;
    };

type MoveDialogState =
  | null
  | {
      kind: "move-file";
      fileId: string;
      initialProjectId: string;
      initialFolderId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
    }
  | {
      kind: "move-folder";
      folderId: string;
      initialProjectId: string;
      initialFolderId: string | null;
      title: string;
      description: string;
      confirmLabel: string;
    };

type ActionMenuState =
  | null
  | {
      title: string;
      items: Array<{
        key: string;
        label: string;
        tone?: "default" | "danger";
        onPress: () => void;
      }>;
    };

function collectTreeLookups(tree: CloudProjectTree | undefined) {
  const filesById = new Map<string, CloudFileSummary>();
  const foldersById = new Map<string, CloudFolderSummary>();

  if (!tree) {
    return {
      filesById,
      foldersById,
    };
  }

  const visitFolder = (folder: CloudFolderTreeNode) => {
    foldersById.set(folder.id, folder);
    folder.files.forEach((file) => filesById.set(file.id, file));
    folder.folders.forEach(visitFolder);
  };

  tree.files.forEach((file) => filesById.set(file.id, file));
  tree.folders.forEach(visitFolder);

  return {
    filesById,
    foldersById,
  };
}

function getInitialFileContent(fileName: string) {
  return fileName.trim().toLowerCase().endsWith(".ipynb")
    ? serializeNotebookDocument(createEmptyNotebookDocument())
    : "";
}

export function ProjectScreen({ navigation, route }: ProjectScreenProps) {
  const { projectId } = route.params;
  const accent = useThemeVariable("--accent", "#316e43");
  const projectQuery = useProjectQuery(projectId);
  const treeQuery = useProjectTreeQuery(projectId);
  const membersQuery = useProjectMembersQuery(projectId);
  const projectsQuery = useProjectsQuery();
  const createFileMutation = useCreateProjectFileMutation(projectId);
  const updateFileMutation = useUpdateProjectFileMutation(projectId);
  const deleteFileMutation = useDeleteProjectFileMutation(projectId);
  const moveFileMutation = useMoveProjectFileMutation(projectId);
  const createFolderMutation = useCreateProjectFolderMutation(projectId);
  const updateFolderMutation = useUpdateProjectFolderMutation(projectId);
  const deleteFolderMutation = useDeleteProjectFolderMutation(projectId);
  const moveFolderMutation = useMoveProjectFolderMutation(projectId);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [moveDialog, setMoveDialog] = useState<MoveDialogState>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState>(null);

  useEffect(() => {
    if (treeQuery.data && expandedFolderIds.length === 0) {
      setExpandedFolderIds(createInitialExpandedFolders(treeQuery.data));
    }
  }, [expandedFolderIds.length, treeQuery.data]);

  const treeItems = useMemo(() => {
    if (!treeQuery.data) {
      return [];
    }

    return flattenProjectTree(treeQuery.data, new Set(expandedFolderIds));
  }, [expandedFolderIds, treeQuery.data]);

  const { filesById, foldersById } = useMemo(
    () => collectTreeLookups(treeQuery.data),
    [treeQuery.data],
  );

  const writableProjects = useMemo(
    () => {
      const projects = (projectsQuery.data ?? []).filter((project) => project.accessRole !== "viewer");

      if (projects.length > 0 || !projectQuery.data || projectQuery.data.accessRole === "viewer") {
        return projects;
      }

      return [projectQuery.data];
    },
    [projectQuery.data, projectsQuery.data],
  );

  const handleRefresh = async () => {
    await Promise.all([
      projectQuery.refetch(),
      treeQuery.refetch(),
      membersQuery.refetch(),
      projectsQuery.refetch(),
    ]);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((current) =>
      current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId],
    );
  };

  const openFile = (fileId: string, fileName: string) => {
    navigation.navigate("File", {
      projectId,
      fileId,
      fileName,
    });
  };

  const canManage = projectQuery.data?.accessRole !== "viewer";

  const handleDeleteFile = (fileId: string, fileName: string) => {
    Alert.alert("Удалить файл", `Файл "${fileName}" будет удалён из облака.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          void deleteFileMutation.mutateAsync({ fileId }).then(
            () => {
              setNotice({ tone: "success", text: `Файл "${fileName}" удалён.` });
            },
            (error) => {
              setNotice({ tone: "error", text: error.message });
            },
          );
        },
      },
    ]);
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    Alert.alert(
      "Удалить папку",
      `Папка "${folderName}" и вложенные файлы будут удалены из облака.`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            void deleteFolderMutation.mutateAsync({ folderId }).then(
              () => {
                setExpandedFolderIds((current) => current.filter((id) => id !== folderId));
                setNotice({ tone: "success", text: `Папка "${folderName}" удалена.` });
              },
              (error) => {
                setNotice({ tone: "error", text: error.message });
              },
            );
          },
        },
      ],
    );
  };

  const openFileMenu = (fileId: string) => {
    const file = filesById.get(fileId);

    if (!file) {
      return;
    }

    setActionMenu({
      title: file.name,
      items: [
        {
          key: "open",
          label: "Открыть",
          onPress: () => openFile(file.id, file.name),
        },
        ...(canManage
          ? [
              {
                key: "rename",
                label: "Переименовать",
                onPress: () =>
                  setNameDialog({
                    kind: "rename-file",
                    fileId: file.id,
                    title: "Переименовать файл",
                    description: `Новое имя для "${file.name}".`,
                    confirmLabel: "Сохранить",
                    initialValue: file.name,
                  }),
              },
              {
                key: "move",
                label: "Переместить",
                onPress: () =>
                  setMoveDialog({
                    kind: "move-file",
                    fileId: file.id,
                    initialProjectId: file.projectId,
                    initialFolderId: file.folderId ?? null,
                    title: "Переместить файл",
                    description: `Выберите новое место для "${file.name}".`,
                    confirmLabel: "Переместить",
                  }),
              },
              {
                key: "delete",
                label: "Удалить",
                tone: "danger" as const,
                onPress: () => handleDeleteFile(file.id, file.name),
              },
            ]
          : []),
      ],
    });
  };

  const openFolderMenu = (folderId: string) => {
    const folder = foldersById.get(folderId);

    if (!folder) {
      return;
    }

    setActionMenu({
      title: folder.name,
      items: [
        ...(canManage
          ? [
              {
                key: "create-file",
                label: "Создать файл внутри",
                onPress: () =>
                  setNameDialog({
                    kind: "create-file",
                    folderId: folder.id,
                    title: "Создать файл",
                    description: `Новый файл будет создан в папке "${folder.name}".`,
                    confirmLabel: "Создать",
                  }),
              },
              {
                key: "create-folder",
                label: "Создать папку внутри",
                onPress: () =>
                  setNameDialog({
                    kind: "create-folder",
                    parentId: folder.id,
                    title: "Создать папку",
                    description: `Новая папка будет создана в "${folder.name}".`,
                    confirmLabel: "Создать",
                  }),
              },
              {
                key: "rename",
                label: "Переименовать",
                onPress: () =>
                  setNameDialog({
                    kind: "rename-folder",
                    folderId: folder.id,
                    title: "Переименовать папку",
                    description: `Новое имя для "${folder.name}".`,
                    confirmLabel: "Сохранить",
                    initialValue: folder.name,
                  }),
              },
              {
                key: "move",
                label: "Переместить",
                onPress: () =>
                  setMoveDialog({
                    kind: "move-folder",
                    folderId: folder.id,
                    initialProjectId: folder.projectId,
                    initialFolderId: folder.parentId ?? null,
                    title: "Переместить папку",
                    description: `Выберите новое место для "${folder.name}".`,
                    confirmLabel: "Переместить",
                  }),
              },
              {
                key: "delete",
                label: "Удалить",
                tone: "danger" as const,
                onPress: () => handleDeleteFolder(folder.id, folder.name),
              },
            ]
          : []),
      ],
    });
  };

  const handleSubmitNameDialog = async (name: string) => {
    if (!nameDialog) {
      return;
    }

    try {
      if (nameDialog.kind === "create-file") {
        const response = await createFileMutation.mutateAsync({
          name,
          content: getInitialFileContent(name),
          folderId: nameDialog.folderId,
        });

        if (nameDialog.folderId) {
          setExpandedFolderIds((current) =>
            current.includes(nameDialog.folderId!) ? current : [...current, nameDialog.folderId!],
          );
        }

        setNameDialog(null);
        setNotice({ tone: "success", text: `Файл "${response.file.name}" создан.` });
        navigation.navigate("File", {
          projectId,
          fileId: response.file.id,
          fileName: response.file.name,
        });
        return;
      }

      if (nameDialog.kind === "rename-file") {
        const response = await updateFileMutation.mutateAsync({
          fileId: nameDialog.fileId,
          name,
        });

        setNameDialog(null);
        setNotice({ tone: "success", text: `Файл переименован в "${response.file.name}".` });
        return;
      }

      if (nameDialog.kind === "create-folder") {
        const response = await createFolderMutation.mutateAsync({
          name,
          parentId: nameDialog.parentId,
        });

        setExpandedFolderIds((current) =>
          [
            ...current,
            ...(nameDialog.parentId ? [nameDialog.parentId] : []),
            response.folder.id,
          ].filter((value, index, array) => array.indexOf(value) === index),
        );
        setNameDialog(null);
        setNotice({ tone: "success", text: `Папка "${response.folder.name}" создана.` });
        return;
      }

      const response = await updateFolderMutation.mutateAsync({
        folderId: nameDialog.folderId,
        name,
      });

      setNameDialog(null);
      setNotice({ tone: "success", text: `Папка переименована в "${response.folder.name}".` });
    } catch (error) {
      setNotice({
        tone: "error",
        text: (error as { message?: string }).message ?? "Не удалось выполнить действие.",
      });
    }
  };

  const handleSubmitMoveDialog = async (payload: { targetProjectId: string; targetFolderId: string | null }) => {
    if (!moveDialog) {
      return;
    }

    try {
      if (moveDialog.kind === "move-file") {
        const response = await moveFileMutation.mutateAsync({
          fileId: moveDialog.fileId,
          targetProjectId: payload.targetProjectId,
          targetFolderId: payload.targetFolderId,
        });

        setMoveDialog(null);
        setNotice({
          tone: "success",
          text: `Файл "${response.file.name}" перемещён.`,
        });
        return;
      }

      const response = await moveFolderMutation.mutateAsync({
        folderId: moveDialog.folderId,
        targetProjectId: payload.targetProjectId,
        targetParentId: payload.targetFolderId,
      });

      setExpandedFolderIds((current) => current.filter((id) => id !== moveDialog.folderId));
      setMoveDialog(null);
      setNotice({
        tone: "success",
        text: `Папка "${response.folder.name}" перемещена.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: (error as { message?: string }).message ?? "Не удалось выполнить действие.",
      });
    }
  };

  if ((projectQuery.isLoading || treeQuery.isLoading) && !projectQuery.data && !treeQuery.data) {
    return (
      <ScreenContainer>
        <LoadingState message="Открываем проект..." />
      </ScreenContainer>
    );
  }

  if ((projectQuery.isError && !projectQuery.data) || (treeQuery.isError && !treeQuery.data)) {
    return (
      <ScreenContainer>
        <ErrorState
          description={getProjectErrorMessage(projectQuery.error ?? treeQuery.error)}
          onRetry={() => void handleRefresh()}
          title="Не удалось открыть проект"
        />
      </ScreenContainer>
    );
  }

  const project = projectQuery.data;
  const isRefreshing =
    projectQuery.isRefetching ||
    treeQuery.isRefetching ||
    membersQuery.isRefetching ||
    projectsQuery.isRefetching;
  const isNameDialogLoading =
    createFileMutation.isPending ||
    updateFileMutation.isPending ||
    createFolderMutation.isPending ||
    updateFolderMutation.isPending;
  const isMoveDialogLoading = moveFileMutation.isPending || moveFolderMutation.isPending;

  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingBottom: 32 }}
        refreshControl={(
          <RefreshControl
            colors={[accent]}
            onRefresh={() => void handleRefresh()}
            refreshing={isRefreshing}
            tintColor={accent}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        {project ? (
          <View className="gap-3">
            <SectionTitle
              subtitle={`Обновлён ${formatDateTime(project.updatedAt)}`}
              title={project.name}
            />
            <View className="flex-row flex-wrap gap-2">
              <Badge text={formatRoleLabel(project.accessRole)} tone="primary" />
              {!project.isOwner ? <Badge text="Общий" /> : null}
            </View>
          </View>
        ) : null}

        {notice ? <InlineNotice text={notice.text} tone={notice.tone} /> : null}

        {membersQuery.isError ? (
          <InlineNotice text={getMembersErrorMessage(membersQuery.error)} tone="warning" />
        ) : null}

        {membersQuery.data && membersQuery.data.length > 0 ? (
          <ProjectMembersCard members={membersQuery.data} />
        ) : null}

        {canManage ? (
          <View className="gap-3">
            <AppButton
              onPress={() =>
                setNameDialog({
                  kind: "create-file",
                  folderId: null,
                  title: "Создать файл",
                  description: "Файл будет создан в корне проекта.",
                  confirmLabel: "Создать",
                })
              }
              title="Создать файл"
            />
            <AppButton
              onPress={() =>
                setNameDialog({
                  kind: "create-folder",
                  parentId: null,
                  title: "Создать папку",
                  description: "Папка будет создана в корне проекта.",
                  confirmLabel: "Создать",
                })
              }
              title="Создать папку"
              variant="secondary"
            />
          </View>
        ) : null}

        {treeQuery.data && treeItems.length > 0 ? (
          <ProjectTreeList
            canManage={Boolean(canManage)}
            items={treeItems}
            onOpenFile={openFile}
            onOpenFileMenu={openFileMenu}
            onOpenFolderMenu={openFolderMenu}
            onToggleFolder={toggleFolder}
          />
        ) : treeQuery.data ? (
          <EmptyState
            description="В этом проекте пока нет файлов или папок."
            title="Проект пуст"
          />
        ) : null}
      </ScrollView>

      <ProjectItemNameDialog
        confirmLabel={nameDialog?.confirmLabel ?? "Сохранить"}
        description={nameDialog?.description}
        initialValue={nameDialog?.initialValue ?? ""}
        loading={isNameDialogLoading}
        onClose={() => setNameDialog(null)}
        onSubmit={(name) => {
          void handleSubmitNameDialog(name);
        }}
        title={nameDialog?.title ?? "Изменить имя"}
        visible={Boolean(nameDialog)}
      />

      <ProjectMoveDialog
        confirmLabel={moveDialog?.confirmLabel ?? "Переместить"}
        description={moveDialog?.description}
        initialFolderId={moveDialog?.initialFolderId ?? null}
        initialProjectId={moveDialog?.initialProjectId ?? projectId}
        loading={isMoveDialogLoading}
        onClose={() => setMoveDialog(null)}
        onSubmit={(payload) => {
          void handleSubmitMoveDialog(payload);
        }}
        projects={writableProjects}
        title={moveDialog?.title ?? "Переместить"}
        visible={Boolean(moveDialog)}
      />

      <ProjectActionMenuDialog
        items={actionMenu?.items ?? []}
        onClose={() => setActionMenu(null)}
        title={actionMenu?.title ?? "Действия"}
        visible={Boolean(actionMenu)}
      />
    </ScreenContainer>
  );
}
