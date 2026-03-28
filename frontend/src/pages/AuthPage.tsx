import { Outlet, useLocation } from "react-router-dom";
import AuthCard from "../components/Auth/AuthCard";
import AuthTabs from "../components/Auth/AuthTabs";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const location = useLocation();
  const { sessionError } = useAuth();
  const isRegisterRoute = location.pathname.endsWith("/register");

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <AuthCard
        title={isRegisterRoute ? "Создайте аккаунт Cross++" : "С возвращением"}
        description={
          isRegisterRoute
            ? "Зарегистрируйтесь по имени пользователя, электронной почте и паролю"
            : "Войдите по имени пользователя или электронной почте"
        }
      >
        {sessionError ? (
          <div className="rounded-[10px] border border-error bg-input px-4 py-3 text-sm text-error">
            {sessionError.message}
          </div>
        ) : null}

        <AuthTabs />
        <Outlet />
      </AuthCard>
    </div>
  );
}
