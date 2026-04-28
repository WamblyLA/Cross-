import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { validateLoginPayload, type AuthFormErrors } from "../../features/auth/authValidation";
import { useSession } from "../../hooks/useSession";
import { getLoginErrorMessage } from "../../lib/errors/authMessages";
import type { AuthStackParamList } from "../../navigation/navigationTypes";
import { AuthFormLayout } from "../../components/auth/AuthFormLayout";
import { AppButton } from "../../components/common/AppButton";
import { AppTextField } from "../../components/common/AppTextField";
import { InlineNotice } from "../../components/common/InlineNotice";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const {
    login,
    authPending,
    sessionNotice,
    clearSessionNotice,
  } = useSession();
  const [form, setForm] = useState({
    login: "",
    password: "",
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const nextErrors = validateLoginPayload(form);
    setErrors(nextErrors);
    setActionError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const error = await login(form);

    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        navigation.navigate("CheckEmail");
        return;
      }

      setActionError(getLoginErrorMessage(error));
    }
  };

  return (
    <AuthFormLayout
      title="Вход"
      subtitle="Войдите в аккаунт, чтобы открыть свои проекты."
      footer={(
        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text className="text-sm font-bold text-accent">
            Нет аккаунта? Зарегистрироваться
          </Text>
        </Pressable>
      )}
    >
      {sessionNotice ? (
        <Pressable onPress={clearSessionNotice}>
          <InlineNotice text={sessionNotice} tone="warning" />
        </Pressable>
      ) : null}

      {actionError ? <InlineNotice text={actionError} tone="error" /> : null}

      <AppTextField
        autoCapitalize="none"
        error={errors.login}
        keyboardType="email-address"
        label="Логин или email"
        onChangeText={(value) => setForm((current) => ({ ...current, login: value }))}
        placeholder="Введите логин или email"
        value={form.login}
      />

      <AppTextField
        autoCapitalize="none"
        error={errors.password}
        label="Пароль"
        onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
        placeholder="Введите пароль"
        secureTextEntry
        value={form.password}
      />

      <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
        <Text className="text-right text-sm font-bold text-accent">Забыли пароль?</Text>
      </Pressable>

      <AppButton loading={authPending} onPress={handleSubmit} title="Войти" />
    </AuthFormLayout>
  );
}
