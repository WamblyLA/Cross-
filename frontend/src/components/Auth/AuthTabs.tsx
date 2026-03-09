type AuthMode = "signin" | "signup";

type AuthTabsProps = {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
};

export default function AuthTabs({ mode, setMode }: AuthTabsProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setMode("signin")}
        className={`px-3 py-1 rounded ${mode === "signin" ? "bg-white/20" : "bg-transparent"}`}
      >
        Войти
      </button>
      <button
        type="button"
        onClick={() => setMode("signup")}
        className={`px-3 py-1 rounded ${mode === "signup" ? "bg-white/20" : "bg-transparent"}`}
      >
        Зарегистрироваться
      </button>
    </div>
  );
}
