import { FiChevronDown, FiChevronRight, FiCloud, FiFileText, FiFolder } from "react-icons/fi";
import type { CloudProject } from "../../../features/cloud/cloudTypes";
import CloudFileRow from "./CloudFileRow";
import CloudFolderNode from "./CloudFolderNode";
import CloudInlineInput from "./CloudInlineInput";
import type { useCloudExplorerController } from "./useCloudExplorerController";
import { getCloudDropTargetKey } from "./cloudExplorerUtils";

type CloudExplorerController = ReturnType<typeof useCloudExplorerController>;

type CloudProjectSectionProps = {
  controller: CloudExplorerController;
  project: CloudProject;
};

export default function CloudProjectSection({
  controller,
  project,
}: CloudProjectSectionProps) {
  const roleLabel =
    project.accessRole === "owner"
      ? "Владелец"
      : project.accessRole === "editor"
        ? "Редактор"
        : "Наблюдатель";
  const draft = controller.draft;
  const isActive = project.id === controller.activeProjectId;
  const isSelected = controller.selectedItemType === "project" && controller.selectedProjectId === project.id;
  const isRenamingProject =
    draft?.kind === "project" && draft.mode === "rename" && draft.projectId === project.id;
  const projectTree = project.id === controller.activeProjectId ? controller.filteredTree : null;
  const projectDropKey = `project:${project.id}`;
  const isProjectDropTarget = getCloudDropTargetKey(controller.dropTarget) === projectDropKey;
  const isProjectInvalidDropTarget = controller.invalidDropTargetKey === projectDropKey;

  return (
    <div key={project.id} className="select-none">
      <div
        data-cloud-node="true"
        className="px-2 py-1.5"
        onContextMenu={(event) => controller.handleProjectContextMenu(project, event)}
        onDragOver={(event) => controller.handleProjectDragOver(project.id, event)}
        onDragLeave={(event) => controller.handleCloudDragLeave({ kind: "project", projectId: project.id }, event)}
        onDrop={(event) => controller.handleProjectDrop(project.id, event)}
      >
        {isRenamingProject ? (
          <CloudInlineInput
            icon={<FiCloud className="h-4 w-4" />}
            value={draft.value}
            placeholder="Новое имя проекта"
            onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
            onSubmit={() => {
              void controller.handleDraftSubmit();
            }}
            onCancel={() => controller.setDraft(null)}
          />
        ) : (
          <button
            type="button"
            className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
              isSelected ? "border border-default bg-active text-primary" : ""
            } ${isProjectDropTarget ? "ring-1 ring-default bg-hover" : ""}`}
            style={isProjectInvalidDropTarget ? { boxShadow: "inset 0 0 0 1px var(--error)" } : undefined}
            onClick={() => {
              void controller.handleProjectClick(project.id);
            }}
          >
            <span className="flex w-4 shrink-0 justify-center text-secondary">
              {isActive && controller.isProjectExpanded ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
            </span>
            <span className="flex w-4 shrink-0 justify-center text-secondary">
              <FiCloud className="h-4 w-4" />
            </span>
            <span className="block min-w-0 flex-1 truncate text-sm">{project.name}</span>
            <span className="rounded-full border border-default px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted">
              {roleLabel}
            </span>
          </button>
        )}
      </div>

      {isActive && controller.isProjectExpanded ? (
        <div>
          {controller.draft?.kind === "folder" && controller.draft.mode === "create" && controller.draft.projectId === project.id && controller.draft.parentId === null ? (
            <CloudInlineInput
              icon={<FiFolder className="h-4 w-4" />}
              value={controller.draft.value}
              placeholder="Имя новой папки"
              depth={1}
              onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
              onSubmit={() => {
                void controller.handleDraftSubmit();
              }}
              onCancel={() => controller.setDraft(null)}
            />
          ) : null}

          {controller.draft?.kind === "file" && controller.draft.mode === "create" && controller.draft.projectId === project.id && controller.draft.folderId === null ? (
            <CloudInlineInput
              icon={<FiFileText className="h-4 w-4" />}
              value={controller.draft.value}
              placeholder="Имя нового файла"
              depth={1}
              onChange={(value) => controller.setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
              onSubmit={() => {
                void controller.handleDraftSubmit();
              }}
              onCancel={() => controller.setDraft(null)}
            />
          ) : null}

          {controller.activeProjectFilesStatus === "loading" ? (
            <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>
              Загружаем структуру проекта...
            </div>
          ) : null}

          {controller.activeProjectFilesStatus !== "loading" && projectTree && projectTree.files.length === 0 && projectTree.folders.length === 0 && !controller.searchQuery ? (
            <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>
              Проект пока пуст. Создайте первую папку или файл.
            </div>
          ) : null}

          {projectTree?.folders.map((folder) => (
            <CloudFolderNode
              key={folder.id}
              controller={controller}
              projectId={project.id}
              folder={folder}
              depth={1}
            />
          ))}

          {projectTree?.files.map((file) => (
            <CloudFileRow
              key={file.id}
              controller={controller}
              projectId={project.id}
              file={file}
              depth={1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
