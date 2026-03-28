import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useInsertionEffect, useState } from "react";
import AuthBootstrap from "./components/Auth/AuthBootstrap";
import LoginForm from "./components/Auth/LoginForm";
import RedirectIfAuthenticated from "./components/Auth/RedirectIfAuthenticated";
import RegisterForm from "./components/Auth/RegisterForm";
import RequireAuth from "./components/Auth/RequireAuth";
import { selectAuthSettings, selectIsAuthenticated } from "./features/auth/authSelectors";
import { updateSettings } from "./features/auth/authThunks";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import AccountPage from "./pages/AccountPage";
import MainPage from "./pages/MainPage";
import AuthPage from "./pages/AuthPage";
import AppShellLayout from "./layouts/AppShellLayout";
import {
  getNextTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type ThemeName,
} from "./styles/tokens";

export default function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authTheme = useAppSelector((state) => selectAuthSettings(state)?.theme ?? null);
  const [anonymousTheme, setAnonymousTheme] = useState<ThemeName>(() => readStoredTheme());
  const theme = authTheme ?? anonymousTheme;

  useInsertionEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = getNextTheme(theme);

    if (isAuthenticated) {
      void dispatch(updateSettings({ theme: nextTheme }));
      return;
    }

    setAnonymousTheme(nextTheme);
  };

  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/auth" element={<AuthPage />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<LoginForm />} />
              <Route path="register" element={<RegisterForm />} />
            </Route>
          </Route>

          <Route element={<AppShellLayout theme={theme} onToggleTheme={toggleTheme} />}>
            <Route index element={<MainPage theme={theme} />} />
            <Route element={<RequireAuth />}>
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  );
}
