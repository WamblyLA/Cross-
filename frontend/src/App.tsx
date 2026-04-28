import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useInsertionEffect } from "react";
import AuthBootstrap from "./components/Auth/AuthBootstrap";
import LoginForm from "./components/Auth/LoginForm";
import RedirectIfAuthenticated from "./components/Auth/RedirectIfAuthenticated";
import RegisterForm from "./components/Auth/RegisterForm";
import RequireAuth from "./components/Auth/RequireAuth";
import { selectAuthSettings } from "./features/auth/authSelectors";
import { selectCurrentVisualSettings } from "./features/visualSettings/visualSettingsSelectors";
import { hydrateAccountVisualSettings } from "./features/visualSettings/visualSettingsSlice";
import { writeStoredVisualSettings } from "./features/visualSettings/visualSettingsStorage";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import AccountPage from "./pages/AccountPage";
import MainPage from "./pages/MainPage";
import AuthPage from "./pages/AuthPage";
import AppShellLayout from "./layouts/AppShellLayout";

export default function App() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => selectCurrentVisualSettings(state).theme);
  const visualSettings = useAppSelector(selectCurrentVisualSettings);
  const authSettings = useAppSelector(selectAuthSettings);

  useInsertionEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    writeStoredVisualSettings(visualSettings);
  }, [visualSettings]);

  useEffect(() => {
    dispatch(hydrateAccountVisualSettings(authSettings));
  }, [authSettings, dispatch]);

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

          <Route element={<AppShellLayout />}>
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
