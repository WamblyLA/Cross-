import type { ReactNode } from "react";
import type { VisualSettings } from "../../features/visualSettings/visualSettingsTypes";
import type { ThemeName } from "../../styles/tokens";

type VisualSettingsFormProps = {
  title: string;
  description: string;
  value: VisualSettings;
  onChange: (nextPatch: Partial<VisualSettings>) => void;
  footer?: ReactNode;
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
          description="Используется в основных редакторах кода и markdown"
        >
          <input
            type="number"
            min={9}
            max={32}
            step={1}
            value={value.fontSize}
            onChange={(event) => {
              const parsedValue = parseIntegerInput(event.target.value);

              if (parsedValue === null) {
                return;
              }

              onChange({ fontSize: parsedValue });
            }}
            className="ui-input px-3 py-2.5"
          />
        </FieldShell>

        <FieldShell
          label="Размер табуляции"
          description="Влияет на основные редакторы кода и markdown-ячейки"
        >
          <input
            type="number"
            min={2}
            max={8}
            step={1}
            value={value.tabSize}
            onChange={(event) => {
              const parsedValue = parseIntegerInput(event.target.value);

              if (parsedValue === null) {
                return;
              }

              onChange({ tabSize: parsedValue });
            }}
            className="ui-input px-3 py-2.5"
          />
        </FieldShell>

        {footer}
      </div>
    </section>
  );
}
