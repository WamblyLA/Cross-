import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as authApi from "../features/auth/authApi";
import { getApiErrorDetail, normalizeApiError } from "../lib/api/errorNormalization";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";

function getPasswordByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clientFieldErrors = useMemo(() => {
    const nextErrors: Record<string, string> = {};

    if (!password) {
      nextErrors.password = "Введите новый пароль.";
    } else if (password.length < 8) {
      nextErrors.password = "Используйте не менее 8 символов.";
    } else if (getPasswordByteLength(password) > 72) {
      nextErrors.password = "Пароль должен быть не длиннее 72 байт.";
    }

    if (!passwordConfirm) {
      nextErrors.passwordConfirm = "Подтвердите пароль.";
    } else if (password !== passwordConfirm) {
      nextErrors.passwordConfirm = "Пароли не совпадают.";
    }

    return nextErrors;
  }, [password, passwordConfirm]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setErrorMessage("Ссылка восстановления недействительна.");
      return;
    }

    if (Object.keys(clientFieldErrors).length > 0) {
      setFieldErrors(clientFieldErrors);
      setErrorMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const response = await authApi.resetPassword({
        token,
        password,
        passwordConfirm,
      });
      setSuccessMessage(response.message);
    } catch (requestError) {
      const normalizedError = normalizeApiError(requestError);
      setErrorMessage(normalizedError.message);
      setFieldErrors({
        password: getApiErrorDetail(normalizedError.details, "password") ?? "",
        passwordConfirm: getApiErrorDetail(normalizedError.details, "passwordConfirm") ?? "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[10px] border border-error bg-input px-4 py-3 text-sm text-error">
          Ссылка восстановления недействительна.
        </div>
        <Link to="/auth/forgot-password" className="text-sm text-primary">
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InputField
        label="Новый пароль"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Не короче 8 символов"
        error={fieldErrors.password || undefined}
      />

      <InputField
        label="Подтвердите пароль"
        type="password"
        value={passwordConfirm}
        onChange={setPasswordConfirm}
        placeholder="Повторите пароль"
        error={fieldErrors.passwordConfirm || undefined}
      />

      {errorMessage ? (
        <div className="rounded-[10px] border border-error bg-input px-4 py-3 text-sm text-error">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[10px] border border-default bg-active px-4 py-3 text-sm text-primary">
          {successMessage}
        </div>
      ) : null}

      <PrimaryButton type="submit" disabled={isSubmitting || Boolean(successMessage)} className="h-11 justify-center">
        {isSubmitting ? "Сохраняем..." : "Сохранить новый пароль"}
      </PrimaryButton>

      <div className="text-sm text-secondary">
        <Link to="/auth/login" className="text-primary">
          Вернуться ко входу
        </Link>
      </div>
    </form>
  );
}
