import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthTabs from "../components/Auth/AuthTabs";
import { useRequest } from "../hooks/useRequest";
import InputField from "../ui/InputField";
import PrimaryButton from "../ui/PrimaryButton";

type AuthMode = "signin" | "signup";

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

type AuthResponse = {
  user: {
    id: string;
    email: string;
  };
};

export default function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverError, setServerError] = useState("");

  const { refetch: loginRequest, isLoading: isLoginLoading } =
    useRequest<AuthResponse>({
      url: "/api/auth/login",
      method: "POST",
      auto: false,
    });

  const { refetch: registerRequest, isLoading: isRegisterLoading } =
    useRequest<AuthResponse>({
      url: "/api/auth/register",
      method: "POST",
      auto: false,
    });

  const errors = useMemo(() => {
    const next: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email.trim()) {
      next.email = "Почта не может быть пустой";
    } else if (!isValidEmail(email)) {
      next.email = "Некорректная почта";
    }

    if (!password) {
      next.password = "Пароль не может быть пустым";
    } else if (password.length < 6) {
      next.password = "Минимум 6 символов";
    }

    if (mode === "signup") {
      if (!confirmPassword) {
        next.confirmPassword = "Подтвердите пароль";
      } else if (password !== confirmPassword) {
        next.confirmPassword = "Пароли не совпадают";
      }
    }

    return next;
  }, [email, password, confirmPassword, mode]);

  const hasErrors = Object.keys(errors).length > 0;
  const isLoading = isLoginLoading || isRegisterLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (hasErrors) {
      return;
    }

    try {
      if (mode === "signin") {
        await loginRequest({
          body: {
            email,
            password,
          },
        });
      } else {
        await registerRequest({
          body: {
            email,
            password,
          },
        });
      }

      navigate("/");
      window.location.reload();
    } catch (err: any) {
      setServerError(err?.response?.data?.error || "Запрос не выполнен");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-app px-4">
      <div className="ui-panel w-full max-w-md p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-primary">
          {mode === "signin" ? "Уже есть аккаунт?" : "Готовы создать аккаунт?"}
        </h1>

        <AuthTabs mode={mode} setMode={setMode} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <InputField
            label="Почта"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            placeholder="you@example.com"
          />

          <InputField
            label="Пароль"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            placeholder="••••••••"
          />

          {mode === "signup" ? (
            <InputField
              label="Подтверждение пароля"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={errors.confirmPassword}
              placeholder="••••••••"
            />
          ) : null}
          {serverError ? <div className="text-error text-sm">{serverError}</div> : null}
          <PrimaryButton type="submit" disabled={isLoading || hasErrors}>
            {isLoading
              ? "Загрузка..."
              : mode === "signin"
                ? "Войти"
                : "Зарегистрироваться"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
