import { FiCloud } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import FloatingMenu from "../../../ui/FloatingMenu";
import CloudAuthPrompt from "./CloudAuthPrompt";
import CloudExplorerDeleteBar from "./CloudExplorerDeleteBar";
import CloudInlineInput from "./CloudInlineInput";
import CloudProjectSection from "./CloudProjectSection";
import { useCloudExplorerController } from "./useCloudExplorerController";

export default function CloudExplorer() {
  const navigate = useNavigate();
  const controller = useCloudExplorerController();

  if (!controller.isAuthenticated) {
    return <CloudAuthPrompt />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {controller.authRecoveryRequired ? (
        <div className="border-b border-default bg-panel px-3 py-3 text-sm text-secondary">
          Сессия для облака устарела.{" "}
          <button
            type="button"
            className="text-primary underline underline-offset-2"
            onClick={() => navigate("/auth/login")}
          >
            Войти заново
          </button>
        </div>
      ) : null}

      {controller.aggregatedError ? (
        <div className="border-b border-default px-3 py-2 text-sm text-error">
          {controller.aggregatedError}
        </div>
      ) : null}

      <div
        className="ui-scrollbar min-h-0 flex-1 overflow-auto px-2 py-2 text-sm text-secondary"
        onContextMenu={controller.handleRootContextMenu}
        onKeyDown={controller.handleExplorerKeyDown}
        tabIndex={0}
      >
        {controller.draft?.kind === "project" && controller.draft.mode === "create" ? (
          <CloudInlineInput
            icon={<FiCloud className="h-4 w-4" />}
            value={controller.draft.value}
            placeholder="Название нового проекта"
            onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
            onSubmit={() => {
              void controller.handleDraftSubmit();
            }}
            onCancel={() => controller.setDraft(null)}
          />
        ) : null}

        {controller.projectsStatus === "loading" && controller.projects.length === 0 ? (
          <div className="px-3 py-3 text-sm text-secondary">Загружаем облачные проекты...</div>
        ) : null}

        {controller.projectsStatus !== "loading" && controller.filteredProjects.length === 0 && controller.searchQuery ? (
          <div className="px-3 py-3 text-sm text-muted">
            По запросу "{controller.searchQuery}" ничего не найдено среди облачных проектов.
          </div>
        ) : null}

        {controller.projectsStatus !== "loading" && controller.projects.length === 0 && !controller.searchQuery ? (
          <div className="rounded-[14px] border border-dashed border-default bg-panel px-4 py-5 text-sm text-secondary">
            Пока нет ни одного облачного проекта. Создайте первый проект и начните работать с файлами прямо в IDE.
          </div>
        ) : null}

        {controller.filteredProjects.map((project) => (
          <CloudProjectSection key={project.id} controller={controller} project={project} />
        ))}
      </div>

      <CloudExplorerDeleteBar controller={controller} />

      {controller.contextMenu ? (
        <FloatingMenu
          sections={controller.contextMenuSections}
          position={{ type: "point", x: controller.contextMenu.x, y: controller.contextMenu.y }}
          width={220}
          onClose={() => controller.setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}
