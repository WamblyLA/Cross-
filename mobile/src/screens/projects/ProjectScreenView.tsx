import { RefreshControl, ScrollView, View } from "react-native";
import { AppButton } from "../../components/common/AppButton";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { InlineNotice } from "../../components/common/InlineNotice";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { ProjectActionMenuDialog } from "../../components/projects/ProjectActionMenuDialog";
import { ProjectItemNameDialog } from "../../components/projects/ProjectItemNameDialog";
import { ProjectMembersCard } from "../../components/projects/ProjectMembersCard";
import { ProjectMoveDialog } from "../../components/projects/ProjectMoveDialog";
import { ProjectTreeList } from "../../components/projects/ProjectTreeList";
import { formatDateTime } from "../../lib/utils/date";
import { formatRoleLabel } from "../../lib/utils/file";
import type { CloudProject, ProjectMember, ProjectTreeItem } from "../../types/projects";
import type {
  ActionMenuState,
  MoveDialogState,
  NameDialogState,
  NoticeState,
} from "./projectScreenModel";

type ProjectScreenViewProps = {
  accent: string;
  actionMenu: ActionMenuState;
  canManage: boolean;
  isMoveDialogLoading: boolean;
  isNameDialogLoading: boolean;
  isRefreshing: boolean;
  members: ProjectMember[] | undefined;
  membersErrorMessage: string | null;
  moveDialog: MoveDialogState;
  nameDialog: NameDialogState;
  notice: NoticeState;
  project: CloudProject | undefined;
  projectId: string;
  treeItems: ProjectTreeItem[];
  treeLoaded: boolean;
  writableProjects: CloudProject[];
  onCloseActionMenu: () => void;
  onCloseMoveDialog: () => void;
  onCloseNameDialog: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onOpenFileMenu: (fileId: string) => void;
  onOpenFolderMenu: (folderId: string) => void;
  onRefresh: () => void;
  onSubmitMoveDialog: (payload: { targetProjectId: string; targetFolderId: string | null }) => void;
  onSubmitNameDialog: (name: string) => void;
  onToggleFolder: (folderId: string) => void;
};

export function ProjectScreenView({
  accent,
  actionMenu,
  canManage,
  isMoveDialogLoading,
  isNameDialogLoading,
  isRefreshing,
  members,
  membersErrorMessage,
  moveDialog,
  nameDialog,
  notice,
  project,
  projectId,
  treeItems,
  treeLoaded,
  writableProjects,
  onCloseActionMenu,
  onCloseMoveDialog,
  onCloseNameDialog,
  onCreateFile,
  onCreateFolder,
  onOpenFile,
  onOpenFileMenu,
  onOpenFolderMenu,
  onRefresh,
  onSubmitMoveDialog,
  onSubmitNameDialog,
  onToggleFolder,
}: ProjectScreenViewProps) {
  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingBottom: 32 }}
        refreshControl={(
          <RefreshControl
            colors={[accent]}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            tintColor={accent}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        {project ? (
          <View className="gap-3">
            <SectionTitle subtitle={`Обновлён ${formatDateTime(project.updatedAt)}`} title={project.name} />
            <View className="flex-row flex-wrap gap-2">
              <Badge text={formatRoleLabel(project.accessRole)} tone="primary" />
              {!project.isOwner ? <Badge text="Общий" /> : null}
            </View>
          </View>
        ) : null}

        {notice ? <InlineNotice text={notice.text} tone={notice.tone} /> : null}
        {membersErrorMessage ? <InlineNotice text={membersErrorMessage} tone="warning" /> : null}
        {members && members.length > 0 ? <ProjectMembersCard members={members} /> : null}

        {canManage ? (
          <View className="gap-3">
            <AppButton onPress={onCreateFile} title="Создать файл" />
            <AppButton onPress={onCreateFolder} title="Создать папку" variant="secondary" />
          </View>
        ) : null}

        {treeLoaded && treeItems.length > 0 ? (
          <ProjectTreeList
            canManage={canManage}
            items={treeItems}
            onOpenFile={onOpenFile}
            onOpenFileMenu={onOpenFileMenu}
            onOpenFolderMenu={onOpenFolderMenu}
            onToggleFolder={onToggleFolder}
          />
        ) : treeLoaded ? (
          <EmptyState description="В этом проекте пока нет файлов или папок." title="Проект пуст" />
        ) : null}
      </ScrollView>

      <ProjectItemNameDialog
        confirmLabel={nameDialog?.confirmLabel ?? "Сохранить"}
        description={nameDialog?.description}
        initialValue={nameDialog?.initialValue ?? ""}
        loading={isNameDialogLoading}
        onClose={onCloseNameDialog}
        onSubmit={onSubmitNameDialog}
        title={nameDialog?.title ?? "Изменить имя"}
        visible={Boolean(nameDialog)}
      />
      <ProjectMoveDialog
        confirmLabel={moveDialog?.confirmLabel ?? "Переместить"}
        description={moveDialog?.description}
        initialFolderId={moveDialog?.initialFolderId ?? null}
        initialProjectId={moveDialog?.initialProjectId ?? projectId}
        loading={isMoveDialogLoading}
        onClose={onCloseMoveDialog}
        onSubmit={onSubmitMoveDialog}
        projects={writableProjects}
        title={moveDialog?.title ?? "Переместить"}
        visible={Boolean(moveDialog)}
      />
      <ProjectActionMenuDialog
        items={actionMenu?.items ?? []}
        onClose={onCloseActionMenu}
        title={actionMenu?.title ?? "Действия"}
        visible={Boolean(actionMenu)}
      />
    </ScreenContainer>
  );
}
