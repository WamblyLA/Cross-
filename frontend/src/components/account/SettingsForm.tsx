import { useEffect, useState } from "react";
import { clearActionError } from "../../features/auth/authSlice";
import { getApiErrorDetail } from "../../lib/api/errorNormalization";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch } from "../../store/hooks";
import type { AuthSettings } from "../../features/auth/authTypes";
import type { ThemeName } from "../../styles/tokens";
import PrimaryButton from "../../ui/PrimaryButton";

type SettingsFormValues = {
  theme: ThemeName;
  fontSize: string;
  tabSize: string;
};

type SettingsValidationErrors = Partial<Record<keyof SettingsFormValues, string>>;

function toFormValues(settings: AuthSettings): SettingsFormValues {
  return {
    theme: settings.theme,
    fontSize: String(settings.fontSize),
    tabSize: String(settings.tabSize),
  };
}

function validate(values: SettingsFormValues): SettingsValidationErrors {
  const errors: SettingsValidationErrors = {};
  const fontSize = Number(values.fontSize);
  const tabSize = Number(values.tabSize);

  if (!Number.isInteger(fontSize) || fontSize < 10 || fontSize > 32) {
    errors.fontSize = "Число должно быть от 10 до 32";
  }

  if (!Number.isInteger(tabSize) || tabSize < 2 || tabSize > 8) {
    errors.tabSize = "Use an integer from 2 to 8.";
  }

  return errors;
}

function FieldShell({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-secondary">{label}</span>
      {children}
      <span className="text-xs text-muted">{description}</span>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </label>
  );
}

export default function SettingsForm() {
  const dispatch = useAppDispatch();
  const { settings, settingsPending, actionError, updateSettings } = useAuth();
  const [values, setValues] = useState<SettingsFormValues | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    dispatch(clearActionError());
  }, [dispatch]);

  useEffect(() => {
    if (settings) {
      setValues(toFormValues(settings));
    }
  }, [settings]);

  if (!settings || !values) {
    return (
      <section className="ui-panel overflow-hidden">
        <div className="border-b border-default px-6 py-4">
          <h2 className="text-lg text-primary">Настройки</h2>
        </div>
        <div className="px-6 py-6 text-sm text-secondary">Загружаем настройки...</div>
      </section>
    );
  }

  const validationErrors = validate(values);
  const themeError = getApiErrorDetail(actionError?.details, "theme");
  const fontSizeError =
    validationErrors.fontSize ?? getApiErrorDetail(actionError?.details, "fontSize");
  const tabSizeError =
    validationErrors.tabSize ?? getApiErrorDetail(actionError?.details, "tabSize");
  const generalError =
    actionError && !themeError && !fontSizeError && !tabSizeError ? actionError.message : null;

  const handleReset = () => {
    setValues(toFormValues(settings));
    setSuccessMessage(null);
    dispatch(clearActionError());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(clearActionError());
    setSuccessMessage(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await updateSettings({
        theme: values.theme,
        fontSize: Number(values.fontSize),
        tabSize: Number(values.tabSize),
      }).unwrap();
      setSuccessMessage(
        "Настройки сохранены",
      );
    } catch {
      //TODO
    }
  };

  return (
    <section className="ui-panel h-full overflow-hidden">
      <div className="border-b border-default px-6 py-4">
        <h2 className="text-lg text-primary">Настройки</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-6">
        <FieldShell
          label="Theme"
          description="This is the active source of truth for the protected shell theme."
          error={themeError}
        >
          <select
            value={values.theme}
            onChange={(event) =>
              setValues((current) =>
                current
                  ? {
                      ...current,
                      theme: event.target.value as ThemeName,
                    }
                  : current,
              )
            }
            className="ui-input px-3 py-2.5"
          >
            <option value="dark">Темная</option>
            <option value="light">Светлая</option>
          </select>
        </FieldShell>

        <FieldShell
          label="Размер шрифта"
          description="Сохранено"
          error={fontSizeError}
        >
          <input
            type="number"
            min={10}
            max={32}
            step={1}
            value={values.fontSize}
            onChange={(event) =>
              setValues((current) =>
                current
                  ? {
                      ...current,
                      fontSize: event.target.value,
                    }
                  : current,
              )
            }
            className="ui-input px-3 py-2.5"
          />
        </FieldShell>

        <FieldShell
          label="Размер Tab"
          description="Сохранено."
          error={tabSizeError}
        >
          <input
            type="number"
            min={2}
            max={8}
            step={1}
            value={values.tabSize}
            onChange={(event) =>
              setValues((current) =>
                current
                  ? {
                      ...current,
                      tabSize: event.target.value,
                    }
                  : current,
              )
            }
            className="ui-input px-3 py-2.5"
          />
        </FieldShell>

        {generalError ? <div className="text-sm text-error">{generalError}</div> : null}
        {successMessage ? <div className="text-sm text-success">{successMessage}</div> : null}

        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton type="submit" disabled={settingsPending} className="h-11 justify-center">
            {settingsPending ? "Saving..." : "Save settings"}
          </PrimaryButton>

          <button
            type="button"
            onClick={handleReset}
            className="ui-button-secondary ui-control h-11 px-4"
            disabled={settingsPending}
          >
            Сбросить
          </button>
        </div>
      </form>
    </section>
  );
}
