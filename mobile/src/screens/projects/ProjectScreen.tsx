import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { InlineNotice } from "../../components/common/InlineNotice";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { ProjectMembersCard } from "../../components/projects/ProjectMembersCard";
import { ProjectTreeList } from "../../components/projects/ProjectTreeList";
import {
  createInitialExpandedFolders,
  flattenProjectTree,
} from "../../features/projects/projectTree";
import {
  useProjectMembersQuery,
  useProjectQuery,
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

type ProjectScreenProps = NativeStackScreenProps<ProjectsStackParamList, "Project">;

export function ProjectScreen({ navigation, route }: ProjectScreenProps) {
  const { projectId } = route.params;
  const accent = useThemeVariable("--accent", "#316e43");
  const projectQuery = useProjectQuery(projectId);
  const treeQuery = useProjectTreeQuery(projectId);
  const membersQuery = useProjectMembersQuery(projectId);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);

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

  const handleRefresh = async () => {
    await Promise.all([
      projectQuery.refetch(),
      treeQuery.refetch(),
      membersQuery.refetch(),
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
    projectQuery.isRefetching || treeQuery.isRefetching || membersQuery.isRefetching;

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

        {membersQuery.isError ? (
          <InlineNotice text={getMembersErrorMessage(membersQuery.error)} tone="warning" />
        ) : null}

        {membersQuery.data && membersQuery.data.length > 0 ? (
          <ProjectMembersCard members={membersQuery.data} />
        ) : null}

        {treeQuery.data && treeItems.length > 0 ? (
          <ProjectTreeList
            items={treeItems}
            onOpenFile={openFile}
            onToggleFolder={toggleFolder}
          />
        ) : treeQuery.data ? (
          <EmptyState
            description="В этом проекте пока нет файлов или папок."
            title="Проект пуст"
          />
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
