import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import MainPage from "./pages/MainPage";
import AuthPage from "./pages/AuthPage";
import { getNextTheme, readStoredTheme, THEME_STORAGE_KEY, type ThemeName } from "./styles/tokens";

export default function App() {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => getNextTheme(currentTheme));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MainPage
              rootPath={rootPath}
              setRootPath={setRootPath}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          }
        />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
