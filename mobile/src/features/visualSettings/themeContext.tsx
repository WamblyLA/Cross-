import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "../../hooks/useSession";
import { normalizeApiError } from "../../lib/errors/apiError";
import type { ApiError } from "../../types/api";
import type { ThemeName, VisualSettings } from "../../types/visualSettings";
import { fetchSettings, updateSettings } from "./settingsApi";
import { readStoredTheme, writeStoredTheme } from "./settingsStorage";
import { DEFAULT_VISUAL_SETTINGS } from "./themeVariables";

type ThemeContextValue = {
  themeName: ThemeName;
  visualSettings: VisualSettings;
  isThemeReady: boolean;
  isThemeSyncPending: boolean;
  themeError: string | null;
  applyTheme: (theme: ThemeName) => Promise<void>;
  clearThemeError: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getThemeErrorMessage(error: ApiError) {
  if (error.status === 401) {
    return "Не удалось сохранить тему. Сессия истекла.";
  }

  if (error.isNetworkError || error.isTimeoutError) {
    return "Не удалось сохранить тему. Проверьте подключение к сети.";
  }

  return "Не удалось сохранить тему оформления.";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const { sessionStatus, user } = useSession();
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(DEFAULT_VISUAL_SETTINGS);
  const [isThemeReady, setThemeReady] = useState(false);
  const [isThemeSyncPending, setThemeSyncPending] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreTheme() {
      const storedTheme = await readStoredTheme();

      if (cancelled) {
        return;
      }

      if (storedTheme) {
        setVisualSettings((current) => ({ ...current, theme: storedTheme }));
      }

      setThemeReady(true);
    }

    void restoreTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncThemeFromAccount() {
      if (sessionStatus !== "authenticated") {
        return;
      }

      try {
        const { settings } = await fetchSettings();

        if (cancelled) {
          return;
        }

        setVisualSettings(settings);
        await writeStoredTheme(settings.theme);
        setThemeError(null);
      } catch {
        if (!cancelled) {
          setThemeError(null);
        }
      }
    }

    void syncThemeFromAccount();

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, user?.id]);

  const applyTheme = useCallback(
    async (theme: ThemeName) => {
      if (theme === visualSettings.theme) {
        return;
      }

      const previous = visualSettings;
      const optimistic = { ...visualSettings, theme };

      setVisualSettings(optimistic);
      setThemeError(null);
      await writeStoredTheme(theme);

      if (sessionStatus !== "authenticated") {
        return;
      }

      setThemeSyncPending(true);

      try {
        const { settings } = await updateSettings({ theme });
        setVisualSettings(settings);
        await writeStoredTheme(settings.theme);
      } catch (error) {
        const normalized = normalizeApiError(error);

        setVisualSettings(previous);
        await writeStoredTheme(previous.theme);
        setThemeError(getThemeErrorMessage(normalized));
      } finally {
        setThemeSyncPending(false);
      }
    },
    [sessionStatus, visualSettings],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName: visualSettings.theme,
      visualSettings,
      isThemeReady,
      isThemeSyncPending,
      themeError,
      applyTheme,
      clearThemeError: () => setThemeError(null),
    }),
    [applyTheme, isThemeReady, isThemeSyncPending, themeError, visualSettings],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }

  return context;
}
