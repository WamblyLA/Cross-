import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useWorkspaceActions } from "../../hooks/useWorkspaceActions";
import type { CloudProject } from "../../features/cloud/cloudTypes";

type LinkWorkspaceDialogProps = {
  isOpen: boolean;
  projects: CloudProject[];
  onClose: () => void;
  onConfirm: (project: CloudProject) => Promise<void>;
};

export default function LinkWorkspaceDialog({
  isOpen,
  projects,
  onClose,
  onConfirm,
}: LinkWorkspaceDialogProps) {
  const { createCloudProject } = useWorkspaceActions();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id ?? null);
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4">
      <div className="ui-dialog flex w-[min(100%,560px)] min-w-0 flex-col px-6 py-5">
        <div className="text-base text-primary">Связать локальную папку с облачным проектом</div>
        <div className="mt-2 text-sm leading-6 text-secondary">
          Выберите существующий проект или создайте новый. Связь создаётся только как метаданные.
        </div>

        <div className="mt-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className={`rounded-[12px] border px-3 py-3 text-left ${
                selectedProjectId === project.id
                  ? "border-default bg-active text-primary"
                  : "border-default bg-editor text-secondary hover:bg-hover"
              }`}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <div className="text-sm text-primary">{project.name}</div>
              <div className="mt-1 text-xs text-muted">Обновлён: {new Date(project.updatedAt).toLocaleString("ru-RU")}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-default pt-4">
          <div className="text-sm text-primary">Создать новый проект</div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newProjectName}
              className="ui-input min-w-0 flex-1 px-3 py-2"
              placeholder="Название проекта"
              onChange={(event) => setNewProjectName(event.target.value)}
            />
            <button
              type="button"
              className="ui-control px-3 py-2"
              disabled={isSubmitting || !newProjectName.trim()}
              onClick={() => {
                setIsSubmitting(true);
                setError(null);
                void createCloudProject(newProjectName.trim())
                  .then((project) => {
                    setSelectedProjectId(project.id);
                    setNewProjectName("");
                  })
                  .catch((caughtError) => {
                    setError(caughtError instanceof Error ? caughtError.message : "Не удалось создать проект.");
                  })
                  .finally(() => setIsSubmitting(false));
              }}
            >
              Создать проект
            </button>
          </div>
        </div>

        {error ? <div className="mt-3 text-sm text-error">{error}</div> : null}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" className="ui-button-secondary ui-control h-9 px-4 text-sm" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="ui-button-primary ui-control h-9 px-4 text-sm"
            disabled={!selectedProject || isSubmitting}
            onClick={() => {
              if (!selectedProject) {
                return;
              }

              setIsSubmitting(true);
              setError(null);
              void onConfirm(selectedProject)
                .catch((caughtError) => {
                  setError(caughtError instanceof Error ? caughtError.message : "Не удалось создать связь.");
                })
                .finally(() => setIsSubmitting(false));
            }}
          >
            Связать
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
