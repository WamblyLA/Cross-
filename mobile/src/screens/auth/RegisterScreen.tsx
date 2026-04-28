import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { AuthFormLayout } from "../../components/auth/AuthFormLayout";
import { AppButton } from "../../components/common/AppButton";
import { AppTextField } from "../../components/common/AppTextField";
import { InlineNotice } from "../../components/common/InlineNotice";
import { validateRegisterPayload, type AuthFormErrors } from "../../features/auth/authValidation";
import { useSession } from "../../hooks/useSession";
import { getRegisterErrorMessage } from "../../lib/errors/authMessages";
import type { AuthStackParamList } from "../../navigation/navigationTypes";

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, authPending } = useSession();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const nextErrors = validateRegisterPayload(form);
    setErrors(nextErrors);
    setActionError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const error = await register(form);

    if (error) {
      setActionError(getRegisterErrorMessage(error));
      return;
    }

    navigation.navigate("CheckEmail");
  };

  return (
    <AuthFormLayout
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы открыть проекты."
      footer={(
        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text className="text-sm font-bold text-accent">Уже есть аккаунт? Войти</Text>
        </Pressable>
      )}
    >
      {actionError ? <InlineNotice text={actionError} tone="error" /> : null}

      <AppTextField
        error={errors.username}
        label="Имя пользователя"
        onChangeText={(value) => setForm((current) => ({ ...current, username: value }))}
        placeholder="Например, Egor"
        value={form.username}
      />

      <AppTextField
        autoCapitalize="none"
        error={errors.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
        placeholder="you@example.com"
        value={form.email}
      />

      <AppTextField
        autoCapitalize="none"
        error={errors.password}
        label="Пароль"
        onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
        placeholder="Не короче 8 символов"
        secureTextEntry
        value={form.password}
      />

      <AppTextField
        autoCapitalize="none"
        error={errors.passwordConfirm}
        label="Повторите пароль"
        onChangeText={(value) => setForm((current) => ({ ...current, passwordConfirm: value }))}
        placeholder="Введите пароль ещё раз"
        secureTextEntry
        value={form.passwordConfirm}
      />

      <AppButton loading={authPending} onPress={handleSubmit} title="Создать аккаунт" />
    </AuthFormLayout>
  );
}
