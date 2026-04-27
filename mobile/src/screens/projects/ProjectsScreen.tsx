import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { ProjectSection } from "../../components/projects/ProjectSection";
import { useProjectsQuery } from "../../features/projects/projectsHooks";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { getProjectsErrorMessage } from "../../lib/errors/projectMessages";
import type { ProjectsStackParamList } from "../../navigation/navigationTypes";

type ProjectsScreenProps = NativeStackScreenProps<ProjectsStackParamList, "ProjectsHome">;

export function ProjectsScreen({ navigation }: ProjectsScreenProps) {
  const projectsQuery = useProjectsQuery();
  const accent = useThemeVariable("--accent", "#316e43");

  const ownedProjects = useMemo(
    () => (projectsQuery.data ?? []).filter((project) => project.isOwner),
    [projectsQuery.data],
  );

  const sharedProjects = useMemo(
    () => (projectsQuery.data ?? []).filter((project) => !project.isOwner),
    [projectsQuery.data],
  );

  const openProject = (projectId: string, projectName: string) => {
    navigation.navigate("Project", { projectId, projectName });
  };

  if (projectsQuery.isLoading && !projectsQuery.data) {
    return (
      <ScreenContainer>
        <LoadingState message="Загружаем проекты..." />
      </ScreenContainer>
    );
  }

  if (projectsQuery.isError && !projectsQuery.data) {
    return (
      <ScreenContainer>
        <ErrorState
          description={getProjectsErrorMessage(projectsQuery.error)}
          onRetry={() => void projectsQuery.refetch()}
          title="Не удалось загрузить проекты"
        />
      </ScreenContainer>
    );
  }

  const hasProjects = (projectsQuery.data?.length ?? 0) > 0;

  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingBottom: 32 }}
        refreshControl={(
          <RefreshControl
            colors={[accent]}
            onRefresh={() => void projectsQuery.refetch()}
            refreshing={projectsQuery.isRefetching}
            tintColor={accent}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle
          title="Облачные проекты"
        />

        {!hasProjects ? (
          <EmptyState
            description="Когда у вас появятся проекты, они будут отображаться здесь."
            title="Пока нет проектов"
          />
        ) : (
          <View className="gap-5">
            {ownedProjects.length > 0 ? (
              <ProjectSection
                onOpenProject={(project) => openProject(project.id, project.name)}
                projects={ownedProjects}
                subtitle="Проекты, которыми вы владеете."
                title="Мои проекты"
              />
            ) : null}

            {sharedProjects.length > 0 ? (
              <ProjectSection
                onOpenProject={(project) => openProject(project.id, project.name)}
                projects={sharedProjects}
                subtitle="Проекты, к которым вам выдали доступ."
                title="Доступные мне"
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
