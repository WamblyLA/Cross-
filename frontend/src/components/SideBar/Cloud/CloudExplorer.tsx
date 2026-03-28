import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiCloud,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { selectIsAuthenticated } from "../../../features/auth/authSelectors";
import {
  clearFileActionError,
  clearProjectActionError,
  clearProjectsError,
  selectCloudItem,
} from "../../../features/cloud/cloudSlice";
import {
  selectCloudActiveProjectId,
  selectCloudFilesError,
  selectCloudFilesForProject,
  selectCloudFilesStatus,
  selectCloudFileActionError,
  selectCloudProjects,
  selectCloudProjectsError,
  selectCloudProjectsStatus,
  selectCloudProjectActionError,
  selectCloudSelectedFileId,
  selectCloudSelectedItemType,
  selectCloudSelectedProjectId,
} from "../../../features/cloud/cloudSelectors";
import { clearExplorerIntent } from "../../../features/workspace/workspaceSlice";
import { normalizeApiError } from "../../../lib/api/errorNormalization";
import { useWorkspaceActions } from "../../../hooks/useWorkspaceActions";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
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
      kind: "file";
      mode: "create" | "rename";
      projectId: string;
      fileId?: string;
      value: string;
    };

type DeleteTarget =
  | {
      kind: "project";
      projectId: string;
      name: string;
    }
  | {
      kind: "file";
      projectId: string;
      fileId: string;
      name: string;
    };

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
  const activeProjectFiles = useAppSelector((state) =>
    selectCloudFilesForProject(state, activeProjectId),
  );
  const activeProjectFilesStatus = useAppSelector((state) =>
    selectCloudFilesStatus(state, activeProjectId),
  );
  const activeProjectFilesError = useAppSelector((state) =>
    selectCloudFilesError(state, activeProjectId),
  );
  const selectedProjectId = useAppSelector(selectCloudSelectedProjectId);
  const selectedFileId = useAppSelector(selectCloudSelectedFileId);
  const selectedItemType = useAppSelector(selectCloudSelectedItemType);
  const projectActionError = useAppSelector(selectCloudProjectActionError);
  const fileActionError = useAppSelector(selectCloudFileActionError);
  const {
    refreshCloudProjects,
    openCloudProject,
    openCloudFile,
    createCloudProject,
    renameCloudProject,
    deleteCloudProject,
    createCloudFile,
    renameCloudFile,
    deleteCloudFile,
  } = useWorkspaceActions();

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);

  useEffect(() => {
    if (activeProjectId) {
      setIsProjectExpanded(true);
    }
  }, [activeProjectId]);

  const filteredProjectFiles = useMemo(() => {
    if (!searchQuery) {
      return activeProjectFiles;
    }

    const loweredQuery = searchQuery.toLowerCase();
    return activeProjectFiles.filter((file) => file.name.toLowerCase().includes(loweredQuery));
  }, [activeProjectFiles, searchQuery]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
      return projects;
    }

    const loweredQuery = searchQuery.toLowerCase();

    return projects.filter((project) => {
      if (project.name.toLowerCase().includes(loweredQuery)) {
        return true;
      }

      if (project.id !== activeProjectId) {
        return false;
      }

      return filteredProjectFiles.length > 0;
    });
  }, [activeProjectId, filteredProjectFiles.length, projects, searchQuery]);

  const aggregatedError =
    localError ??
    fileActionError?.message ??
    projectActionError?.message ??
    activeProjectFilesError?.message ??
    projectsError?.message ??
    null;

  const authRecoveryRequired =
    isAuthenticated &&
    [projectsError, activeProjectFilesError, projectActionError, fileActionError].some(
      (error) => error?.status === 401 || error?.status === 403,
    );

  const resetMessages = useCallback(() => {
    setLocalError(null);
    dispatch(clearProjectsError());
    dispatch(clearProjectActionError());
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
        await openCloudFile(projectId, fileId);
      } catch (error) {
        setLocalError(normalizeApiError(error).message);
      }
    },
    [openCloudFile, resetMessages],
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

      if (draft.kind === "file" && draft.mode === "create") {
        await createCloudFile(draft.projectId, nextName);
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
    createCloudProject,
    draft,
    renameCloudFile,
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
      } else {
        await deleteCloudFile(deleteTarget.projectId, deleteTarget.fileId);
      }

      setDeleteTarget(null);
    } catch (error) {
      setLocalError(normalizeApiError(error).message);
    }
  }, [deleteCloudFile, deleteCloudProject, deleteTarget, resetMessages]);

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
        case "create-file":
          if (!activeProjectId) {
            setLocalError("Сначала откройте облачный проект, чтобы создать файл.");
            return;
          }

          setDeleteTarget(null);
          setDraft({
            kind: "file",
            mode: "create",
            projectId: activeProjectId,
            value: "",
          });
          return;
        case "create-folder":
          setLocalError("Папки в облачных проектах пока не поддерживаются.");
          return;
        case "rename":
          if (selectedItemType === "project" && selectedProjectId) {
            const project = projects.find((item) => item.id === selectedProjectId);

            if (project) {
              setDeleteTarget(null);
              setDraft({
                kind: "project",
                mode: "rename",
                projectId: project.id,
                value: project.name,
              });
            }
          } else if (selectedItemType === "file" && activeProjectId && selectedFileId) {
            const file = activeProjectFiles.find((item) => item.id === selectedFileId);

            if (file) {
              setDeleteTarget(null);
              setDraft({
                kind: "file",
                mode: "rename",
                projectId: activeProjectId,
                fileId: file.id,
                value: file.name,
              });
            }
          }
          return;
        case "delete":
          if (selectedItemType === "project" && selectedProjectId) {
            const project = projects.find((item) => item.id === selectedProjectId);

            if (project) {
              setDraft(null);
              setDeleteTarget({
                kind: "project",
                projectId: project.id,
                name: project.name,
              });
            }
          } else if (selectedItemType === "file" && activeProjectId && selectedFileId) {
            const file = activeProjectFiles.find((item) => item.id === selectedFileId);

            if (file) {
              setDraft(null);
              setDeleteTarget({
                kind: "file",
                projectId: activeProjectId,
                fileId: file.id,
                name: file.name,
              });
            }
          }
          return;
        case "refresh":
          await handleRefresh();
          return;
        case "collapse-all":
          setIsProjectExpanded(false);
          return;
        default:
          return;
      }
    };

    void executeIntent().finally(() => {
      dispatch(clearExplorerIntent(explorerIntent.id));
    });
  }, [
    activeProjectFiles,
    activeProjectId,
    dispatch,
    explorerIntent,
    handleRefresh,
    isAuthenticated,
    projects,
    selectedFileId,
    selectedItemType,
    selectedProjectId,
  ]);

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

      <div className="border-b border-default px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Облако</div>
            <div className="truncate text-sm text-primary">Мои облачные проекты</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="ui-control h-8 w-8"
              title="Обновить облачные проекты"
              onClick={() => {
                void handleRefresh();
              }}
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="ui-control h-8 px-3 text-sm"
              onClick={() => {
                setDeleteTarget(null);
                setDraft({
                  kind: "project",
                  mode: "create",
                  value: "",
                });
              }}
            >
              <FiPlus className="h-4 w-4" />
              <span>Новый проект</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2 text-sm text-secondary">
        {draft?.kind === "project" && draft.mode === "create" ? (
          <CloudInlineInput
            icon={<FiCloud className="h-4 w-4" />}
            value={draft.value}
            placeholder="Название нового проекта"
            onChange={(value) =>
              setDraft((currentDraft) => (currentDraft ? { ...currentDraft, value } : currentDraft))
            }
            onSubmit={() => {
              void handleDraftSubmit();
            }}
            onCancel={() => setDraft(null)}
          />
        ) : null}

        {projectsStatus === "loading" && projects.length === 0 ? (
          <div className="px-3 py-3 text-sm text-secondary">Загружаем облачные проекты...</div>
        ) : null}

        {projectsStatus !== "loading" && filteredProjects.length === 0 && searchQuery ? (
          <div className="px-3 py-3 text-sm text-muted">
            По запросу "{searchQuery}" ничего не найдено среди облачных проектов.
          </div>
        ) : null}

        {projectsStatus !== "loading" && projects.length === 0 && !searchQuery ? (
          <div className="rounded-[14px] border border-dashed border-default bg-panel px-4 py-5 text-sm text-secondary">
            Пока нет ни одного облачного проекта. Создайте первый проект и начните работать с
            файлами прямо в IDE.
          </div>
        ) : null}

        {filteredProjects.map((project) => {
          const isActive = project.id === activeProjectId;
          const isSelected = selectedItemType === "project" && selectedProjectId === project.id;
          const isRenamingProject =
            draft?.kind === "project" &&
            draft.mode === "rename" &&
            draft.projectId === project.id;

          return (
            <div key={project.id} className="select-none">
              <div
                className={`group flex items-center gap-2 px-2 py-1.5 ${
                  isSelected ? "ui-tree-item border border-default bg-active text-primary" : "ui-tree-item"
                }`}
              >
                {isRenamingProject ? (
                  <div className="min-w-0 flex-1">
                    <CloudInlineInput
                      icon={<FiCloud className="h-4 w-4" />}
                      value={draft.value}
                      placeholder="Новое имя проекта"
                      onChange={(value) =>
                        setDraft((currentDraft) =>
                          currentDraft ? { ...currentDraft, value } : currentDraft,
                        )
                      }
                      onSubmit={() => {
                        void handleDraftSubmit();
                      }}
                      onCancel={() => setDraft(null)}
                    />
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => {
                        void handleProjectClick(project.id);
                      }}
                    >
                      <span className="flex w-4 shrink-0 justify-center text-secondary">
                        {isActive && isProjectExpanded ? (
                          <FiChevronDown className="h-4 w-4" />
                        ) : (
                          <FiChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <span className="flex w-4 shrink-0 justify-center text-secondary">
                        <FiFolder className="h-4 w-4" />
                      </span>
                      <span className="block min-w-0 flex-1 truncate text-sm">{project.name}</span>
                      <span className="rounded-full border border-default px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">
                        Облако
                      </span>
                    </button>

                    <div
                      className={`ml-auto flex items-center gap-1 transition-opacity ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        className="ui-control h-6 w-6"
                        title="Переименовать проект"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(null);
                          setDraft({
                            kind: "project",
                            mode: "rename",
                            projectId: project.id,
                            value: project.name,
                          });
                          dispatch(
                            selectCloudItem({
                              projectId: project.id,
                              fileId: null,
                              itemType: "project",
                            }),
                          );
                        }}
                      >
                        <FiEdit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="ui-control h-6 w-6"
                        title="Удалить проект"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDraft(null);
                          setDeleteTarget({
                            kind: "project",
                            projectId: project.id,
                            name: project.name,
                          });
                          dispatch(
                            selectCloudItem({
                              projectId: project.id,
                              fileId: null,
                              itemType: "project",
                            }),
                          );
                        }}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {isActive && isProjectExpanded ? (
                <div>
                  {draft?.kind === "file" &&
                  draft.mode === "create" &&
                  draft.projectId === project.id ? (
                    <CloudInlineInput
                      icon={<FiFileText className="h-4 w-4" />}
                      value={draft.value}
                      placeholder="Имя нового файла"
                      depth={1}
                      onChange={(value) =>
                        setDraft((currentDraft) =>
                          currentDraft ? { ...currentDraft, value } : currentDraft,
                        )
                      }
                      onSubmit={() => {
                        void handleDraftSubmit();
                      }}
                      onCancel={() => setDraft(null)}
                    />
                  ) : null}

                  {activeProjectFilesStatus === "loading" ? (
                    <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>
                      Загружаем файлы проекта...
                    </div>
                  ) : null}

                  {activeProjectFilesStatus !== "loading" &&
                  filteredProjectFiles.length === 0 &&
                  searchQuery ? (
                    <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>
                      В этом проекте нет файлов по запросу "{searchQuery}".
                    </div>
                  ) : null}

                  {activeProjectFilesStatus !== "loading" &&
                  activeProjectFiles.length === 0 &&
                  !searchQuery ? (
                    <div className="px-3 py-2 text-xs text-muted" style={{ paddingLeft: "24px" }}>
                      Проект пока пуст. Создайте первый облачный файл.
                    </div>
                  ) : null}

                  {filteredProjectFiles.map((file) => {
                    const isSelectedFile =
                      selectedItemType === "file" && selectedFileId === file.id;
                    const isRenamingFile =
                      draft?.kind === "file" &&
                      draft.mode === "rename" &&
                      draft.fileId === file.id;

                    return (
                      <div key={file.id}>
                        {isRenamingFile ? (
                          <CloudInlineInput
                            icon={<FiFileText className="h-4 w-4" />}
                            value={draft.value}
                            placeholder="Новое имя файла"
                            depth={1}
                            onChange={(value) =>
                              setDraft((currentDraft) =>
                                currentDraft ? { ...currentDraft, value } : currentDraft,
                              )
                            }
                            onSubmit={() => {
                              void handleDraftSubmit();
                            }}
                            onCancel={() => setDraft(null)}
                          />
                        ) : (
                          <div
                            className={`group flex items-center gap-2 px-2 py-1.5 ${
                              isSelectedFile
                                ? "ui-tree-item border border-default bg-active text-primary"
                                : "ui-tree-item"
                            }`}
                            style={{ paddingLeft: "24px" }}
                          >
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                              onClick={() => {
                                dispatch(
                                  selectCloudItem({
                                    projectId: project.id,
                                    fileId: file.id,
                                    itemType: "file",
                                  }),
                                );
                                void handleOpenFile(project.id, file.id);
                              }}
                            >
                              <span className="flex w-4 shrink-0 justify-center text-secondary">
                                <FiFileText className="h-4 w-4" />
                              </span>
                              <span className="block min-w-0 flex-1 truncate text-sm">
                                {file.name}
                              </span>
                            </button>

                            <div
                              className={`ml-auto flex items-center gap-1 transition-opacity ${
                                isSelectedFile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              }`}
                            >
                              <button
                                type="button"
                                className="ui-control h-6 w-6"
                                title="Переименовать файл"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget(null);
                                  setDraft({
                                    kind: "file",
                                    mode: "rename",
                                    projectId: project.id,
                                    fileId: file.id,
                                    value: file.name,
                                  });
                                  dispatch(
                                    selectCloudItem({
                                      projectId: project.id,
                                      fileId: file.id,
                                      itemType: "file",
                                    }),
                                  );
                                }}
                              >
                                <FiEdit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                className="ui-control h-6 w-6"
                                title="Удалить файл"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDraft(null);
                                  setDeleteTarget({
                                    kind: "file",
                                    projectId: project.id,
                                    fileId: file.id,
                                    name: file.name,
                                  });
                                  dispatch(
                                    selectCloudItem({
                                      projectId: project.id,
                                      fileId: file.id,
                                      itemType: "file",
                                    }),
                                  );
                                }}
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
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
            {deleteTarget.kind === "project" ? "Удалить проект" : "Удалить файл"} "{deleteTarget.name}
            "?
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            {deleteTarget.kind === "project"
              ? "Все файлы проекта будут удалены из облака, а связанные вкладки в IDE закроются."
              : "Файл будет удалён из облака, а открытая вкладка закроется автоматически."}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="ui-button-secondary ui-control h-9 px-3 text-sm"
              onClick={() => setDeleteTarget(null)}
            >
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
    </div>
  );
}
