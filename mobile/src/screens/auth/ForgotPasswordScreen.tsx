import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { AuthFormLayout } from "../../components/auth/AuthFormLayout";
import { AppButton } from "../../components/common/AppButton";
import { AppTextField } from "../../components/common/AppTextField";
import { InlineNotice } from "../../components/common/InlineNotice";
import * as authApi from "../../features/auth/authApi";
import { normalizeApiError } from "../../lib/errors/apiError";
import type { AuthStackParamList } from "../../navigation/navigationTypes";

type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Введите email.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Введите корректный email.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authApi.forgotPassword(normalizedEmail);
      setMessage(response.message);
    } catch (requestError) {
      setError(normalizeApiError(requestError).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFormLayout
      title="Сброс пароля"
      subtitle="Введите email, и мы отправим ссылку для восстановления в браузере."
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
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />

      <AppButton loading={isSubmitting} onPress={handleSubmit} title="Отправить ссылку" />
    </AuthFormLayout>
  );
}
