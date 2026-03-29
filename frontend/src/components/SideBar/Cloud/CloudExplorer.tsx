import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiCloud,
  FiFileText,
  FiFolder,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import {
  clearFileActionError,
  clearFolderActionError,
  clearProjectActionError,
  clearProjectsError,
  selectCloudItem,
} from "../../../features/cloud/cloudSlice";
import {
  selectCloudActiveProjectId,
  selectCloudFilesError,
  selectCloudFilesStatus,
  selectCloudFileActionError,
  selectCloudFolderActionError,
  selectCloudProjects,
  selectCloudProjectsError,
  selectCloudProjectsStatus,
  selectCloudProjectActionError,
  selectCloudSelectedFileId,
  selectCloudSelectedFolderId,
  selectCloudSelectedItemType,
  selectCloudSelectedProjectId,
  selectCloudTreeForProject,
} from "../../../features/cloud/cloudSelectors";
import type {
  CloudFileSummary,
  CloudFolderTreeNode,
  CloudProject,
  CloudProjectTree,
} from "../../../features/cloud/cloudTypes";
import { clearExplorerIntent } from "../../../features/workspace/workspaceSlice";
import { normalizeApiError } from "../../../lib/api/errorNormalization";
import { useWorkspaceActions } from "../../../hooks/useWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import FloatingMenu, { type MenuSection } from "../../../ui/FloatingMenu";
import CloudAuthPrompt from "./CloudAuthPrompt";
import CloudInlineInput from "./CloudInlineInput";

type DraftState =
  | {
      kind: "project";
      mode: "create" | "rename";
      projectId?: string;
      value: string;
    }
  | {
      kind: "folder";
      mode: "create" | "rename";
      projectId: string;
      parentId: string | null;
      folderId?: string;
      value: string;
    }
  | {
      kind: "file";
      mode: "create" | "rename";
      projectId: string;
      folderId: string | null;
      fileId?: string;
      value: string;
    };

type DeleteTarget =
  | { kind: "project"; projectId: string; name: string }
  | { kind: "folder"; projectId: string; folderId: string; name: string }
  | { kind: "file"; projectId: string; fileId: string; name: string };

type ContextMenuState =
  | { kind: "root"; x: number; y: number }
  | { kind: "project"; x: number; y: number; project: CloudProject }
  | { kind: "folder"; x: number; y: number; projectId: string; folder: CloudFolderTreeNode }
  | { kind: "file"; x: number; y: number; projectId: string; file: CloudFileSummary };

type DragState =
  | {
      kind: "file";
      projectId: string;
      fileId: string;
      folderId: string | null;
      name: string;
    }
  | {
      kind: "folder";
      projectId: string;
      folderId: string;
      parentId: string | null;
      name: string;
    };

type DropTarget =
  | { kind: "project"; projectId: string }
  | { kind: "folder"; projectId: string; folderId: string };

function filterTree(tree: CloudProjectTree, query: string): CloudProjectTree {
  if (!query) {
    return tree;
  }

  const loweredQuery = query.toLowerCase();

  const filterFolders = (folders: CloudFolderTreeNode[]): CloudFolderTreeNode[] =>
    folders.flatMap((folder) => {
      const nextFolders = filterFolders(folder.folders);
      const nextFiles = folder.files.filter((file) => file.name.toLowerCase().includes(loweredQuery));
      const isMatch = folder.name.toLowerCase().includes(loweredQuery);

      if (!isMatch && nextFolders.length === 0 && nextFiles.length === 0) {
        return [];
      }

      return [
        {
          ...folder,
          folders: nextFolders,
          files: nextFiles,
        },
      ];
    });

  return {
    ...tree,
    folders: filterFolders(tree.folders),
    files: tree.files.filter((file) => file.name.toLowerCase().includes(loweredQuery)),
  };
}

function findFolderNode(folders: CloudFolderTreeNode[], folderId: string): CloudFolderTreeNode | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder;
    }

    const nested = findFolderNode(folder.folders, folderId);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function isAuthError(error: { status?: number | null } | null | undefined) {
  return error?.status === 401 || error?.status === 403;
}

function getCloudDropTargetKey(target: DropTarget | null) {
  if (!target) {
    return null;
  }

  return target.kind === "project"
    ? `project:${target.projectId}`
    : `folder:${target.projectId}:${target.folderId}`;
}

function folderContainsDescendant(folder: CloudFolderTreeNode, targetFolderId: string): boolean {
  if (folder.id === targetFolderId) {
    return true;
  }

  return folder.folders.some((childFolder) => folderContainsDescendant(childFolder, targetFolderId));
}

export default function CloudExplorer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const searchQuery = useAppSelector((state) => state.workspace.searchQuery.trim());
  const explorerIntent = useAppSelector((state) => state.workspace.explorerIntent);
  const projects = useAppSelector(selectCloudProjects);
  const projectsStatus = useAppSelector(selectCloudProjectsStatus);
  const projectsError = useAppSelector(selectCloudProjectsError);
  const activeProjectId = useAppSelector(selectCloudActiveProjectId);
  const activeProjectTree = useAppSelector((state) => selectCloudTreeForProject(state, activeProjectId));
  const activeProjectFilesStatus = useAppSelector((state) =>
    selectCloudFilesStatus(state, activeProjectId),
  );
  const activeProjectFilesError = useAppSelector((state) =>
    selectCloudFilesError(state, activeProjectId),
  );
  const treeByProjectId = useAppSelector((state) => state.cloud.treeByProjectId);
  const selectedProjectId = useAppSelector(selectCloudSelectedProjectId);
  const selectedFolderId = useAppSelector(selectCloudSelectedFolderId);
  const selectedFileId = useAppSelector(selectCloudSelectedFileId);
  const selectedItemType = useAppSelector(selectCloudSelectedItemType);
  const projectActionError = useAppSelector(selectCloudProjectActionError);
  const folderActionError = useAppSelector(selectCloudFolderActionError);
  const fileActionError = useAppSelector(selectCloudFileActionError);
  const {
    refreshCloudProjects,
    openCloudProject,
    openCloudFile,
    createCloudProject,
    renameCloudProject,
    deleteCloudProject,
    createCloudFolder,
    renameCloudFolder,
    deleteCloudFolder,
    createCloudFile,
    renameCloudFile,
    deleteCloudFile,
    moveCloudFile,
    moveCloudFolder,
  } = useWorkspaceActions();

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [invalidDropTargetKey, setInvalidDropTargetKey] = useState<string | null>(null);
  const hoverOpenTimerRef = useRef<number | null>(null);
  const isDragDropEnabled = !searchQuery && !draft && !deleteTarget;

  useEffect(() => {
    if (activeProjectId) {
      setIsProjectExpanded(true);
    }
  }, [activeProjectId]);

  const filteredTree = useMemo(
    () => (activeProjectTree ? filterTree(activeProjectTree, searchQuery) : null),
    [activeProjectTree, searchQuery],
  );

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
      return projects;
    }

    const loweredQuery = searchQuery.toLowerCase();

    return projects.filter((project) => {
      if (project.name.toLowerCase().includes(loweredQuery)) {
        return true;
      }

      if (project.id !== activeProjectId || !filteredTree) {
        return false;
      }

      return filteredTree.files.length > 0 || filteredTree.folders.length > 0;
    });
  }, [activeProjectId, filteredTree, projects, searchQuery]);

  const aggregatedError =
    localError ??
    folderActionError?.message ??
    fileActionError?.message ??
    projectActionError?.message ??
    activeProjectFilesError?.message ??
    projectsError?.message ??
    null;

  const authRecoveryRequired =
    isAuthenticated &&
    [projectsError, activeProjectFilesError, projectActionError, folderActionError, fileActionError].some(isAuthError);

  const resetMessages = useCallback(() => {
    setLocalError(null);
    dispatch(clearProjectsError());
    dispatch(clearProjectActionError());
    dispatch(clearFolderActionError());
    dispatch(clearFileActionError());
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    resetMessages();

    try {
      await refreshCloudProjects();
    } catch (error) {
      setLocalError(normalizeApiError(error).message);
    }
  }, [refreshCloudProjects, resetMessages]);

  const handleProjectClick = useCallback(
    async (projectId: string) => {
      resetMessages();

      if (activeProjectId === projectId) {
        dispatch(
          selectCloudItem({
            projectId,
            folderId: null,
            fileId: null,
            itemType: "project",
          }),
        );
        setIsProjectExpanded((currentValue) => !currentValue);
        return;
      }

      try {
        await openCloudProject(projectId);
      } catch (error) {
        setLocalError(normalizeApiError(error).message);
      }
    },
    [activeProjectId, dispatch, openCloudProject, resetMessages],
  );

  const handleOpenFile = useCallback(
    async (projectId: string, fileId: string) => {
      resetMessages();

      try {
        dispatch(
          selectCloudItem({
            projectId,
            folderId: null,
            fileId,
            itemType: "file",
          }),
        );
        await openCloudFile(projectId, fileId);
      } catch (error) {
        setLocalError(normalizeApiError(error).message);
      }
    },
    [dispatch, openCloudFile, resetMessages],
  );

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((currentIds) =>
      currentIds.includes(folderId)
        ? currentIds.filter((id) => id !== folderId)
        : [...currentIds, folderId],
    );
  }, []);

  const clearHoverOpenTimer = useCallback(() => {
    if (hoverOpenTimerRef.current !== null) {
      window.clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
  }, []);

  const clearDragDropState = useCallback(() => {
    clearHoverOpenTimer();
    setDragState(null);
    setDropTarget(null);
    setInvalidDropTargetKey(null);
  }, [clearHoverOpenTimer]);

  useEffect(() => clearHoverOpenTimer, [clearHoverOpenTimer]);

  useEffect(() => {
    if (!isDragDropEnabled && dragState) {
      clearDragDropState();
    }
  }, [clearDragDropState, dragState, isDragDropEnabled]);

  const beginProjectCreate = useCallback(() => {
    resetMessages();
    setDeleteTarget(null);
    setDraft({ kind: "project", mode: "create", value: "" });
  }, [resetMessages]);

  const beginProjectRename = useCallback(
    (projectId: string, name: string) => {
      resetMessages();
      setDeleteTarget(null);
      setDraft({ kind: "project", mode: "rename", projectId, value: name });
      dispatch(selectCloudItem({ projectId, folderId: null, fileId: null, itemType: "project" }));
    },
    [dispatch, resetMessages],
  );

  const beginProjectDelete = useCallback(
    (projectId: string, name: string) => {
      resetMessages();
      setDraft(null);
      setDeleteTarget({ kind: "project", projectId, name });
      dispatch(selectCloudItem({ projectId, folderId: null, fileId: null, itemType: "project" }));
    },
    [dispatch, resetMessages],
  );

  const beginFolderCreate = useCallback(
    async (projectIdOverride?: string, parentId: string | null = null) => {
      resetMessages();

      const projectId = projectIdOverride ?? activeProjectId;

      if (!projectId) {
        setLocalError("Сначала откройте облачный проект, чтобы создать папку.");
        return;
      }

      if (projectId !== activeProjectId) {
        try {
          await openCloudProject(projectId);
        } catch (error) {
          setLocalError(normalizeApiError(error).message);
          return;
        }
      }

      setDeleteTarget(null);
      setDraft({
        kind: "folder",
        mode: "create",
        projectId,
        parentId,
        value: "",
      });

      if (parentId) {
        setExpandedFolderIds((currentIds) =>
          currentIds.includes(parentId) ? currentIds : [...currentIds, parentId],
        );
      }
    },
    [activeProjectId, openCloudProject, resetMessages],
  );

  const beginFolderRename = useCallback(
    (projectId: string, folderId: string, parentId: string | null, name: string) => {
      resetMessages();
      setDeleteTarget(null);
      setDraft({
        kind: "folder",
        mode: "rename",
        projectId,
        parentId,
        folderId,
        value: name,
      });
      dispatch(selectCloudItem({ projectId, folderId, fileId: null, itemType: "folder" }));
    },
    [dispatch, resetMessages],
  );

  const beginFolderDelete = useCallback(
    (projectId: string, folderId: string, name: string) => {
      resetMessages();
      setDraft(null);
      setDeleteTarget({ kind: "folder", projectId, folderId, name });
      dispatch(selectCloudItem({ projectId, folderId, fileId: null, itemType: "folder" }));
    },
    [dispatch, resetMessages],
  );

  const beginFileCreate = useCallback(
    async (projectIdOverride?: string, folderId: string | null = null) => {
      resetMessages();

      const projectId = projectIdOverride ?? activeProjectId;

      if (!projectId) {
        setLocalError("Сначала откройте облачный проект, чтобы создать файл.");
        return;
      }

      if (projectId !== activeProjectId) {
        try {
          await openCloudProject(projectId);
        } catch (error) {
          setLocalError(normalizeApiError(error).message);
          return;
        }
      }

      setDeleteTarget(null);
      setDraft({
        kind: "file",
        mode: "create",
        projectId,
        folderId,
        value: "",
      });

      if (folderId) {
        setExpandedFolderIds((currentIds) =>
          currentIds.includes(folderId) ? currentIds : [...currentIds, folderId],
        );
      }
    },
    [activeProjectId, openCloudProject, resetMessages],
  );

  const beginFileRename = useCallback(
    (projectId: string, fileId: string, folderId: string | null, name: string) => {
      resetMessages();
      setDeleteTarget(null);
      setDraft({
        kind: "file",
        mode: "rename",
        projectId,
        folderId,
        fileId,
        value: name,
      });
      dispatch(selectCloudItem({ projectId, folderId, fileId, itemType: "file" }));
    },
    [dispatch, resetMessages],
  );

  const beginFileDelete = useCallback(
    (projectId: string, fileId: string, name: string) => {
      resetMessages();
      setDraft(null);
      setDeleteTarget({ kind: "file", projectId, fileId, name });
      dispatch(selectCloudItem({ projectId, folderId: null, fileId, itemType: "file" }));
    },
    [dispatch, resetMessages],
  );

  const canDropIntoTarget = useCallback(
    (target: DropTarget) => {
      if (!dragState) {
        return false;
      }

      const targetFolderId = target.kind === "folder" ? target.folderId : null;

      if (dragState.kind === "file") {
        return !(
          dragState.projectId === target.projectId &&
          (dragState.folderId ?? null) === targetFolderId
        );
      }

      if (
        dragState.projectId === target.projectId &&
        (dragState.parentId ?? null) === targetFolderId
      ) {
        return false;
      }

      if (target.kind === "folder" && dragState.projectId === target.projectId) {
        const sourceTree = treeByProjectId[dragState.projectId];
        const sourceFolder = sourceTree
          ? findFolderNode(sourceTree.folders, dragState.folderId)
          : null;

        if (!sourceFolder) {
          return false;
        }

        if (folderContainsDescendant(sourceFolder, target.folderId)) {
          return false;
        }
      }

      return true;
    },
    [dragState, treeByProjectId],
  );

  const scheduleTargetReveal = useCallback(
    (target: DropTarget) => {
      clearHoverOpenTimer();

      hoverOpenTimerRef.current = window.setTimeout(() => {
        if (target.kind === "project") {
          if (target.projectId !== activeProjectId) {
            void openCloudProject(target.projectId);
            return;
          }

          setIsProjectExpanded(true);
          return;
        }

        if (target.projectId !== activeProjectId) {
          void openCloudProject(target.projectId);
        }

        setIsProjectExpanded(true);
        setExpandedFolderIds((currentIds) =>
          currentIds.includes(target.folderId) ? currentIds : [...currentIds, target.folderId],
        );
      }, 450);
    },
    [activeProjectId, clearHoverOpenTimer, openCloudProject],
  );

  const performCloudDrop = useCallback(
    async (target: DropTarget) => {
      if (!dragState || !canDropIntoTarget(target)) {
        clearDragDropState();
        return;
      }

      resetMessages();
      setContextMenu(null);

      try {
        if (dragState.kind === "file") {
          await moveCloudFile(
            dragState.projectId,
            dragState.fileId,
            target.projectId,
            target.kind === "folder" ? target.folderId : null,
          );
        } else {
          await moveCloudFolder(
            dragState.projectId,
            dragState.folderId,
            target.projectId,
            target.kind === "folder" ? target.folderId : null,
          );
        }

        setIsProjectExpanded(true);

        if (target.kind === "folder") {
          setExpandedFolderIds((currentIds) =>
            currentIds.includes(target.folderId) ? currentIds : [...currentIds, target.folderId],
          );
        }
      } catch (error) {
        setLocalError(normalizeApiError(error).message);
      } finally {
        clearDragDropState();
      }
    },
    [
      canDropIntoTarget,
      clearDragDropState,
      dragState,
      moveCloudFile,
      moveCloudFolder,
      resetMessages,
    ],
  );

  const handleFolderDragStart = useCallback(
    (projectId: string, folder: CloudFolderTreeNode, event: DragEvent<HTMLElement>) => {
      if (!isDragDropEnabled) {
        event.preventDefault();
        return;
      }

      dispatch(selectCloudItem({ projectId, folderId: folder.id, fileId: null, itemType: "folder" }));
      setContextMenu(null);
      setDragState({
        kind: "folder",
        projectId,
        folderId: folder.id,
        parentId: folder.parentId,
        name: folder.name,
      });
      setDropTarget(null);
      setInvalidDropTargetKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `folder:${folder.id}`);
    },
    [dispatch, isDragDropEnabled],
  );

  const handleFileDragStart = useCallback(
    (projectId: string, file: CloudFileSummary, event: DragEvent<HTMLElement>) => {
      if (!isDragDropEnabled) {
        event.preventDefault();
        return;
      }

      dispatch(
        selectCloudItem({
          projectId,
          folderId: file.folderId,
          fileId: file.id,
          itemType: "file",
        }),
      );
      setContextMenu(null);
      setDragState({
        kind: "file",
        projectId,
        fileId: file.id,
        folderId: file.folderId,
        name: file.name,
      });
      setDropTarget(null);
      setInvalidDropTargetKey(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `file:${file.id}`);
    },
    [dispatch, isDragDropEnabled],
  );

  const handleCloudDragEnd = useCallback(() => {
    clearDragDropState();
  }, [clearDragDropState]);

  const handleProjectDragOver = useCallback(
    (projectId: string, event: DragEvent<HTMLElement>) => {
      if (!dragState || !isDragDropEnabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const target: DropTarget = { kind: "project", projectId };
      const validDrop = canDropIntoTarget(target);

      setDropTarget(validDrop ? target : null);
      setInvalidDropTargetKey(validDrop ? null : getCloudDropTargetKey(target));
      event.dataTransfer.dropEffect = validDrop ? "move" : "none";

      if (validDrop) {
        scheduleTargetReveal(target);
      } else {
        clearHoverOpenTimer();
      }
    },
    [
      canDropIntoTarget,
      clearHoverOpenTimer,
      dragState,
      isDragDropEnabled,
      scheduleTargetReveal,
    ],
  );

  const handleFolderDragOver = useCallback(
    (projectId: string, folderId: string, event: DragEvent<HTMLElement>) => {
      if (!dragState || !isDragDropEnabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const target: DropTarget = { kind: "folder", projectId, folderId };
      const validDrop = canDropIntoTarget(target);

      setDropTarget(validDrop ? target : null);
      setInvalidDropTargetKey(validDrop ? null : getCloudDropTargetKey(target));
      event.dataTransfer.dropEffect = validDrop ? "move" : "none";

      if (validDrop) {
        scheduleTargetReveal(target);
      } else {
        clearHoverOpenTimer();
      }
    },
    [
      canDropIntoTarget,
      clearHoverOpenTimer,
      dragState,
      isDragDropEnabled,
      scheduleTargetReveal,
    ],
  );

  const handleCloudDragLeave = useCallback(
    (target: DropTarget, event: DragEvent<HTMLElement>) => {
      event.stopPropagation();

      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }

      const targetKey = getCloudDropTargetKey(target);

      clearHoverOpenTimer();
      setDropTarget((currentTarget) =>
        getCloudDropTargetKey(currentTarget) === targetKey ? null : currentTarget,
      );
      setInvalidDropTargetKey((currentKey) => (currentKey === targetKey ? null : currentKey));
    },
    [clearHoverOpenTimer],
  );

  const handleProjectDrop = useCallback(
    (projectId: string, event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void performCloudDrop({ kind: "project", projectId });
    },
    [performCloudDrop],
  );

  const handleFolderDrop = useCallback(
    (projectId: string, folderId: string, event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void performCloudDrop({ kind: "folder", projectId, folderId });
    },
    [performCloudDrop],
  );

  const handleDraftSubmit = useCallback(async () => {
    if (!draft) {
      return;
    }

    const nextName = draft.value.trim();

    if (!nextName) {
      setDraft(null);
      return;
    }

    resetMessages();

    try {
      if (draft.kind === "project" && draft.mode === "create") {
        await createCloudProject(nextName);
        setDraft(null);
        return;
      }

      if (draft.kind === "project" && draft.mode === "rename" && draft.projectId) {
        await renameCloudProject(draft.projectId, nextName);
        setDraft(null);
        return;
      }

      if (draft.kind === "folder" && draft.mode === "create") {
        const folder = await createCloudFolder(draft.projectId, nextName, draft.parentId);
        setExpandedFolderIds((currentIds) =>
          currentIds.includes(folder.id) ? currentIds : [...currentIds, folder.id],
        );
        setDraft(null);
        return;
      }

      if (draft.kind === "folder" && draft.mode === "rename" && draft.folderId) {
        await renameCloudFolder(draft.projectId, draft.folderId, nextName);
        setDraft(null);
        return;
      }

      if (draft.kind === "file" && draft.mode === "create") {
        await createCloudFile(draft.projectId, nextName, "", draft.folderId);
        setDraft(null);
        return;
      }

      if (draft.kind === "file" && draft.mode === "rename" && draft.fileId) {
        await renameCloudFile(draft.projectId, draft.fileId, nextName);
        setDraft(null);
      }
    } catch (error) {
      setLocalError(normalizeApiError(error).message);
    }
  }, [
    createCloudFile,
    createCloudFolder,
    createCloudProject,
    draft,
    renameCloudFile,
    renameCloudFolder,
    renameCloudProject,
    resetMessages,
  ]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    resetMessages();

    try {
      if (deleteTarget.kind === "project") {
        await deleteCloudProject(deleteTarget.projectId);
      } else if (deleteTarget.kind === "folder") {
        await deleteCloudFolder(deleteTarget.projectId, deleteTarget.folderId);
      } else {
        await deleteCloudFile(deleteTarget.projectId, deleteTarget.fileId);
      }

      setDeleteTarget(null);
    } catch (error) {
      setLocalError(normalizeApiError(error).message);
    }
  }, [deleteCloudFile, deleteCloudFolder, deleteCloudProject, deleteTarget, resetMessages]);

  useEffect(() => {
    if (!explorerIntent) {
      return;
    }

    const executeIntent = async () => {
      if (!isAuthenticated) {
        if (explorerIntent.type === "refresh") {
          return;
        }

        setLocalError("Войдите в аккаунт, чтобы работать с облачными проектами.");
        return;
      }

      switch (explorerIntent.type) {
        case "create-project":
          beginProjectCreate();
          return;
        case "create-file":
          await beginFileCreate();
          return;
        case "create-folder":
          await beginFolderCreate();
          return;
        case "rename":
          if (selectedItemType === "project" && selectedProjectId) {
            const project = projects.find((item) => item.id === selectedProjectId);
            if (project) {
              beginProjectRename(project.id, project.name);
            }
          } else if (selectedItemType === "folder" && activeProjectId && selectedFolderId && activeProjectTree) {
            const folder = findFolderNode(activeProjectTree.folders, selectedFolderId);
            if (folder) {
              beginFolderRename(activeProjectId, folder.id, folder.parentId, folder.name);
            }
          } else if (selectedItemType === "file" && activeProjectId && selectedFileId) {
            const selectedFile =
              activeProjectTree &&
              (() => {
                const stack = [...activeProjectTree.files];
                const visitFolders = (folders: CloudFolderTreeNode[]) => {
                  folders.forEach((folder) => {
                    stack.push(...folder.files);
                    visitFolders(folder.folders);
                  });
                };
                visitFolders(activeProjectTree.folders);
                return stack.find((item) => item.id === selectedFileId) ?? null;
              })();
            if (selectedFile) {
              beginFileRename(activeProjectId, selectedFile.id, selectedFile.folderId, selectedFile.name);
            }
          }
          return;
        case "delete":
          if (selectedItemType === "project" && selectedProjectId) {
            const project = projects.find((item) => item.id === selectedProjectId);
            if (project) {
              beginProjectDelete(project.id, project.name);
            }
          } else if (selectedItemType === "folder" && activeProjectId && selectedFolderId && activeProjectTree) {
            const folder = findFolderNode(activeProjectTree.folders, selectedFolderId);
            if (folder) {
              beginFolderDelete(activeProjectId, folder.id, folder.name);
            }
          } else if (selectedItemType === "file" && activeProjectId && selectedFileId && activeProjectTree) {
            let targetFile: CloudFileSummary | null = null;
            const visitFolders = (folders: CloudFolderTreeNode[]) => {
              folders.forEach((folder) => {
                if (!targetFile) {
                  targetFile = folder.files.find((item) => item.id === selectedFileId) ?? null;
                }
                visitFolders(folder.folders);
              });
            };
            targetFile = activeProjectTree.files.find((item) => item.id === selectedFileId) ?? null;
            if (!targetFile) {
              visitFolders(activeProjectTree.folders);
            }
            if (targetFile) {
              beginFileDelete(activeProjectId, targetFile.id, targetFile.name);
            }
          }
          return;
        case "refresh":
          await handleRefresh();
          return;
        case "collapse-all":
          setIsProjectExpanded(false);
          setExpandedFolderIds([]);
          return;
        default:
          return;
      }
    };

    void executeIntent().finally(() => {
      dispatch(clearExplorerIntent(explorerIntent.id));
    });
  }, [
    activeProjectId,
    activeProjectTree,
    beginFileCreate,
    beginFileDelete,
    beginFileRename,
    beginFolderCreate,
    beginFolderDelete,
    beginFolderRename,
    beginProjectCreate,
    beginProjectDelete,
    beginProjectRename,
    dispatch,
    explorerIntent,
    handleRefresh,
    isAuthenticated,
    projects,
    selectedFileId,
    selectedFolderId,
    selectedItemType,
    selectedProjectId,
  ]);

  const handleProjectContextMenu = useCallback(
    (project: CloudProject, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dispatch(selectCloudItem({ projectId: project.id, folderId: null, fileId: null, itemType: "project" }));
      setContextMenu({ kind: "project", project, x: event.clientX, y: event.clientY });
    },
    [dispatch],
  );

  const handleFolderContextMenu = useCallback(
    (projectId: string, folder: CloudFolderTreeNode, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dispatch(selectCloudItem({ projectId, folderId: folder.id, fileId: null, itemType: "folder" }));
      setContextMenu({ kind: "folder", projectId, folder, x: event.clientX, y: event.clientY });
    },
    [dispatch],
  );

  const handleFileContextMenu = useCallback(
    (projectId: string, file: CloudFileSummary, event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dispatch(selectCloudItem({ projectId, folderId: file.folderId, fileId: file.id, itemType: "file" }));
      setContextMenu({ kind: "file", projectId, file, x: event.clientX, y: event.clientY });
    },
    [dispatch],
  );

  const handleRootContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-cloud-node='true']")) {
      return;
    }

    event.preventDefault();
    setContextMenu({ kind: "root", x: event.clientX, y: event.clientY });
  }, []);

  const contextMenuSections = useMemo<MenuSection[]>(() => {
    if (!contextMenu) {
      return [];
    }

    if (contextMenu.kind === "root") {
      return [
        {
          id: "cloud-root-actions",
          items: [
            { id: "cloud-root-new-project", label: "Новый проект", onSelect: beginProjectCreate },
            { id: "cloud-root-refresh", label: "Обновить", onSelect: handleRefresh },
          ],
        },
      ];
    }

    if (contextMenu.kind === "project") {
      return [
        {
          id: "cloud-project-main",
          items: [
            {
              id: "cloud-project-open",
              label: activeProjectId === contextMenu.project.id ? "Свернуть или раскрыть" : "Открыть",
              onSelect: () => handleProjectClick(contextMenu.project.id),
            },
            { id: "cloud-project-new-file", label: "Новый файл", onSelect: () => beginFileCreate(contextMenu.project.id, null) },
            { id: "cloud-project-new-folder", label: "Новая папка", onSelect: () => beginFolderCreate(contextMenu.project.id, null) },
          ],
        },
        {
          id: "cloud-project-actions",
          items: [
            { id: "cloud-project-rename", label: "Переименовать", onSelect: () => beginProjectRename(contextMenu.project.id, contextMenu.project.name) },
            { id: "cloud-project-delete", label: "Удалить", onSelect: () => beginProjectDelete(contextMenu.project.id, contextMenu.project.name) },
          ],
        },
      ];
    }

    if (contextMenu.kind === "folder") {
      return [
        {
          id: "cloud-folder-create",
          items: [
            { id: "cloud-folder-new-file", label: "Новый файл", onSelect: () => beginFileCreate(contextMenu.projectId, contextMenu.folder.id) },
            { id: "cloud-folder-new-folder", label: "Новая папка", onSelect: () => beginFolderCreate(contextMenu.projectId, contextMenu.folder.id) },
          ],
        },
        {
          id: "cloud-folder-actions",
          items: [
            { id: "cloud-folder-rename", label: "Переименовать", onSelect: () => beginFolderRename(contextMenu.projectId, contextMenu.folder.id, contextMenu.folder.parentId, contextMenu.folder.name) },
            { id: "cloud-folder-delete", label: "Удалить", onSelect: () => beginFolderDelete(contextMenu.projectId, contextMenu.folder.id, contextMenu.folder.name) },
          ],
        },
      ];
    }

    return [
      {
        id: "cloud-file-actions",
        items: [
          { id: "cloud-file-open", label: "Открыть", onSelect: () => handleOpenFile(contextMenu.projectId, contextMenu.file.id) },
          { id: "cloud-file-rename", label: "Переименовать", onSelect: () => beginFileRename(contextMenu.projectId, contextMenu.file.id, contextMenu.file.folderId, contextMenu.file.name) },
          { id: "cloud-file-delete", label: "Удалить", onSelect: () => beginFileDelete(contextMenu.projectId, contextMenu.file.id, contextMenu.file.name) },
        ],
      },
    ];
  }, [
    activeProjectId,
    beginFileCreate,
    beginFileDelete,
    beginFileRename,
    beginFolderCreate,
    beginFolderDelete,
    beginFolderRename,
    beginProjectCreate,
    beginProjectDelete,
    beginProjectRename,
    contextMenu,
    handleOpenFile,
    handleProjectClick,
    handleRefresh,
  ]);

  const renderFolder = (projectId: string, folder: CloudFolderTreeNode, depth = 1) => {
    const isExpanded = expandedFolderIds.includes(folder.id);
    const isSelected = selectedItemType === "folder" && selectedFolderId === folder.id;
    const isRenaming =
      draft?.kind === "folder" && draft.mode === "rename" && draft.folderId === folder.id;
    const showCreateFolder = draft?.kind === "folder" && draft.mode === "create" && draft.parentId === folder.id;
    const showCreateFile = draft?.kind === "file" && draft.mode === "create" && draft.folderId === folder.id;
    const dropKey = `folder:${projectId}:${folder.id}`;
    const isFolderDragging =
      dragState?.kind === "folder" &&
      dragState.projectId === projectId &&
      dragState.folderId === folder.id;
    const isFolderDropTarget = getCloudDropTargetKey(dropTarget) === dropKey;
    const isFolderInvalidDropTarget = invalidDropTargetKey === dropKey;

    return (
      <div key={folder.id}>
        {isRenaming ? (
          <CloudInlineInput
            icon={<FiFolder className="h-4 w-4" />}
            value={draft.value}
            placeholder="Новое имя папки"
            depth={depth}
            onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
            onSubmit={() => {
              void handleDraftSubmit();
            }}
            onCancel={() => setDraft(null)}
          />
        ) : (
          <div
            data-cloud-node="true"
            className="px-2 py-1.5"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onContextMenu={(event) => handleFolderContextMenu(projectId, folder, event)}
            onDragOver={(event) => handleFolderDragOver(projectId, folder.id, event)}
            onDragLeave={(event) =>
              handleCloudDragLeave({ kind: "folder", projectId, folderId: folder.id }, event)
            }
            onDrop={(event) => handleFolderDrop(projectId, folder.id, event)}
          >
            <button
              type="button"
              className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
                isSelected ? "border border-default bg-active text-primary" : ""
              } ${isFolderDropTarget ? "ring-1 ring-default bg-hover" : ""} ${
                isFolderDragging ? "opacity-60" : ""
              }`}
              style={
                isFolderInvalidDropTarget
                  ? { boxShadow: "inset 0 0 0 1px var(--error)" }
                  : undefined
              }
              onClick={() => {
                dispatch(selectCloudItem({ projectId, folderId: folder.id, fileId: null, itemType: "folder" }));
                toggleFolder(folder.id);
              }}
              draggable={isDragDropEnabled}
              onDragStart={(event) => handleFolderDragStart(projectId, folder, event)}
              onDragEnd={handleCloudDragEnd}
            >
              <span className="flex w-4 shrink-0 justify-center text-secondary">
                {isExpanded ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
              </span>
              <span className="flex w-4 shrink-0 justify-center text-secondary">
                <FiFolder className="h-4 w-4" />
              </span>
              <span className="block min-w-0 flex-1 truncate text-sm">{folder.name}</span>
            </button>
          </div>
        )}

        {isExpanded ? (
          <div>
            {showCreateFolder ? (
              <CloudInlineInput
                icon={<FiFolder className="h-4 w-4" />}
                value={draft.value}
                placeholder="Имя новой папки"
                depth={depth + 1}
                onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                onSubmit={() => {
                  void handleDraftSubmit();
                }}
                onCancel={() => setDraft(null)}
              />
            ) : null}
            {showCreateFile ? (
              <CloudInlineInput
                icon={<FiFileText className="h-4 w-4" />}
                value={draft.value}
                placeholder="Имя нового файла"
                depth={depth + 1}
                onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                onSubmit={() => {
                  void handleDraftSubmit();
                }}
                onCancel={() => setDraft(null)}
              />
            ) : null}
            {folder.folders.map((childFolder) => renderFolder(projectId, childFolder, depth + 1))}
            {folder.files.map((file) => {
              const isSelectedFile = selectedItemType === "file" && selectedFileId === file.id;
              const isRenamingFile =
                draft?.kind === "file" && draft.mode === "rename" && draft.fileId === file.id;
              const isFileDragging =
                dragState?.kind === "file" &&
                dragState.projectId === projectId &&
                dragState.fileId === file.id;

              return isRenamingFile ? (
                <CloudInlineInput
                  key={file.id}
                  icon={<FiFileText className="h-4 w-4" />}
                  value={draft.value}
                  placeholder="Новое имя файла"
                  depth={depth + 1}
                  onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                  onSubmit={() => {
                    void handleDraftSubmit();
                  }}
                  onCancel={() => setDraft(null)}
                />
              ) : (
                <div
                  key={file.id}
                  data-cloud-node="true"
                  className="px-2 py-1.5"
                  style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
                  onContextMenu={(event) => handleFileContextMenu(projectId, file, event)}
                >
                  <button
                    type="button"
                    className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
                      isSelectedFile ? "border border-default bg-active text-primary" : ""
                    } ${isFileDragging ? "opacity-60" : ""}`}
                    onClick={() => {
                      void handleOpenFile(projectId, file.id);
                    }}
                    draggable={isDragDropEnabled}
                    onDragStart={(event) => handleFileDragStart(projectId, file, event)}
                    onDragEnd={handleCloudDragEnd}
                  >
                    <span className="flex w-4 shrink-0 justify-center text-secondary">
                      <FiFileText className="h-4 w-4" />
                    </span>
                    <span className="block min-w-0 flex-1 truncate text-sm">{file.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  if (!isAuthenticated) {
    return <CloudAuthPrompt />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {authRecoveryRequired ? (
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
      {aggregatedError ? (
        <div className="border-b border-default px-3 py-2 text-sm text-error">{aggregatedError}</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2 text-sm text-secondary" onContextMenu={handleRootContextMenu}>
        {draft?.kind === "project" && draft.mode === "create" ? (
          <CloudInlineInput
            icon={<FiCloud className="h-4 w-4" />}
            value={draft.value}
            placeholder="Название нового проекта"
            onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
            onSubmit={() => {
              void handleDraftSubmit();
            }}
            onCancel={() => setDraft(null)}
          />
        ) : null}
        {projectsStatus === "loading" && projects.length === 0 ? <div className="px-3 py-3 text-sm text-secondary">Загружаем облачные проекты...</div> : null}
        {projectsStatus !== "loading" && filteredProjects.length === 0 && searchQuery ? (
          <div className="px-3 py-3 text-sm text-muted">По запросу "{searchQuery}" ничего не найдено среди облачных проектов.</div>
        ) : null}
        {projectsStatus !== "loading" && projects.length === 0 && !searchQuery ? (
          <div className="rounded-[14px] border border-dashed border-default bg-panel px-4 py-5 text-sm text-secondary">
            Пока нет ни одного облачного проекта. Создайте первый проект и начните работать с файлами прямо в IDE.
          </div>
        ) : null}
        {filteredProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const isSelected = selectedItemType === "project" && selectedProjectId === project.id;
          const isRenamingProject =
            draft?.kind === "project" && draft.mode === "rename" && draft.projectId === project.id;
          const projectTree = project.id === activeProjectId ? filteredTree : null;
          const projectDropKey = `project:${project.id}`;
          const isProjectDropTarget = getCloudDropTargetKey(dropTarget) === projectDropKey;
          const isProjectInvalidDropTarget = invalidDropTargetKey === projectDropKey;

          return (
            <div key={project.id} className="select-none">
              <div
                data-cloud-node="true"
                className="px-2 py-1.5"
                onContextMenu={(event) => handleProjectContextMenu(project, event)}
                onDragOver={(event) => handleProjectDragOver(project.id, event)}
                onDragLeave={(event) =>
                  handleCloudDragLeave({ kind: "project", projectId: project.id }, event)
                }
                onDrop={(event) => handleProjectDrop(project.id, event)}
              >
                {isRenamingProject ? (
                  <CloudInlineInput
                    icon={<FiCloud className="h-4 w-4" />}
                    value={draft.value}
                    placeholder="Новое имя проекта"
                    onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                    onSubmit={() => {
                      void handleDraftSubmit();
                    }}
                    onCancel={() => setDraft(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
                      isSelected ? "border border-default bg-active text-primary" : ""
                    } ${isProjectDropTarget ? "ring-1 ring-default bg-hover" : ""}`}
                    style={
                      isProjectInvalidDropTarget
                        ? { boxShadow: "inset 0 0 0 1px var(--error)" }
                        : undefined
                    }
                    onClick={() => {
                      void handleProjectClick(project.id);
                    }}
                  >
                    <span className="flex w-4 shrink-0 justify-center text-secondary">
                      {isActive && isProjectExpanded ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
                    </span>
                    <span className="flex w-4 shrink-0 justify-center text-secondary">
                      <FiCloud className="h-4 w-4" />
                    </span>
                    <span className="block min-w-0 flex-1 truncate text-sm">{project.name}</span>
                  </button>
                )}
              </div>
              {isActive && isProjectExpanded ? (
                <div>
                  {draft?.kind === "folder" && draft.mode === "create" && draft.projectId === project.id && draft.parentId === null ? (
                    <CloudInlineInput
                      icon={<FiFolder className="h-4 w-4" />}
                      value={draft.value}
                      placeholder="Имя новой папки"
                      depth={1}
                      onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                      onSubmit={() => {
                        void handleDraftSubmit();
                      }}
                      onCancel={() => setDraft(null)}
                    />
                  ) : null}
                  {draft?.kind === "file" && draft.mode === "create" && draft.projectId === project.id && draft.folderId === null ? (
                    <CloudInlineInput
                      icon={<FiFileText className="h-4 w-4" />}
                      value={draft.value}
                      placeholder="Имя нового файла"
                      depth={1}
                      onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                      onSubmit={() => {
                        void handleDraftSubmit();
                      }}
                      onCancel={() => setDraft(null)}
                    />
                  ) : null}
                  {activeProjectFilesStatus === "loading" ? <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>Загружаем структуру проекта...</div> : null}
                  {activeProjectFilesStatus !== "loading" && projectTree && projectTree.files.length === 0 && projectTree.folders.length === 0 && !searchQuery ? (
                    <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>Проект пока пуст. Создайте первую папку или файл.</div>
                  ) : null}
                  {projectTree?.folders.map((folder) => renderFolder(project.id, folder, 1))}
                  {projectTree?.files.map((file) => {
                    const isSelectedFile = selectedItemType === "file" && selectedFileId === file.id;
                    const isRenamingFile = draft?.kind === "file" && draft.mode === "rename" && draft.fileId === file.id;
                    const isFileDragging =
                      dragState?.kind === "file" &&
                      dragState.projectId === project.id &&
                      dragState.fileId === file.id;

                    return isRenamingFile ? (
                      <CloudInlineInput
                        key={file.id}
                        icon={<FiFileText className="h-4 w-4" />}
                        value={draft.value}
                        placeholder="Новое имя файла"
                        depth={1}
                        onChange={(value) => setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))}
                        onSubmit={() => {
                          void handleDraftSubmit();
                        }}
                        onCancel={() => setDraft(null)}
                      />
                    ) : (
                      <div key={file.id} data-cloud-node="true" className="px-2 py-1.5" style={{ paddingLeft: "24px" }} onContextMenu={(event) => handleFileContextMenu(project.id, file, event)}>
                        <button
                          type="button"
                          className={`ui-tree-item flex w-full min-w-0 items-center gap-2 px-2 py-1.5 text-left ${
                            isSelectedFile ? "border border-default bg-active text-primary" : ""
                          } ${isFileDragging ? "opacity-60" : ""}`}
                          onClick={() => {
                            void handleOpenFile(project.id, file.id);
                          }}
                          draggable={isDragDropEnabled}
                          onDragStart={(event) => handleFileDragStart(project.id, file, event)}
                          onDragEnd={handleCloudDragEnd}
                        >
                          <span className="flex w-4 shrink-0 justify-center text-secondary">
                            <FiFileText className="h-4 w-4" />
                          </span>
                          <span className="block min-w-0 flex-1 truncate text-sm">{file.name}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {deleteTarget ? (
        <div className="border-t border-default bg-panel px-3 py-3">
          <div className="text-sm text-primary">
            {deleteTarget.kind === "project" ? "Удалить проект" : deleteTarget.kind === "folder" ? "Удалить папку" : "Удалить файл"} "{deleteTarget.name}"?
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            {deleteTarget.kind === "project"
              ? "Все файлы и папки проекта будут удалены из облака, а связанные вкладки в IDE закроются."
              : deleteTarget.kind === "folder"
                ? "Папка будет удалена вместе со всем вложенным содержимым."
                : "Файл будет удалён из облака, а открытая вкладка закроется автоматически."}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="ui-button-secondary ui-control h-9 px-3 text-sm" onClick={() => setDeleteTarget(null)}>
              Отмена
            </button>
            <button
              type="button"
              className="ui-control h-9 rounded-[8px] border px-3 text-sm text-error hover:bg-hover"
              style={{ borderColor: "var(--error)" }}
              onClick={() => {
                void handleDeleteConfirm();
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      ) : null}
      {contextMenu ? (
        <FloatingMenu
          sections={contextMenuSections}
          position={{ type: "point", x: contextMenu.x, y: contextMenu.y }}
          width={220}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}
