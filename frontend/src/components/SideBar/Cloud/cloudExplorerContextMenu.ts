import type { MenuSection } from "../../../ui/FloatingMenu";
import { createCloudSelectionEntry } from "../../../features/cloud/cloudSelection";
import type { useCloudExplorerCreateRename } from "./useCloudExplorerCreateRename";
import type { useCloudExplorerState } from "./useCloudExplorerState";
import {
  pruneNestedCloudSelection,
} from "./cloudExplorerSelection";

type CloudExplorerState = ReturnType<typeof useCloudExplorerState>;
type CloudExplorerCreateRename = ReturnType<typeof useCloudExplorerCreateRename>;

export function buildCloudExplorerContextMenuSections(
  state: CloudExplorerState,
  createRename: CloudExplorerCreateRename,
): MenuSection[] {
  const { contextMenu } = state;

  if (!contextMenu) {
    return [];
  }

  if (contextMenu.kind === "root") {
    return [
      {
        id: "cloud-root-actions",
        items: [
          { id: "cloud-root-new-project", label: "Новый проект", onSelect: createRename.beginProjectCreate },
          { id: "cloud-root-refresh", label: "Обновить", onSelect: state.handleRefresh },
        ],
      },
    ];
  }

  if (contextMenu.kind === "project") {
    const { project } = contextMenu;

    return [
      {
        id: "cloud-project-main",
        items: [
          {
            id: "cloud-project-open",
            label: state.activeProjectId === project.id ? "Свернуть или раскрыть" : "Открыть",
            onSelect: () => state.handleProjectClick(project.id),
          },
          {
            id: "cloud-project-new-file",
            label: "Новый файл",
            onSelect: () => createRename.beginFileCreate(project.id, null),
          },
          {
            id: "cloud-project-new-folder",
            label: "Новая папка",
            onSelect: () => createRename.beginFolderCreate(project.id, null),
          },
        ],
      },
      {
        id: "cloud-project-actions",
        items: [
          {
            id: "cloud-project-rename",
            label: "Переименовать",
            onSelect: () => createRename.beginProjectRename(project.id, project.name),
          },
          {
            id: "cloud-project-delete",
            label: "Удалить",
            onSelect: () => createRename.beginProjectDelete(project.id, project.name),
          },
        ],
      },
    ];
  }

  if (contextMenu.kind === "folder") {
    const { projectId, folder } = contextMenu;
    const folderSelectionItem = createCloudSelectionEntry({
      itemType: "folder",
      projectId,
      folderId: folder.id,
      parentId: folder.parentId,
      name: folder.name,
    });
    const useCurrentSelection =
      state.selectedItemCount > 1 && state.selectedItemKeySet.has(folderSelectionItem.key);

    return [
      {
        id: "cloud-folder-create",
        items: [
          {
            id: "cloud-folder-new-file",
            label: "Новый файл",
            onSelect: () => createRename.beginFileCreate(projectId, folder.id),
          },
          {
            id: "cloud-folder-new-folder",
            label: "Новая папка",
            onSelect: () => createRename.beginFolderCreate(projectId, folder.id),
          },
        ],
      },
      {
        id: "cloud-folder-actions",
        items: [
          {
            id: "cloud-folder-rename",
            label: "Переименовать",
            disabled: useCurrentSelection,
            onSelect: () =>
              createRename.beginFolderRename(
                projectId,
                folder.id,
                folder.parentId,
                folder.name,
              ),
          },
          {
            id: "cloud-folder-delete",
            label: "Удалить",
            onSelect: () =>
              useCurrentSelection
                ? createRename.beginSelectionDelete(
                    pruneNestedCloudSelection(
                      state.selectedMovableItems,
                      state.activeProjectTree ?? {
                        projectId,
                        folders: [],
                        files: [],
                      },
                    ),
                  )
                : createRename.beginFolderDelete(
                    projectId,
                    folder.id,
                    folder.name,
                  ),
          },
        ],
      },
    ];
  }

  const { projectId, file } = contextMenu;
  const fileSelectionKey = createCloudSelectionEntry({
    itemType: "file",
    projectId,
    fileId: file.id,
    folderId: file.folderId ?? null,
    name: file.name,
  }).key;

  return [
    {
      id: "cloud-file-actions",
      items: [
        {
          id: "cloud-file-open",
          label: "Открыть",
          onSelect: () => state.handleOpenFile(projectId, file.id),
        },
        {
          id: "cloud-file-rename",
          label: "Переименовать",
          disabled: state.selectedItemCount > 1 && state.selectedItemKeySet.has(fileSelectionKey),
          onSelect: () =>
            createRename.beginFileRename(
              projectId,
              file.id,
              file.folderId,
              file.name,
            ),
        },
        {
          id: "cloud-file-delete",
          label: "Удалить",
          onSelect: () =>
            state.selectedItemCount > 1 && state.selectedItemKeySet.has(fileSelectionKey)
              ? createRename.beginSelectionDelete(
                  pruneNestedCloudSelection(
                    state.selectedMovableItems,
                    state.activeProjectTree ?? {
                      projectId,
                      folders: [],
                      files: [],
                    },
                  ),
                )
              : createRename.beginFileDelete(
                  projectId,
                  file.id,
                  file.name,
                ),
        },
      ],
    },
  ];
}
