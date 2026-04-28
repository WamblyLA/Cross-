import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as authApi from "../features/auth/authApi";
import { normalizeApiError } from "../lib/api/errorNormalization";
import { useAuth } from "../hooks/useAuth";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";

type LocationState = {
  login?: string;
  email?: string;
};

export default function CheckEmailPage() {
  const location = useLocation();
  const { pendingVerification, setPendingVerification } = useAuth();
  const locationState = (location.state as LocationState | null) ?? null;
  const defaultLogin = useMemo(
    () => locationState?.login ?? pendingVerification?.login ?? pendingVerification?.email ?? "",
    [locationState?.login, pendingVerification?.email, pendingVerification?.login],
  );
  const [login, setLogin] = useState(defaultLogin);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(pendingVerification?.message ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    const normalizedLogin = login.trim();

    if (!normalizedLogin) {
      setError("Введите email или имя пользователя, чтобы отправить письмо повторно.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authApi.resendVerification({ login: normalizedLogin });
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
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-default bg-input px-4 py-3 text-sm text-secondary">
        Откройте письмо от CROSS++, перейдите по ссылке подтверждения и затем войдите в аккаунт.
      </div>

      {message ? (
        <div className="rounded-[10px] border border-default bg-active px-4 py-3 text-sm text-primary">
          {message}
        </div>
      ) : null}

      <InputField
        label="Email или имя пользователя"
        value={login}
        onChange={setLogin}
        placeholder="user@example.com"
        error={error ?? undefined}
      />

      <PrimaryButton onClick={handleResend} disabled={isSubmitting} className="h-11 justify-center">
        {isSubmitting ? "Отправляем..." : "Отправить письмо повторно"}
      </PrimaryButton>

      <div className="text-sm text-secondary">
        Уже подтвердили почту? <Link to="/auth/login" className="text-primary">Войти</Link>
      </div>
    </div>
  );
}
