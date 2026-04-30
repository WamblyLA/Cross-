import type { CloudProject, WorkspaceSource } from "../../features/cloud/cloudTypes";

type EmptyStateContent = {
  title: string;
  description: string;
};

type WorkWindowEmptyStateContext = {
  source: WorkspaceSource;
  isAuthenticated: boolean;
  activeCloudProject: CloudProject | null;
  rootPath: string | null;
};

export function getWorkWindowEmptyStateContent({
  source,
  isAuthenticated,
  activeCloudProject,
  rootPath,
}: WorkWindowEmptyStateContext): EmptyStateContent | null {
  if (source === "cloud") {
    if (!isAuthenticated) {
      return {
        title: "Облако доступно после входа",
        description:
          "Войдите в аккаунт, чтобы открывать облачные проекты, редактировать файлы и сохранять изменения",
      };
    }

    if (!activeCloudProject) {
      return {
        title: "Выберите облачный проект",
        description:
          "Откройте проект в облачном проводнике слева или создайте новый. После этого список файлов появится",
      };
    }

    return {
      title: "Выберите файл облачного проекта",
      description:
        "Выберите файл в облачном проводнике или создайте новый файл внутри проекта",
    };
  }

  if (!rootPath) {
    return {
      title: "Откройте локальную папку",
      description: "Откройте проект через меню Файл или сочетанием Ctrl+O",
    };
  }

  return null;
}
