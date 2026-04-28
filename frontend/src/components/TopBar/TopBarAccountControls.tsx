import { useMemo, useRef, useState } from "react";
import { FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import FloatingMenu, { type MenuSection } from "../../ui/FloatingMenu";

export default function TopBarAccountControls() {
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { user, displayName, isAuthenticated, authPending, logout } = useAuth();
  const resolvedDisplayName = displayName ?? "Профиль";

  const menuSections = useMemo<MenuSection[]>(
    () => [
      {
        id: "account-meta",
        title: isAuthenticated ? "Аккаунт" : "Гость",
        items: isAuthenticated
          ? [
              {
                id: "account-name",
                label: resolvedDisplayName,
                disabled: true,
                onSelect: () => undefined,
              },
              {
                id: "account-email",
                label: user?.email ?? "Email недоступен",
                disabled: true,
                onSelect: () => undefined,
              },
            ]
          : [
              {
                id: "account-label",
                label: "Вход не выполнен",
                disabled: true,
                onSelect: () => undefined,
              },
            ],
      },
      {
        id: "account-actions",
        items: isAuthenticated
          ? [
              {
                id: "account-profile",
                label: "Профиль",
                onSelect: () => navigate("/account"),
              },
              {
                id: "account-logout",
                label: authPending ? "Выходим..." : "Выйти",
                disabled: authPending,
                onSelect: async () => {
                  try {
                    await logout().unwrap();
                    navigate("/", { replace: true });
                  } catch (error) {
                    console.error("Не удалось выполнить выход.", error);
                  }
                },
              },
            ]
          : [
              {
                id: "account-login",
                label: "Войти",
                onSelect: () => navigate("/auth/login"),
              },
              {
                id: "account-register",
                label: "Создать аккаунт",
                onSelect: () => navigate("/auth/register"),
              },
            ],
      },
    ],
    [authPending, isAuthenticated, logout, navigate, resolvedDisplayName, user?.email],
  );

  const anchorRect = triggerRef.current?.getBoundingClientRect() ?? null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={`ui-control relative flex h-8 w-8 items-center justify-center ${
          isOpen ? "border border-default bg-active text-primary" : ""
        }`}
        aria-label={isAuthenticated ? `Аккаунт: ${resolvedDisplayName}` : "Аккаунт"}
        title={isAuthenticated ? resolvedDisplayName : "Аккаунт"}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <FiUser className="h-4 w-4" />
        <span
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full border"
          style={{
            backgroundColor: isAuthenticated ? "var(--success)" : "var(--text-muted)",
            borderColor: "var(--bg-panel)",
          }}
        />
      </button>

      {isOpen && anchorRect ? (
        <FloatingMenu
          sections={menuSections}
          position={{
            type: "anchor",
            rect: anchorRect,
            align: "right",
          }}
          width={232}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </div>
  );
}
