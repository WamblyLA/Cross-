import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { AppButton } from "../../components/common/AppButton";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { InlineNotice } from "../../components/common/InlineNotice";
import { LoadingState } from "../../components/common/LoadingState";
import { ScreenContainer } from "../../components/common/ScreenContainer";
import { SectionTitle } from "../../components/common/SectionTitle";
import { ProjectItemNameDialog } from "../../components/projects/ProjectItemNameDialog";
import { ProjectSection } from "../../components/projects/ProjectSection";
import {
  useCreateProjectMutation,
  useProjectsQuery,
} from "../../features/projects/projectsHooks";
import { useThemeVariable } from "../../hooks/useThemeVariable";
import { getProjectsErrorMessage } from "../../lib/errors/projectMessages";
import type { ProjectsStackParamList } from "../../navigation/navigationTypes";

type ProjectsScreenProps = NativeStackScreenProps<ProjectsStackParamList, "ProjectsHome">;

type NoticeState =
  | {
      tone: "success" | "error" | "info" | "warning";
      text: string;
    }
  | null;

function normalizeProjectName(value: string) {
  return value.trim();
}

function validateProjectName(value: string) {
  const normalized = normalizeProjectName(value);

  if (!normalized) {
    return "Название проекта обязательно.";
  }

  if (normalized.length > 120) {
    return "Название проекта должно быть не длиннее 120 символов.";
  }

  return null;
}

export function ProjectsScreen({ navigation }: ProjectsScreenProps) {
  const projectsQuery = useProjectsQuery();
  const createProjectMutation = useCreateProjectMutation();
  const accent = useThemeVariable("--accent", "#316e43");
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

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

  const handleCreateProject = async (name: string) => {
    try {
      const response = await createProjectMutation.mutateAsync({ name });
      setCreateDialogOpen(false);
      setNotice({
        tone: "success",
        text: `Проект "${response.project.name}" создан и доступен в списке.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          (error as { message?: string }).message ?? "Не удалось создать облачный проект.",
      });
    }
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
        refreshControl={
          <RefreshControl
            colors={[accent]}
            onRefresh={() => void projectsQuery.refetch()}
            refreshing={projectsQuery.isRefetching}
            tintColor={accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle title="Облачные проекты" />

        {notice ? <InlineNotice text={notice.text} tone={notice.tone} /> : null}

        <AppButton
          onPress={() => {
            setNotice(null);
            setCreateDialogOpen(true);
          }}
          title="Создать проект"
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

      <ProjectItemNameDialog
        confirmLabel="Создать проект"
        description="Укажите название нового облачного проекта."
        loading={createProjectMutation.isPending}
        normalizeValue={normalizeProjectName}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={(name) => {
          void handleCreateProject(name);
        }}
        title="Создать облачный проект"
        validateValue={validateProjectName}
        visible={isCreateDialogOpen}
      />
    </ScreenContainer>
  );
}
