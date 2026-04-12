import type { FileKind } from "../../types/files";
import type { ProjectAccessRole } from "../../types/projects";

export function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
}

export function getFileKind(fileName: string): FileKind {
  const extension = getFileExtension(fileName);

  if (extension === "md") {
    return "markdown";
  }

  if (extension === "ipynb") {
    return "notebook";
  }

  return "text";
}

export function formatRoleLabel(role: ProjectAccessRole) {
  switch (role) {
    case "owner":
      return "Владелец";
    case "editor":
      return "Редактор";
    case "viewer":
      return "Наблюдатель";
    default:
      return "Доступ";
  }
}
