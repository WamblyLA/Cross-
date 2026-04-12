import { Pressable, Text, View } from "react-native";
import { Badge } from "../common/Badge";
import { Card } from "../common/Card";
import { formatDateTime } from "../../lib/utils/date";
import { formatRoleLabel } from "../../lib/utils/file";
import type { CloudProject } from "../../types/projects";

type ProjectCardProps = {
  project: CloudProject;
  onPress: () => void;
};

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="gap-3">
          <View className="gap-1">
            <Text className="text-lg font-extrabold text-primary">{project.name}</Text>
            <Text className="text-xs text-secondary">Обновлён {formatDateTime(project.updatedAt)}</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Badge text={formatRoleLabel(project.accessRole)} tone="primary" />
            {!project.isOwner ? <Badge text="Shared" /> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
