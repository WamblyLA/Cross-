import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, Text } from "react-native";
import { AuthFormLayout } from "../../components/auth/AuthFormLayout";
import { AppButton } from "../../components/common/AppButton";
import { AppTextField } from "../../components/common/AppTextField";
import { InlineNotice } from "../../components/common/InlineNotice";
import * as authApi from "../../features/auth/authApi";
import { useSession } from "../../hooks/useSession";
import { normalizeApiError } from "../../lib/errors/apiError";
import type { AuthStackParamList } from "../../navigation/navigationTypes";

type CheckEmailScreenProps = NativeStackScreenProps<AuthStackParamList, "CheckEmail">;

export function CheckEmailScreen({ navigation }: CheckEmailScreenProps) {
  const { pendingVerification, setPendingVerification } = useSession();
  const [login, setLogin] = useState(
    pendingVerification?.login ?? pendingVerification?.email ?? "",
  );
  const [message, setMessage] = useState(pendingVerification?.message ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLogin = useMemo(() => login.trim().length > 0, [login]);

  const handleResend = async () => {
    const normalizedLogin = login.trim();

    if (!normalizedLogin) {
      setError("Введите email или имя пользователя.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authApi.resendVerification(normalizedLogin);
      setMessage(response.message);
      setPendingVerification({
        login: normalizedLogin,
        email: normalizedLogin.includes("@") ? normalizedLogin : null,
        message: response.message,
      });
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Проверьте почту"
      subtitle="Подтвердите email по ссылке из письма, а затем войдите в аккаунт."
      footer={(
        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text className="text-sm font-bold text-accent">Вернуться ко входу</Text>
        </Pressable>
      )}
    >
      {message ? <InlineNotice text={message} tone="info" /> : null}
      {error ? <InlineNotice text={error} tone="error" /> : null}

      <AppTextField
        autoCapitalize="none"
        label="Email или имя пользователя"
        onChangeText={setLogin}
        placeholder="user@example.com"
        value={login}
      />

      <AppButton
        disabled={!hasLogin}
        loading={isSubmitting}
        onPress={handleResend}
        title="Отправить письмо повторно"
      />
    </AuthFormLayout>
  );
}
