import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "../../hooks/useSession";
import { normalizeApiError } from "../../lib/errors/apiError";
import type { ApiError } from "../../types/api";
import type { ThemeName, VisualSettings } from "../../types/visualSettings";
import { fetchSettings, updateSettings } from "./settingsApi";
import { readStoredTheme, writeStoredTheme } from "./settingsStorage";
import {
  DEFAULT_VISUAL_SETTINGS,
  getThemeTokens,
  type ThemeTokens,
} from "./themeVariables";

type ThemeContextValue = {
  themeName: ThemeName;
  colorScheme: ThemeName;
  themeTokens: ThemeTokens;
  resolvedThemeVariables: ThemeTokens;
  visualSettings: VisualSettings;
  isThemeReady: boolean;
  isThemeSyncPending: boolean;
  themeError: string | null;
  applyTheme: (theme: ThemeName) => Promise<void>;
  updateVisualSettings: (patch: Partial<VisualSettings>) => Promise<void>;
  clearThemeError: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getVisualSettingsErrorMessage(
  error: ApiError,
  changedFields: Array<keyof VisualSettings>,
) {
  const isThemeOnly = changedFields.length === 1 && changedFields[0] === "theme";

  if (error.status === 401) {
    return isThemeOnly
      ? "Не удалось сохранить тему. Сессия истекла."
      : "Не удалось сохранить настройки редактора. Сессия истекла.";
  }

  if (error.isNetworkError || error.isTimeoutError) {
    return isThemeOnly
      ? "Не удалось сохранить тему. Проверьте подключение к сети."
      : "Не удалось сохранить настройки редактора. Проверьте подключение к сети.";
  }

  return isThemeOnly
    ? "Не удалось сохранить тему оформления."
    : "Не удалось сохранить настройки редактора.";
}

function mergeVisualSettings(
  currentSettings: VisualSettings,
  patch: Partial<VisualSettings>,
) {
  return {
    ...currentSettings,
    ...patch,
  };
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

  const updateVisualSettings = useCallback(
    async (patch: Partial<VisualSettings>) => {
      const changedFields = (Object.keys(patch) as Array<keyof VisualSettings>).filter(
        (field) => patch[field] !== undefined && patch[field] !== visualSettings[field],
      );

      if (changedFields.length === 0) {
        return;
      }

      const previous = visualSettings;
      const optimistic = mergeVisualSettings(visualSettings, patch);

      setVisualSettings(optimistic);
      setThemeError(null);

      if (patch.theme !== undefined) {
        await writeStoredTheme(patch.theme);
      }

      if (sessionStatus !== "authenticated") {
        return;
      }

      setThemeSyncPending(true);

      try {
        const { settings } = await updateSettings(patch);
        setVisualSettings(settings);

        if (patch.theme !== undefined) {
          await writeStoredTheme(settings.theme);
        }
      } catch (error) {
        const normalized = normalizeApiError(error);

        setVisualSettings(previous);

        if (patch.theme !== undefined) {
          await writeStoredTheme(previous.theme);
        }

        setThemeError(getVisualSettingsErrorMessage(normalized, changedFields));
      } finally {
        setThemeSyncPending(false);
      }
    },
    [sessionStatus, visualSettings],
  );

  const applyTheme = useCallback(
    async (theme: ThemeName) => {
      await updateVisualSettings({ theme });
    },
    [updateVisualSettings],
  );

  const themeName = visualSettings.theme;
  const themeTokens = useMemo(() => getThemeTokens(themeName), [themeName]);
  const clearThemeError = useCallback(() => {
    setThemeError(null);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      colorScheme: themeName,
      themeTokens,
      resolvedThemeVariables: themeTokens,
      visualSettings,
      isThemeReady,
      isThemeSyncPending,
      themeError,
      applyTheme,
      updateVisualSettings,
      clearThemeError,
    }),
    [
      applyTheme,
      clearThemeError,
      isThemeReady,
      isThemeSyncPending,
      themeError,
      themeName,
      themeTokens,
      updateVisualSettings,
      visualSettings,
    ],
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
