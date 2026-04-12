import { Text, View } from "react-native";
import { Badge } from "../common/Badge";
import { Card } from "../common/Card";
import { formatRoleLabel } from "../../lib/utils/file";
import type { ProjectMember } from "../../types/projects";

type ProjectMembersCardProps = {
  members: ProjectMember[];
};

export function ProjectMembersCard({ members }: ProjectMembersCardProps) {
  return (
    <Card>
      <Text className="text-lg font-extrabold text-primary">Участники проекта</Text>
      <View className="gap-3">
        {members.map((member) => (
          <View key={member.id} className="gap-2 border-b border-default py-2 last:border-b-0">
            <View className="gap-1">
              <Text className="text-sm font-bold text-primary">{member.username}</Text>
              <Text className="text-xs text-secondary">{member.email}</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              <Badge text={formatRoleLabel(member.role)} tone="primary" />
              {member.isOwner ? <Badge text="Владелец" /> : null}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
