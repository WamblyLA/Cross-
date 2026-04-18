import { ScrollView, Text, View, Pressable } from "react-native";
import { useMemo, useState, useEffect } from "react";
import { useProjectTreeQuery } from "../../features/projects/projectsHooks";
import { flattenProjectFolderTargets, getProjectMoveLabel } from "../../features/projects/projectMoveTargets";
import type { CloudProject } from "../../types/projects";
import { cn } from "../../lib/utils/cn";
import { AppModal } from "../common/AppModal";

type ProjectMoveDialogProps = {
  visible: boolean;
  title: string;
  description?: string | null;
  confirmLabel: string;
  loading?: boolean;
  projects: CloudProject[];
  initialProjectId: string;
  initialFolderId: string | null;
  onClose: () => void;
  onSubmit: (payload: { targetProjectId: string; targetFolderId: string | null }) => void;
};

export function ProjectMoveDialog({
  visible,
  title,
  description = null,
  confirmLabel,
  loading = false,
  projects,
  initialProjectId,
  initialFolderId,
  onClose,
  onSubmit,
}: ProjectMoveDialogProps) {
  const [targetProjectId, setTargetProjectId] = useState(initialProjectId);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(initialFolderId);
  const targetTreeQuery = useProjectTreeQuery(targetProjectId);

  useEffect(() => {
    if (visible) {
      setTargetProjectId(initialProjectId);
      setTargetFolderId(initialFolderId);
    }
  }, [initialFolderId, initialProjectId, visible]);

  const targets = useMemo(
    () => (targetTreeQuery.data ? flattenProjectFolderTargets(targetTreeQuery.data) : []),
    [targetTreeQuery.data],
  );

  return (
    <AppModal
      confirmLabel={confirmLabel}
      confirmLoading={loading}
      description={description}
      onClose={onClose}
      onConfirm={() => {
        onSubmit({
          targetProjectId,
          targetFolderId,
        });
      }}
      title={title}
      visible={visible}
    >
      <View className="gap-3">
        <View className="gap-2">
          <Text className="will-change-variable text-sm font-bold text-secondary">Проект</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {projects.map((project) => {
                const isActive = project.id === targetProjectId;

                return (
                  <Pressable
                    className={cn(
                      "will-change-variable min-h-10 rounded-md border px-3 py-2",
                      isActive ? "border-accent bg-active" : "border-default bg-transparent",
                    )}
                    key={project.id}
                    onPress={() => {
                      setTargetProjectId(project.id);
                      setTargetFolderId(null);
                    }}
                  >
                    <Text className={cn("will-change-variable text-sm", isActive ? "text-primary" : "text-secondary")}>
                      {getProjectMoveLabel(project)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="gap-2">
          <Text className="will-change-variable text-sm font-bold text-secondary">Папка</Text>
          <ScrollView className="max-h-64">
            <View className="gap-2">
              {targets.map((target) => {
                const isActive = target.id === targetFolderId;

                return (
                  <Pressable
                    className={cn(
                      "will-change-variable min-h-10 rounded-md border px-3 py-2",
                      isActive ? "border-accent bg-active" : "border-default bg-transparent",
                    )}
                    key={target.id ?? "root"}
                    onPress={() => setTargetFolderId(target.id)}
                    style={{ marginLeft: target.level * 12 }}
                  >
                    <Text className={cn("will-change-variable text-sm", isActive ? "text-primary" : "text-secondary")}>
                      {target.label}
                    </Text>
                  </Pressable>
                );
              })}

              {!targetTreeQuery.data && !targetTreeQuery.isLoading ? (
                <Text className="will-change-variable text-sm text-secondary">Не удалось загрузить папки проекта.</Text>
              ) : null}

              {targetTreeQuery.isLoading ? (
                <Text className="will-change-variable text-sm text-secondary">Загружаем папки...</Text>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </AppModal>
  );
}
