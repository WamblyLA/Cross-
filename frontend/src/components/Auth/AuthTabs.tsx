type AuthMode = "signin" | "signup";

type AuthTabsProps = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
};

export default function AuthTabs({ mode, setMode }: AuthTabsProps) {
  return (
    <div className="flex gap-2 rounded-md bg-chrome p-1 border border-default">
      <button
        type="button"
        onClick={() => setMode("signin")}
        className={`ui-control flex-1 px-3 py-1.5 text-sm ${
          mode === "signin" ? "bg-active text-primary border border-default" : "text-secondary"
        }`}
      >
        Войти
      </button>
      <button
        type="button"
        onClick={() => setMode("signup")}
        className={`ui-control flex-1 px-3 py-1.5 text-sm ${
          mode === "signup" ? "bg-active text-primary border border-default" : "text-secondary"
        }`}
      >
        Зарегистрироваться
      </button>
    </div>
  );
}
