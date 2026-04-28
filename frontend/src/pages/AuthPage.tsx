import { Link, Outlet, useLocation } from "react-router-dom";
import AuthCard from "../components/Auth/AuthCard";
import AuthTabs from "../components/Auth/AuthTabs";
import { useAuth } from "../hooks/useAuth";

const pageCopy = {
  "/auth/login": {
    title: "С возвращением",
    description: "Войдите по имени пользователя или электронной почте",
    showTabs: true,
  },
  "/auth/register": {
    title: "Создайте аккаунт",
    description: "Зарегистрируйтесь по имени пользователя, электронной почте и паролю",
    showTabs: true,
  },
  "/auth/check-email": {
    title: "Проверьте почту",
    description: "Мы отправили письмо со ссылкой для подтверждения email",
    showTabs: false,
  },
  "/auth/forgot-password": {
    title: "Сброс пароля",
    description: "Введите email, и мы отправим ссылку для восстановления",
    showTabs: false,
  },
  "/auth/verify-email": {
    title: "Подтверждение email",
    description: "Проверяем ссылку подтверждения",
    showTabs: false,
  },
  "/auth/reset-password": {
    title: "Новый пароль",
    description: "Введите новый пароль для аккаунта CROSS++",
    showTabs: false,
  },
} as const;

export default function AuthPage() {
  const location = useLocation();
  const { sessionError } = useAuth();
  const copy = pageCopy[location.pathname as keyof typeof pageCopy] ?? pageCopy["/auth/login"];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app px-4 py-10">
      <div className="mb-4 flex w-full max-w-xl justify-start">
        <Link to="/" className="ui-control h-9 px-3">
          На главную
        </Link>
      </div>

      <AuthCard title={copy.title} description={copy.description}>
        {sessionError ? (
          <div className="rounded-[10px] border border-error bg-input px-4 py-3 text-sm text-error">
            {sessionError.message}
          </div>
        ) : null}

        {copy.showTabs ? <AuthTabs /> : null}
        <Outlet />
      </AuthCard>
    </div>
  );
}
