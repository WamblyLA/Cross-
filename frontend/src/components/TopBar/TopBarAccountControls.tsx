import { FiUser } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function navButtonClassName(isActive: boolean) {
  return `ui-control h-8 shrink-0 px-3 text-sm ${
    isActive ? "border border-default bg-active text-primary" : ""
  }`;
}

export default function TopBarAccountControls() {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, isAuthenticated, authPending, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Не удалось выполнить выход.", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => navigate("/")}
          className={navButtonClassName(location.pathname === "/")}
        >
          IDE
        </button>

        <button
          type="button"
          onClick={() => navigate("/auth/login")}
          className={navButtonClassName(location.pathname === "/auth/login")}
        >
          Войти
        </button>

        <button
          type="button"
          onClick={() => navigate("/auth/register")}
          className={navButtonClassName(location.pathname === "/auth/register")}
        >
          Создать аккаунт
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <FiUser className="h-4 w-4 shrink-0 text-secondary" />
      <span className="hidden max-w-40 truncate text-secondary xl:block">{displayName}</span>

      <button
        type="button"
        onClick={() => navigate("/")}
        className={navButtonClassName(location.pathname === "/")}
      >
        IDE
      </button>

      <button
        type="button"
        onClick={() => navigate("/account")}
        className={navButtonClassName(location.pathname === "/account")}
      >
        Аккаунт
      </button>

      <button
        type="button"
        onClick={() => {
          void handleLogout();
        }}
        disabled={authPending}
        className="ui-control h-8 shrink-0 px-3 text-sm"
      >
        {authPending ? "Выходим..." : "Выйти"}
      </button>
    </div>
  );
}
