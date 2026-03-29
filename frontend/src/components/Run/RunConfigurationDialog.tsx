import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { VscAdd, VscChromeClose, VscTrash } from "react-icons/vsc";
import {
  selectRunConfigurationDialogOpen,
  selectRunConfigurations,
  selectRunErrorMessage,
  selectRunInterpreters,
  selectRunSelectedConfigurationId,
  selectRunToolchains,
} from "../../features/run/runSelectors";
import type { RunConfiguration } from "../../features/run/runTypes";
import { useRunActions } from "../../hooks/useRunActions";
import { useAppSelector } from "../../store/hooks";

function getWorkingDirectoryLabel(configuration: RunConfiguration | null) {
  if (!configuration) {
    return "Не выбрана";
  }

  return configuration.workingDirectoryMode === "project-root"
    ? "Корень проекта"
    : "Каталог текущего файла";
}

function getConfigurationKindLabel(configuration: RunConfiguration) {
  if (configuration.kind === "python-project") {
    return "Python-проект";
  }

  if (configuration.kind === "python-file") {
    return "Python-файл";
  }

  return "C++-файл";
}

export default function RunConfigurationDialog() {
  const isOpen = useAppSelector(selectRunConfigurationDialogOpen);
  const configurations = useAppSelector(selectRunConfigurations);
  const selectedConfigurationId = useAppSelector(selectRunSelectedConfigurationId);
  const interpreters = useAppSelector(selectRunInterpreters);
  const toolchains = useAppSelector(selectRunToolchains);
  const errorMessage = useAppSelector(selectRunErrorMessage);
  const {
    closeRunConfigurationDialog,
    createProjectConfiguration,
    deleteConfiguration,
    selectConfiguration,
    updateConfiguration,
  } = useRunActions();

  const selectedConfiguration =
    configurations.find((configuration) => configuration.id === selectedConfigurationId) ?? null;
  const [draft, setDraft] = useState<RunConfiguration | null>(selectedConfiguration);

  useEffect(() => {
    setDraft(selectedConfiguration);
  }, [selectedConfiguration]);

  const runtimeOptions = useMemo(() => {
    if (!draft) {
      return [];
    }

    if (draft.language === "python") {
      return interpreters.map((interpreter) => ({
        value: interpreter.path,
        label: interpreter.label,
      }));
    }

    return toolchains.map((toolchain) => ({
      value: toolchain.path ?? toolchain.id,
      label: toolchain.label,
    }));
  }, [draft, interpreters, toolchains]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4">
      <div className="flex h-[min(82vh,720px)] w-[min(100%,1024px)] min-w-0 overflow-hidden rounded-[20px] border border-default bg-panel shadow-2xl">
        <div className="flex w-72 shrink-0 flex-col border-r border-default">
          <div className="flex items-center justify-between border-b border-default px-4 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Конфигурации
              </div>
              <div className="text-sm text-primary">Что запускать</div>
            </div>
            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={() => {
                void createProjectConfiguration();
              }}
              title="Добавить Python-проект"
            >
              <VscAdd />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {configurations.map((configuration) => (
              <button
                key={configuration.id}
                type="button"
                className={`mb-2 w-full rounded-[12px] border px-3 py-3 text-left transition-colors ${
                  configuration.id === selectedConfigurationId
                    ? "border-default bg-active text-primary"
                    : "border-transparent bg-editor text-secondary hover:border-default hover:text-primary"
                }`}
                onClick={() => {
                  void selectConfiguration(configuration.id);
                }}
              >
                <div className="text-sm">{configuration.name}</div>
                <div className="mt-1 text-xs text-muted">
                  {getConfigurationKindLabel(configuration)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-default px-5 py-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
                Параметры запуска
              </div>
              <div className="text-base text-primary">
                {draft?.name ?? "Выберите конфигурацию"}
              </div>
            </div>
            <button
              type="button"
              className="ui-control h-8 w-8"
              onClick={closeRunConfigurationDialog}
              title="Закрыть"
            >
              <VscChromeClose />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {draft ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-secondary">Название</span>
                  <input
                    type="text"
                    value={draft.name}
                    className="ui-input px-3 py-2"
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, name: event.target.value } : current,
                      )
                    }
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm text-secondary">
                    {draft.language === "python" ? "Интерпретатор" : "Компилятор"}
                  </span>
                  <select
                    value={
                      draft.language === "python"
                        ? draft.interpreterPath ?? "auto"
                        : draft.compilerPath ?? "auto"
                    }
                    className="ui-input px-3 py-2"
                    onChange={(event) =>
                      setDraft((current) => {
                        if (!current) {
                          return current;
                        }

                        return current.language === "python"
                          ? { ...current, interpreterPath: event.target.value }
                          : { ...current, compilerPath: event.target.value };
                      })
                    }
                  >
                    <option value="auto">Автовыбор</option>
                    {runtimeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {draft.kind === "python-project" ? (
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-sm text-secondary">Entrypoint от корня проекта</span>
                    <input
                      type="text"
                      value={draft.entrypoint}
                      placeholder="например, src/main.py"
                      className="ui-input px-3 py-2"
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, entrypoint: event.target.value } : current,
                        )
                      }
                    />
                  </label>
                ) : null}

                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-sm text-secondary">Аргументы запуска</span>
                  <input
                    type="text"
                    value={draft.argumentsText}
                    placeholder="--demo value"
                    className="ui-input px-3 py-2"
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, argumentsText: event.target.value } : current,
                      )
                    }
                  />
                </label>

                {draft.language === "cpp" ? (
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-sm text-secondary">Аргументы компилятора</span>
                    <input
                      type="text"
                      value={draft.compilerArgumentsText}
                      placeholder="-O2 -Wall"
                      className="ui-input px-3 py-2"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, compilerArgumentsText: event.target.value }
                            : current,
                        )
                      }
                    />
                  </label>
                ) : null}

                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-sm text-secondary">Переменные окружения</span>
                  <textarea
                    value={draft.environmentText}
                    placeholder={"PYTHONUTF8=1\nMODE=dev"}
                    className="ui-input min-h-28 resize-y px-3 py-2"
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, environmentText: event.target.value } : current,
                      )
                    }
                  />
                </label>

                <div className="rounded-[12px] border border-default bg-editor px-4 py-3 md:col-span-2">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted">
                    Рабочая папка
                  </div>
                  <div className="mt-1 text-sm text-secondary">
                    {getWorkingDirectoryLabel(draft)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Выберите конфигурацию в списке слева
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-default px-5 py-4">
            <div className="min-h-[20px] text-sm text-error">{errorMessage ?? ""}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ui-control px-3 py-2"
                disabled={!draft || draft.source !== "user"}
                onClick={() => {
                  if (!draft) {
                    return;
                  }

                  void deleteConfiguration(draft.id);
                }}
              >
                <span className="flex items-center gap-2">
                  <VscTrash />
                  Удалить
                </span>
              </button>
              <button
                type="button"
                className="ui-control px-3 py-2"
                onClick={closeRunConfigurationDialog}
              >
                Закрыть
              </button>
              <button
                type="button"
                className="ui-button-primary ui-control px-4 py-2"
                disabled={!draft}
                onClick={() => {
                  if (!draft) {
                    return;
                  }

                  void updateConfiguration(draft);
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}