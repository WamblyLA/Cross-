import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { selectCloudActiveProject } from "../../features/cloud/cloudSelectors";
import { useAppSelector } from "../../store/hooks";

type ProjectMembersDialogContextValue = {
  isOpen: boolean;
  projectId: string | null;
  openProjectMembers: (projectId?: string | null) => void;
  closeProjectMembers: () => void;
};

const ProjectMembersDialogContext = createContext<ProjectMembersDialogContextValue | null>(null);

export function ProjectMembersDialogProvider({ children }: PropsWithChildren) {
  const activeProject = useAppSelector(selectCloudActiveProject);
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const openProjectMembers = useCallback(
    (requestedProjectId?: string | null) => {
      setProjectId(requestedProjectId ?? activeProject?.id ?? null);
      setIsOpen(true);
    },
    [activeProject?.id],
  );

  const closeProjectMembers = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      projectId: projectId ?? activeProject?.id ?? null,
      openProjectMembers,
      closeProjectMembers,
    }),
    [activeProject?.id, closeProjectMembers, isOpen, openProjectMembers, projectId],
  );

  return (
    <ProjectMembersDialogContext.Provider value={value}>
      {children}
    </ProjectMembersDialogContext.Provider>
  );
}

export function useProjectMembersDialog() {
  const context = useContext(ProjectMembersDialogContext);

  if (!context) {
    throw new Error("useProjectMembersDialog должен использоваться внутри ProjectMembersDialogProvider");
  }

  return context;
}
