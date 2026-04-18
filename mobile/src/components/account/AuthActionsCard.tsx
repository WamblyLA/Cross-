import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import type { AuthStackParamList } from "../../navigation/navigationTypes";
import { AppButton } from "../common/AppButton";
import { Card } from "../common/Card";

type GuestNavigation = NativeStackNavigationProp<AuthStackParamList, "GuestHome">;

export function AuthActionsCard() {
  const navigation = useNavigation<GuestNavigation>();

  return (
    <Card>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="will-change-variable text-xs font-bold uppercase tracking-[2.4px] text-muted">
            Аккаунт
          </Text>
          <Text className="will-change-variable text-sm leading-6 text-secondary">
            Войдите, чтобы открыть проекты CROSS++ и синхронизировать файлы с сервером.
          </Text>
        </View>

        <AppButton onPress={() => navigation.navigate("Login")} title="Войти" />
        <AppButton
          onPress={() => navigation.navigate("Register")}
          title="Регистрация"
          variant="secondary"
        />
      </View>
    </Card>
  );
}
