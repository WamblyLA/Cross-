import { Link, Outlet, useLocation } from "react-router-dom";
import AuthCard from "../components/Auth/AuthCard";
import AuthTabs from "../components/Auth/AuthTabs";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const location = useLocation();
  const { sessionError } = useAuth();
  const isRegisterRoute = location.pathname.endsWith("/register");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app px-4 py-10">
      <div className="mb-4 flex w-full max-w-xl justify-start">
        <Link to="/" className="ui-control h-9 px-3">
          На главную
        </Link>
      </div>

      <AuthCard
        title={isRegisterRoute ? "Создайте аккаунт" : "С возвращением"}
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
