import { createContext } from "react";

export type ProjectMembersDialogContextValue = {
  isOpen: boolean;
  projectId: string | null;
  openProjectMembers: (projectId?: string | null) => void;
  closeProjectMembers: () => void;
};

export const ProjectMembersDialogContext =
  createContext<ProjectMembersDialogContextValue | null>(null);
