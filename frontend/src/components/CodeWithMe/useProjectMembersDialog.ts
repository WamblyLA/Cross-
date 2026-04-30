import { useContext } from "react";
import { ProjectMembersDialogContext } from "./projectMembersDialogShared";

export function useProjectMembersDialog() {
  const context = useContext(ProjectMembersDialogContext);

  if (!context) {
    throw new Error("useProjectMembersDialog должен использоваться внутри ProjectMembersDialogProvider");
  }

  return context;
}
