import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  TAB_SIZE_MAX,
  TAB_SIZE_MIN,
  type VisualSettings,
} from "../../features/visualSettings/visualSettingsTypes";
import type { ThemeName } from "../../styles/tokens";

type VisualSettingsFormProps = {
  title: string;
  description: string;
  value: VisualSettings;
  onChange: (nextPatch: Partial<VisualSettings>) => void;
  footer?: ReactNode;
};

type NumericFieldKey = "fontSize" | "tabSize";

type NumericFieldConfig = {
  key: NumericFieldKey;
  fallbackValue: number;
  rawValue: string;
  applyRawValue: (nextValue: string) => void;
};

function FieldShell({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-secondary">{label}</span>
      {children}
      <span className="text-xs text-muted">{description}</span>
    </label>
  );
}

function parseIntegerInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export default function VisualSettingsForm({
  title,
  description,
  value,
  onChange,
  footer,
}: VisualSettingsFormProps) {
  const [fontSizeInput, setFontSizeInput] = useState(() => String(value.fontSize));
  const [tabSizeInput, setTabSizeInput] = useState(() => String(value.tabSize));

  useEffect(() => {
    setFontSizeInput(String(value.fontSize));
  }, [value.fontSize]);

  useEffect(() => {
    setTabSizeInput(String(value.tabSize));
  }, [value.tabSize]);

  const commitIntegerField = ({
    key,
    fallbackValue,
    rawValue,
    applyRawValue,
  }: NumericFieldConfig) => {
    const parsedValue = parseIntegerInput(rawValue);

    if (parsedValue === null) {
      applyRawValue(String(fallbackValue));
      return;
    }

    onChange({ [key]: parsedValue });
  };

  const handleIntegerFieldKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    config: NumericFieldConfig,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitIntegerField(config);
    event.currentTarget.blur();
  };

  return (
    <section className="ui-panel h-full overflow-hidden">
      <div className="border-b border-default px-6 py-4">
        <h2 className="text-lg text-primary">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        <FieldShell
          label="Тема"
          description="Тема приложения применится сразу"
        >
          <select
            value={value.theme}
            onChange={(event) =>
              onChange({
                theme: event.target.value as ThemeName,
              })
            }
            className="ui-input px-3 py-2.5"
          >
            <option value="dark">Темная</option>
            <option value="light">Светлая</option>
          </select>
        </FieldShell>

        <FieldShell
          label="Размер шрифта"
          description="Используется в основных редакторах кода и Markdown"
        >
          <input
            type="number"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={fontSizeInput}
            onChange={(event) => setFontSizeInput(event.target.value)}
            onBlur={() =>
              commitIntegerField({
                key: "fontSize",
                fallbackValue: value.fontSize,
                rawValue: fontSizeInput,
                applyRawValue: setFontSizeInput,
              })
            }
            onKeyDown={(event) =>
              handleIntegerFieldKeyDown(event, {
                key: "fontSize",
                fallbackValue: value.fontSize,
                rawValue: fontSizeInput,
                applyRawValue: setFontSizeInput,
              })
            }
            className="ui-input px-3 py-2.5"
          />
        </FieldShell>

        <FieldShell
          label="Размер табуляции"
          description="Влияет на основные редакторы кода и Markdown-ячейки"
        >
          <input
            type="number"
            min={TAB_SIZE_MIN}
            max={TAB_SIZE_MAX}
            step={1}
            value={tabSizeInput}
            onChange={(event) => setTabSizeInput(event.target.value)}
            onBlur={() =>
              commitIntegerField({
                key: "tabSize",
                fallbackValue: value.tabSize,
                rawValue: tabSizeInput,
                applyRawValue: setTabSizeInput,
              })
            }
            onKeyDown={(event) =>
              handleIntegerFieldKeyDown(event, {
                key: "tabSize",
                fallbackValue: value.tabSize,
                rawValue: tabSizeInput,
                applyRawValue: setTabSizeInput,
              })
            }
            className="ui-input px-3 py-2.5"
          />
        </FieldShell>

        {footer}
      </div>
    </section>
  );
}
