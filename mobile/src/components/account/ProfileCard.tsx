import { Text, View } from "react-native";
import type { AuthUser } from "../../types/auth";
import { Card } from "../common/Card";

type ProfileCardProps = {
  user: AuthUser;
};

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Card>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
            Профиль
          </Text>
        </View>

        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold text-secondary">
            Имя пользователя
          </Text>
          <Text className="will-change-variable text-sm font-bold text-primary">
            {user.username}
          </Text>
        </View>

        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold text-secondary">
            Электронная почта
          </Text>
          <Text className="will-change-variable text-sm font-bold text-primary">
            {user.email}
          </Text>
        </View>

        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold text-secondary">ID</Text>
          <Text selectable className="will-change-variable text-xs text-secondary">
            {user.id}
          </Text>
        </View>
      </View>
    </Card>
  );
}
